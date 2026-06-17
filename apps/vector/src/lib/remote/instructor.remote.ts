import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	getAvailabilityWindowEndsAt,
	getNextIncompleteTask,
	isTrainingSessionNext,
	toNextTaskSummary
} from '$lib/trainingSessionAvailability';
import { getCourseTaskProgress } from '$lib/courseTaskProgress';
import { trainingSessionAvailability } from '@czqm/db/schema';
import { Course, User, userCanGraduateVectorStudents } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { authorizeVectorInstructorAccess } from './auth';

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
		const canViewSessionAvailability =
			status === 'enrolled' && isTrainingSessionNext(tasks);

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
			canViewSessionAvailability
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
