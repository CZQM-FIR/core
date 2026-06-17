import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	getAvailabilityWindowEndsAt,
	getNextIncompleteTask,
	isRangeWithinAvailability,
	isTrainingSessionNext,
	toNextTaskSummary,
	validateSessionTimeRange
} from '$lib/trainingSessionAvailability';
import { getCourseTaskProgress } from '$lib/courseTaskProgress';
import { trainingSessionAvailability, trainingSessions } from '@czqm/db/schema';
import {
	Course,
	TrainingSession,
	User,
	userCanGraduateVectorStudents,
	userCanScheduleTrainingSessionType
} from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { authorizeVectorInstructorAccess } from './auth';
import { getStudentCourseView } from './student.remote';

const CourseId = type(/^[0-9a-z]{5}$/);
const WaitlistId = type('number.integer >= 0');

export const getInstructorCourses = query(async () => {
	await authorizeVectorInstructorAccess();

	return db.query.courses.findMany({
		with: {
			waitlist: {
				with: {
					enrolled: {
						where: { hiddenAt: { isNull: true } },
						columns: { cid: true }
					}
				}
			}
		},
		orderBy: (courses, { asc }) => [asc(courses.name)]
	});
});

export const getInstructorCourse = query(CourseId, async (id) => {
	await authorizeVectorInstructorAccess();

	const course = await db.query.courses.findFirst({
		where: { id },
		with: {
			waitlist: {
				with: {
					students: {
						orderBy: (students) => [students.position],
						with: {
							user: true
						}
					}
				}
			}
		}
	});

	if (!course) throw error(404, 'Course not found');

	return course;
});

export const getInstructorEnrolledEntries = query(WaitlistId, async (waitlistId) => {
	await authorizeVectorInstructorAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId }
	});
	if (!waitlist) throw error(404, 'Waitlist not found');

	return db.query.enrolledUsers.findMany({
		where: { waitlistId, hiddenAt: { isNull: true } },
		with: { user: true }
	});
});

export const getInstructorCompletedEntries = query(WaitlistId, async (waitlistId) => {
	await authorizeVectorInstructorAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId }
	});
	if (!waitlist) throw error(404, 'Waitlist not found');

	return db.query.completedUsers.findMany({
		where: { waitlistId },
		with: { user: true },
		orderBy: (completedUsers, { desc }) => [desc(completedUsers.completedAt)]
	});
});

export const getInstructorStudentView = query(
	type({
		courseId: CourseId,
		cid: 'number.integer > 0'
	}),
	async ({ courseId, cid }) => {
		const actioner = await authorizeVectorInstructorAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const student = await User.fromCid(db, cid);
		if (!student) throw error(404, 'Student not found');

		const waitlistId = course.waitlist.id;

		const [waiting, enrolled, completed] = await Promise.all([
			db.query.waitingUsers.findFirst({ where: { waitlistId, cid } }),
			db.query.enrolledUsers.findFirst({ where: { waitlistId, cid } }),
			db.query.completedUsers.findFirst({ where: { waitlistId, cid } })
		]);

		const status = completed
			? 'completed'
			: enrolled
				? 'enrolled'
				: waiting
					? 'waitlisted'
					: 'none';

		const tasks = await getCourseTaskProgress(course, cid);
		const allTasksComplete = tasks.length === 0 || tasks.every((task) => task.isComplete);
		const nextTask = toNextTaskSummary(getNextIncompleteTask(tasks));
		const trainingSessionIsNext = status === 'enrolled' && isTrainingSessionNext(tasks);

		let canViewSessionAvailability = false;
		let canScheduleSession = false;
		let activeSession = null;

		if (trainingSessionIsNext && nextTask) {
			const [availabilityRow, sessionRow] = await Promise.all([
				db
					.select({ id: trainingSessionAvailability.id })
					.from(trainingSessionAvailability)
					.where(
						and(
							eq(trainingSessionAvailability.cid, cid),
							eq(trainingSessionAvailability.courseId, courseId),
							eq(trainingSessionAvailability.taskId, nextTask.taskId)
						)
					)
					.limit(1),
				TrainingSession.fetchActiveForTask(db, {
					studentCid: cid,
					courseId,
					taskId: nextTask.taskId
				})
			]);

			canViewSessionAvailability = availabilityRow != null;
			activeSession = sessionRow ? TrainingSession.toSummary(sessionRow) : null;

			const courseTask = course.tasks.find((task) => task.taskId === nextTask.taskId);
			const sessionType =
				courseTask?.taskType === 'training_session' ? courseTask.taskValue1 : null;

			canScheduleSession =
				status === 'enrolled' &&
				canViewSessionAvailability &&
				activeSession == null &&
				userCanScheduleTrainingSessionType(actioner, sessionType);
		}

		return {
			course: {
				id: course.id,
				name: course.name,
				description: course.description
			},
			student: {
				cid: student.cid,
				name_full: student.name_full,
				rating: student.rating.short
			},
			status,
			waitingSince: waiting?.waitingSince ?? null,
			enrolledAt: enrolled?.enrolledAt ?? null,
			completedAt: completed?.completedAt ?? null,
			tasks,
			canGraduateStudent: userCanGraduateVectorStudents(actioner),
			allTasksComplete,
			nextTask,
			canViewSessionAvailability,
			canScheduleSession,
			activeSession,
			canCancelActiveSession: activeSession != null && actioner.cid === activeSession.scheduledByCid
		};
	}
);

