import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { describeCourseTask, TrainingSession, User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { authorizeVectorStudentOrInstructorAccess } from './auth';

export const getSessionUser = query(async () => {
	const event = getRequestEvent();
	const user = event.locals.user == null ? null : await User.fromCid(db, event.locals.user.cid);
	return {
		user,
		session: event.locals.session
	};
});

export const getHomeControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, 'controller');
});

export const getVisitingControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, 'visitor');
});

export const getAllControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, ['controller', 'visitor']);
});

export const getCurrentUserInfo = query(async () => {
	const event = getRequestEvent();
	const user = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!user) {
		throw error(403, 'Forbidden');
	}

	return user;
});

export const getMyTrainingSessions = query(async () => {
	const actioner = await authorizeVectorStudentOrInstructorAccess();
	const rows = await TrainingSession.fetchActiveForUser(db, actioner.cid);
	if (rows.length === 0) return [];

	const courseIds = [...new Set(rows.map((row) => row.courseId))];
	const userCids = [...new Set(rows.flatMap((row) => [row.studentCid, row.scheduledByCid]))];

	const [courses, loadedUsers] = await Promise.all([
		db.query.courses.findMany({
			where: { id: { in: courseIds } },
			columns: { id: true, name: true, tasks: true, waitlistId: true }
		}),
		Promise.all(userCids.map((cid) => User.fromCid(db, cid)))
	]);

	const courseById = new Map(courses.map((course) => [course.id, course]));
	const userByCid = new Map(
		loadedUsers.filter((user): user is User => user != null).map((user) => [user.cid, user])
	);
	const waitlistIds = [...new Set(courses.map((course) => course.waitlistId))];
	const studentCids = [...new Set(rows.map((row) => row.studentCid))];
	const pausedEnrollments =
		waitlistIds.length === 0 || studentCids.length === 0
			? []
			: await db.query.enrolledUsers.findMany({
					where: {
						cid: { in: studentCids },
						waitlistId: { in: waitlistIds },
						hiddenAt: { isNull: true }
					},
					columns: { cid: true, waitlistId: true, pausedAt: true }
				});
	const pausedKeys = new Set(
		pausedEnrollments
			.filter((row) => row.pausedAt != null)
			.map((row) => `${row.cid}:${row.waitlistId}`)
	);

	return rows.map((row) => {
		const course = courseById.get(row.courseId);
		const student = userByCid.get(row.studentCid);
		const scheduler = userByCid.get(row.scheduledByCid);
		const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
		const session = TrainingSession.toSummary(row);

		if (scheduler) {
			session.scheduledByName = scheduler.displayName;
			session.scheduledByRole = TrainingSession.schedulerRoleLabel(scheduler);
		}

		return {
			session,
			courseId: row.courseId,
			courseName: course?.name ?? 'Course',
			taskId: row.taskId,
			sessionDescription: task ? describeCourseTask(task) : 'Training session',
			studentCid: row.studentCid,
			studentName: student?.displayName ?? `CID ${row.studentCid}`,
			role: row.studentCid === actioner.cid ? ('student' as const) : ('instructor' as const),
			paused: course ? pausedKeys.has(`${row.studentCid}:${course.waitlistId}`) : false
		};
	});
});
