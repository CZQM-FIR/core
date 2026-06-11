import { query } from '$app/server';
import { db } from '$lib/db';
import { Course, User, describeCourseTask, formatCourseTaskType } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { authorizeVectorInstructorAccess } from './auth';

const CourseId = type(/^[0-9a-z]{5}$/);
const WaitlistId = type('number.integer >= 0');

export const getInstructorCourses = query(async () => {
	await authorizeVectorInstructorAccess();

	return db.query.courses.findMany({
		with: {
			waitlist: {
				with: {
					students: true
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
		await authorizeVectorInstructorAccess();

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

		const tasks = await Promise.all(
			course.tasks.map(async (task) => {
				const completion = await task.getCompletion(cid);
				return {
					taskId: task.taskId,
					taskType: task.taskType,
					description: describeCourseTask(task),
					typeLabel: formatCourseTaskType(task.taskType),
					startedAt: completion?.startedAt ?? null,
					completedAt: completion?.completedAt ?? null,
					isComplete: completion?.isComplete ?? false
				};
			})
		);

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
			tasks
		};
	}
);