const InstructorSessionAvailabilityOptions = type({
	courseId: CourseId,
	cid: 'number.integer > 0',
	taskId: 'number.integer >= 0'
});

export const getInstructorStudentSessionAvailability = query(
	InstructorSessionAvailabilityOptions,
	async ({ courseId, cid, taskId }) => {
		await authorizeVectorInstructorAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const student = await User.fromCid(db, cid);
		if (!student) throw error(404, 'Student not found');

		const tasks = await getCourseTaskProgress(course, cid);
		const next = getNextIncompleteTask(tasks);
		if (!next || next.taskType !== 'training_session' || next.taskId !== taskId) {
			throw error(400, 'Session availability is not available for this task');
		}

		const rows = await db
			.select()
			.from(trainingSessionAvailability)
			.where(
				and(
					eq(trainingSessionAvailability.cid, cid),
					eq(trainingSessionAvailability.courseId, courseId),
					eq(trainingSessionAvailability.taskId, taskId)
				)
			)
			.orderBy(trainingSessionAvailability.startsAt);

		return {
			slots: rows.map((row) => ({
				id: row.id,
				startsAt: row.startsAt,
				endsAt: row.endsAt
			})),
			windowEndsAt: getAvailabilityWindowEndsAt()
		};
	}
);

const ScheduleTrainingSessionOptions = type({
	courseId: CourseId,
	studentCid: 'number.integer > 0',
	taskId: 'number.integer >= 0',
	startsAt: 'string',
	endsAt: 'string',
	'trainingNote?': 'string'
});

export const scheduleTrainingSession = command(
	ScheduleTrainingSessionOptions,
	async ({ courseId, studentCid, taskId, startsAt, endsAt, trainingNote }) => {
		const actioner = await authorizeVectorInstructorAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const student = await User.fromCid(db, studentCid);
		if (!student) throw error(404, 'Student not found');

		const enrolled = await db.query.enrolledUsers.findFirst({
			where: {
				waitlistId: course.waitlist.id,
				cid: studentCid,
				hiddenAt: { isNull: true }
			}
		});
		if (!enrolled) throw error(400, 'Student is not enrolled in this course');

		const tasks = await getCourseTaskProgress(course, studentCid);
		const next = getNextIncompleteTask(tasks);
		if (!next || next.taskType !== 'training_session' || next.taskId !== taskId) {
			throw error(400, 'Session scheduling is not available for this task');
		}

		const courseTask = course.tasks.find((entry) => entry.taskId === taskId);
		if (!courseTask || courseTask.taskType !== 'training_session') {
			throw error(400, 'Session scheduling is not available for this task');
		}
		if (!userCanScheduleTrainingSessionType(actioner, courseTask.taskValue1)) {
			throw error(403, 'Forbidden');
		}

		const activeSession = await TrainingSession.fetchActiveForTask(db, {
			studentCid,
			courseId,
			taskId
		});
		if (activeSession) {
			throw error(400, 'An active training session already exists for this task');
		}

		const windowStart = new Date();
		const windowEndsAt = getAvailabilityWindowEndsAt(windowStart);
		const startsAtDate = new Date(startsAt);
		const endsAtDate = new Date(endsAt);

		try {
			validateSessionTimeRange(startsAtDate, endsAtDate, windowStart, windowEndsAt);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Invalid session time range');
		}

		const availabilityRows = await db
			.select()
			.from(trainingSessionAvailability)
			.where(
				and(
					eq(trainingSessionAvailability.cid, studentCid),
					eq(trainingSessionAvailability.courseId, courseId),
					eq(trainingSessionAvailability.taskId, taskId)
				)
			);

		const outsideAvailability = !isRangeWithinAvailability(
			{ startsAt: startsAtDate, endsAt: endsAtDate },
			availabilityRows.map((row) => ({ startsAt: row.startsAt, endsAt: row.endsAt }))
		);

		try {
			await TrainingSession.createPending(db, {
				studentCid,
				courseId,
				taskId,
				scheduledByCid: actioner.cid,
				startsAt: startsAtDate,
				endsAt: endsAtDate,
				trainingNote: trainingNote ?? null
			});
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to schedule training session');
		}

		getInstructorStudentView({ courseId, cid: studentCid }).refresh();
		getStudentCourseView(courseId).refresh();

		return { outsideAvailability };
	}
);

