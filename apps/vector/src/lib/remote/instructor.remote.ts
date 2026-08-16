import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	getAvailabilityWindowEndsAt,
	getNextIncompleteTask,
	isRangeWithinAvailability,
	isTrainingSessionNext,
	mergeAvailabilitySlots,
	toNextTaskSummary,
	validateSessionTimeRange
} from '$lib/trainingSessionAvailability';
import { getCourseTaskProgress } from '$lib/courseTaskProgress';
import {
	courseTaskCompletions,
	trainingSessionAvailability,
	trainingSessions
} from '@czqm/db/schema';
import {
	ACTIVE_STATUSES,
	Course,
	describeCourseTask,
	TrainingSession,
	User,
	userCanGraduateVectorStudents,
	userCanScheduleTrainingSessionType
} from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { authorizeVectorInstructorAccess } from './auth';
import { getStudentCourseView } from './student.remote';
import { getMyTrainingSessions } from './users.remote';
import { notifyTrainingSessionEmails } from '$lib/trainingSessionEmails';
import { notifyCourseEnrollmentEmail } from '$lib/courseEnrollmentEmails';

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

export const getStudentsWithSessionAvailability = query(async () => {
	const actioner = await authorizeVectorInstructorAccess();

	const now = new Date();
	const windowEndsAt = getAvailabilityWindowEndsAt(now);

	const availabilityRows = await db
		.select()
		.from(trainingSessionAvailability)
		.where(gt(trainingSessionAvailability.endsAt, now))
		.orderBy(trainingSessionAvailability.startsAt);

	if (availabilityRows.length === 0) {
		return { windowEndsAt, students: [] };
	}

	const courseIds = [...new Set(availabilityRows.map((row) => row.courseId))];
	const cids = [...new Set(availabilityRows.map((row) => row.cid))];

	const [courseRows, userRows] = await Promise.all([
		db.query.courses.findMany({
			where: { id: { in: courseIds } },
			columns: { id: true, name: true, waitlistId: true, tasks: true }
		}),
		db.query.users.findMany({
			where: { cid: { in: cids } },
			columns: { cid: true, name_full: true }
		})
	]);

	const courseById = new Map(courseRows.map((course) => [course.id, course]));
	const userByCid = new Map(userRows.map((user) => [user.cid, user]));
	const waitlistIds = [...new Set(courseRows.map((course) => course.waitlistId))];

	const [enrolledRows, completionRows, activeSessionRows] = await Promise.all([
		waitlistIds.length === 0
			? Promise.resolve([])
			: db.query.enrolledUsers.findMany({
					where: {
						cid: { in: cids },
						waitlistId: { in: waitlistIds },
						hiddenAt: { isNull: true }
					},
					columns: { cid: true, waitlistId: true }
				}),
		db
			.select({
				userId: courseTaskCompletions.userId,
				courseId: courseTaskCompletions.courseId,
				taskId: courseTaskCompletions.taskId,
				completedAt: courseTaskCompletions.completedAt
			})
			.from(courseTaskCompletions)
			.where(
				and(
					inArray(courseTaskCompletions.userId, cids),
					inArray(courseTaskCompletions.courseId, courseIds)
				)
			),
		db
			.select({
				studentCid: trainingSessions.studentCid,
				courseId: trainingSessions.courseId,
				taskId: trainingSessions.taskId
			})
			.from(trainingSessions)
			.where(
				and(
					inArray(trainingSessions.studentCid, cids),
					inArray(trainingSessions.courseId, courseIds),
					inArray(trainingSessions.status, ACTIVE_STATUSES)
				)
			)
	]);

	const enrolledKeys = new Set(enrolledRows.map((row) => `${row.cid}:${row.waitlistId}`));
	const completedTaskKeys = new Set(
		completionRows
			.filter((row) => row.completedAt != null)
			.map((row) => `${row.userId}:${row.courseId}:${row.taskId}`)
	);
	const activeSessionKeys = new Set(
		activeSessionRows.map((row) => `${row.studentCid}:${row.courseId}:${row.taskId}`)
	);

	const slotsByStudentTask = new Map<string, { startsAt: Date; endsAt: Date }[]>();
	for (const row of availabilityRows) {
		const key = `${row.cid}:${row.courseId}:${row.taskId}`;
		const slots = slotsByStudentTask.get(key) ?? [];
		slots.push({ startsAt: row.startsAt, endsAt: row.endsAt });
		slotsByStudentTask.set(key, slots);
	}

	const students: {
		cid: number;
		name: string;
		courseId: string;
		courseName: string;
		taskId: number;
		sessionDescription: string;
		sessionType: string | null;
		slots: { startsAt: Date; endsAt: Date }[];
	}[] = [];

	for (const [key, slots] of slotsByStudentTask) {
		const [cidStr, courseId, taskIdStr] = key.split(':');
		const cid = Number(cidStr);
		const taskId = Number(taskIdStr);
		const course = courseById.get(courseId);
		const user = userByCid.get(cid);
		if (!course || !user) continue;
		if (!enrolledKeys.has(`${cid}:${course.waitlistId}`)) continue;

		const nextIncomplete = course.tasks.find(
			(task) => !completedTaskKeys.has(`${cid}:${courseId}:${task.taskId}`)
		);
		if (
			!nextIncomplete ||
			nextIncomplete.taskType !== 'training_session' ||
			nextIncomplete.taskId !== taskId
		) {
			continue;
		}

		if (activeSessionKeys.has(`${cid}:${courseId}:${taskId}`)) continue;

		const sessionType =
			nextIncomplete.taskType === 'training_session' ? nextIncomplete.taskValue1 : null;
		if (!userCanScheduleTrainingSessionType(actioner, sessionType)) continue;

		students.push({
			cid,
			name: user.name_full,
			courseId: course.id,
			courseName: course.name,
			taskId,
			sessionDescription: describeCourseTask(nextIncomplete),
			sessionType,
			slots: mergeAvailabilitySlots(slots)
		});
	}

	students.sort((a, b) => a.name.localeCompare(b.name) || a.courseName.localeCompare(b.courseName));

	return { windowEndsAt, students };
});

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

		let session;
		try {
			session = await TrainingSession.createPending(db, {
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

		try {
			await notifyTrainingSessionEmails('scheduled', courseId, session);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		getInstructorStudentView({ courseId, cid: studentCid }).refresh();
		getStudentCourseView(courseId).refresh();
		getStudentsWithSessionAvailability().refresh();
		getMyTrainingSessions().refresh();

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

		try {
			await notifyTrainingSessionEmails('cancelled', courseId, session);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		getInstructorStudentView({ courseId, cid: studentCid }).refresh();
		getStudentCourseView(courseId).refresh();
		getStudentsWithSessionAvailability().refresh();
		getMyTrainingSessions().refresh();
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

		try {
			await notifyCourseEnrollmentEmail('completed', courseId, cid);
		} catch (err) {
			console.error('Failed to queue course enrollment email', err);
		}

		getInstructorStudentView({ courseId, cid }).refresh();
	}
);