const CancelTrainingSessionOptions = type({
	courseId: CourseId,
	studentCid: 'number.integer > 0',
	taskId: 'number.integer >= 0',
	sessionId: 'number.integer > 0'
});

export const cancelTrainingSession = command(
	CancelTrainingSessionOptions,
	async ({ courseId, studentCid, taskId, sessionId }) => {
		const actioner = await authorizeVectorInstructorAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const student = await User.fromCid(db, studentCid);
		if (!student) throw error(404, 'Student not found');

		const tasks = await getCourseTaskProgress(course, studentCid);
		const next = getNextIncompleteTask(tasks);
		if (!next || next.taskType !== 'training_session' || next.taskId !== taskId) {
			throw error(400, 'Session availability is not available for this task');
		}

		const [session] = await db
			.select()
			.from(trainingSessions)
			.where(eq(trainingSessions.id, sessionId))
			.limit(1);

		if (
			!session ||
			session.studentCid !== studentCid ||
			session.courseId !== courseId ||
			session.taskId !== taskId
		) {
			throw error(404, 'Training session not found');
		}

		if (session.scheduledByCid !== actioner.cid) {
			throw error(403, 'Only the person who scheduled this session can cancel it');
		}

		try {
			await TrainingSession.cancel(db, sessionId, actioner.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to cancel training session');
		}

		getInstructorStudentView({ courseId, cid: studentCid }).refresh();
		getStudentCourseView(courseId).refresh();
	}
);

const StudentTaskOptions = type({
	courseId: CourseId,
	cid: 'number.integer > 0',
	taskId: 'number.integer >= 0'
});

async function getInstructorCourseTask(courseId: string, taskId: number) {
	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const task = course.tasks.find((entry) => entry.taskId === taskId);
	if (!task) throw error(404, 'Task not found');
	if (task.isAutoCompletable() || !task.isManuallyCompletable()) {
		throw error(400, 'This task cannot be marked complete manually');
	}

	return task;
}

export const completeStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		await authorizeVectorInstructorAccess();

		const task = await getInstructorCourseTask(courseId, taskId);
		await task.complete(cid);

		getInstructorStudentView({ courseId, cid }).refresh();
	}
);

export const uncompleteStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		await authorizeVectorInstructorAccess();

		const task = await getInstructorCourseTask(courseId, taskId);
		const completion = await task.getCompletion(cid);
		if (!completion) throw error(404, 'Task completion not found');

		await completion.uncomplete();

		getInstructorStudentView({ courseId, cid }).refresh();
	}
);

export const graduateStudentFromCourse = command(
	type({
		courseId: CourseId,
		cid: 'number.integer > 0'
	}),
	async ({ courseId, cid }) => {
		const actioner = await authorizeVectorInstructorAccess();
		if (!userCanGraduateVectorStudents(actioner)) {
			throw error(403, 'Forbidden');
		}

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const enrolled = await db.query.enrolledUsers.findFirst({
			where: {
				waitlistId: course.waitlist.id,
				cid,
				hiddenAt: { isNull: true }
			}
		});
		if (!enrolled) throw error(400, 'Student is not enrolled in this course');

		if (!(await course.isComplete(cid))) {
			throw error(400, 'Not all course tasks are complete');
		}

		await course.graduateUser(cid);

		getInstructorStudentView({ courseId, cid }).refresh();
	}
);
