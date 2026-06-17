import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	getAvailabilityWindowEndsAt,
	getNextIncompleteTask,
	isTrainingSessionNext,
	toNextTaskSummary,
	validateAvailabilitySlots
} from '$lib/trainingSessionAvailability';
import { getCourseTaskProgress } from '$lib/courseTaskProgress';
import {
	moodleQueue,
	trainingSessionAvailability,
	trainingSessions,
	waitingUsers
} from '@czqm/db/schema';
import { getInstructorStudentView } from './instructor.remote';
import { Course, TrainingSession, User } from '@czqm/common';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { authorizeVectorStudentAccess } from './auth';

const CourseId = type(/^[0-9a-z]{5}$/);

type PrerequisiteResult = { description: string; met: boolean };

type CourseSummary = {
	id: string;
	name: string;
	description: string | null;
	waitlistId: number;
	status?: 'waitlisted' | 'enrolled';
	position?: number;
	enrolledAt?: Date | null;
	waitingSince?: Date | null;
	completedAt?: Date | null;
	prerequisiteResults?: PrerequisiteResult[];
};

export const getStudentCourses = query(async () => {
	const user = await authorizeVectorStudentAccess();

	const userWithData = await User.fromCid(db, user.cid, {
		sessions: true,
		completedPositions: true
	});
	if (!userWithData) throw error(403, 'Forbidden');

	const courses = await db.query.courses.findMany({
		columns: { id: true, name: true, description: true, waitlistId: true },
		orderBy: (courses, { asc }) => [asc(courses.name)]
	});

	const [waitingRows, enrolledRows, completedRows] = await Promise.all([
		db.query.waitingUsers.findMany({ where: { cid: user.cid } }),
		db.query.enrolledUsers.findMany({
			where: { cid: user.cid, hiddenAt: { isNull: true } }
		}),
		db.query.completedUsers.findMany({ where: { cid: user.cid } })
	]);

	const waitingByWaitlist = new Map(waitingRows.map((row) => [row.waitlistId, row]));
	const enrolledByWaitlist = new Map(enrolledRows.map((row) => [row.waitlistId, row]));
	const completedByWaitlist = new Map(completedRows.map((row) => [row.waitlistId, row]));

	const enrolled: CourseSummary[] = [];
	const completed: CourseSummary[] = [];
	const eligible: CourseSummary[] = [];
	const ineligible: CourseSummary[] = [];

	for (const course of courses) {
		const base = {
			id: course.id,
			name: course.name,
			description: course.description,
			waitlistId: course.waitlistId
		};

		const completedRow = completedByWaitlist.get(course.waitlistId);
		if (completedRow) {
			completed.push({ ...base, completedAt: completedRow.completedAt });
			continue;
		}

		const enrolledRow = enrolledByWaitlist.get(course.waitlistId);
		const waitingRow = waitingByWaitlist.get(course.waitlistId);
		if (enrolledRow || waitingRow) {
			enrolled.push({
				...base,
				status: enrolledRow ? 'enrolled' : 'waitlisted',
				position: waitingRow?.position,
				enrolledAt: enrolledRow?.enrolledAt ?? null,
				waitingSince: waitingRow?.waitingSince ?? null
			});
			continue;
		}

		const fullCourse = await Course.fetchById(course.id, db);
		if (!fullCourse) continue;

		const evaluation = await fullCourse.evaluatePrerequisites(userWithData);
		const summary: CourseSummary = {
			...base,
			prerequisiteResults: evaluation.results
		};

		if (evaluation.satisfied) {
			eligible.push(summary);
		} else {
			ineligible.push(summary);
		}
	}

	return { enrolled, completed, eligible, ineligible };
});

export const getStudentCourseView = query(CourseId, async (courseId) => {
	const user = await authorizeVectorStudentAccess();

	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const waitlistId = course.waitlist.id;
	const cid = user.cid;

	const [waiting, enrolled, completedRow, waitlist] = await Promise.all([
		db.query.waitingUsers.findFirst({ where: { waitlistId, cid } }),
		db.query.enrolledUsers.findFirst({ where: { waitlistId, cid, hiddenAt: { isNull: true } } }),
		db.query.completedUsers.findFirst({ where: { waitlistId, cid } }),
		db.query.waitlists.findFirst({
			where: { id: waitlistId },
			columns: { waitTime: true }
		})
	]);

	let bucket: 'enrolled' | 'completed' | 'eligible' | 'ineligible';
	let status: 'waitlisted' | 'enrolled' | null = null;
	let prerequisiteResults: PrerequisiteResult[] = [];

	if (completedRow) {
		bucket = 'completed';
	} else if (enrolled || waiting) {
		bucket = 'enrolled';
		status = enrolled ? 'enrolled' : 'waitlisted';
	} else {
		const userWithData = await User.fromCid(db, cid, {
			sessions: true,
			completedPositions: true
		});
		if (!userWithData) throw error(403, 'Forbidden');

		const evaluation = await course.evaluatePrerequisites(userWithData);
		prerequisiteResults = evaluation.results;
		bucket = evaluation.satisfied ? 'eligible' : 'ineligible';
	}

	const tasks =
		bucket === 'eligible' || bucket === 'ineligible'
			? []
			: await getCourseTaskProgress(course, cid);

	const nextTask = toNextTaskSummary(getNextIncompleteTask(tasks));
	const trainingSessionIsNext =
		bucket === 'enrolled' && status === 'enrolled' && isTrainingSessionNext(tasks);

	let activeSession = null;
	if (trainingSessionIsNext && nextTask) {
		const sessionRow = await TrainingSession.fetchActiveForTask(db, {
			studentCid: cid,
			courseId,
			taskId: nextTask.taskId
		});
		activeSession = sessionRow
			? await TrainingSession.enrichWithScheduler(db, TrainingSession.toSummary(sessionRow))
			: null;
	}

	const canSubmitSessionAvailability =
		trainingSessionIsNext && (activeSession == null || activeSession.status === 'confirmed');

	return {
		course: {
			id: course.id,
			name: course.name,
			description: course.description
		},
		bucket,
		status,
		position: waiting?.position ?? null,
		waitingSince: waiting?.waitingSince ?? null,
		enrolledAt: enrolled?.enrolledAt ?? null,
		completedAt: completedRow?.completedAt ?? null,
		waitTime: waitlist?.waitTime ?? null,
		prerequisiteResults,
		tasks,
		nextTask,
		canSubmitSessionAvailability,
		activeSession,
		canCancelActiveSession: activeSession?.status === 'confirmed'
	};
});

export const joinCourseWaitlist = command(CourseId, async (courseId) => {
	const user = await authorizeVectorStudentAccess();

	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const waitlistId = course.waitlist.id;

	const [waiting, enrolled, completed] = await Promise.all([
		db.query.waitingUsers.findFirst({ where: { waitlistId, cid: user.cid } }),
		db.query.enrolledUsers.findFirst({
			where: { waitlistId, cid: user.cid, hiddenAt: { isNull: true } }
		}),
		db.query.completedUsers.findFirst({ where: { waitlistId, cid: user.cid } })
	]);

	if (completed || enrolled || waiting) {
		throw error(400, 'You are already on this course');
	}

	const userWithData = await User.fromCid(db, user.cid, {
		sessions: true,
		completedPositions: true
	});
	if (!userWithData) throw error(403, 'Forbidden');

	const evaluation = await course.evaluatePrerequisites(userWithData);
	if (!evaluation.satisfied) {
		throw error(400, {
			message: 'You do not meet the course prerequisites',
			failures: evaluation.failures
		});
	}

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId },
		with: { students: true }
	});
	if (!waitlist) throw error(404, 'Waitlist not found');

	await db.insert(waitingUsers).values({
		cid: user.cid,
		waitlistId,
		position: waitlist.students.length,
		waitingSince: new Date()
	});

	if (waitlist.waitlistCohort) {
		await db.insert(moodleQueue).values({
			cid: user.cid,
			cohortId: waitlist.waitlistCohort,
			timestamp: new Date()
		});
	}

	getStudentCourses().refresh();
	getStudentCourseView(courseId).refresh();
});

export const syncStudentCourseTasks = command(CourseId, async (courseId) => {
	const user = await authorizeVectorStudentAccess();

	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const enrolled = await db.query.enrolledUsers.findFirst({
		where: {
			waitlistId: course.waitlist.id,
			cid: user.cid,
			hiddenAt: { isNull: true }
		}
	});
	if (!enrolled) {
		throw error(403, 'You must be actively enrolled in this course');
	}

	if (!env.VATCAN_API_TOKEN) {
		throw error(500, 'VATCAN API token is not configured on this server.');
	}

	await course.syncTaskCompletions(user.cid, {
		VATCAN_API_TOKEN: env.VATCAN_API_TOKEN
	});

	getStudentCourseView(courseId).refresh();

	return { ok: true as const };
});

const TrainingSessionAvailabilityOptions = type({
	courseId: CourseId,
	taskId: 'number.integer >= 0'
});

async function assertStudentSessionAvailabilityEligible(
	courseId: string,
	taskId: number,
	cid: number
) {
	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const enrolled = await db.query.enrolledUsers.findFirst({
		where: {
			waitlistId: course.waitlist.id,
			cid,
			hiddenAt: { isNull: true }
		}
	});
	if (!enrolled) {
		throw error(403, 'You must be actively enrolled in this course');
	}

	const tasks = await getCourseTaskProgress(course, cid);
	const next = getNextIncompleteTask(tasks);
	if (!next || next.taskType !== 'training_session' || next.taskId !== taskId) {
		throw error(400, 'Session availability is only available for your next training session task');
	}

	return course;
}

async function assertStudentTrainingSessionAction(
	courseId: string,
	taskId: number,
	sessionId: number,
	cid: number
) {
	await assertStudentSessionAvailabilityEligible(courseId, taskId, cid);

	const [session] = await db
		.select()
		.from(trainingSessions)
		.where(eq(trainingSessions.id, sessionId))
		.limit(1);

	if (
		!session ||
		session.studentCid !== cid ||
		session.courseId !== courseId ||
		session.taskId !== taskId
	) {
		throw error(404, 'Training session not found');
	}

	return session;
}

async function fetchTrainingSessionAvailabilityRows(cid: number, courseId: string, taskId: number) {
	return db
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
}

export const getTrainingSessionAvailability = query(
	TrainingSessionAvailabilityOptions,
	async ({ courseId, taskId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentSessionAvailabilityEligible(courseId, taskId, user.cid);

		const rows = await fetchTrainingSessionAvailabilityRows(user.cid, courseId, taskId);
		const windowEndsAt = getAvailabilityWindowEndsAt();

		return {
			slots: rows.map((row) => ({
				id: row.id,
				startsAt: row.startsAt,
				endsAt: row.endsAt
			})),
			windowEndsAt
		};
	}
);

const SaveTrainingSessionAvailabilityOptions = type({
	courseId: CourseId,
	taskId: 'number.integer >= 0',
	slots: type({
		startsAt: 'string',
		endsAt: 'string'
	}).array()
});

export const saveTrainingSessionAvailability = command(
	SaveTrainingSessionAvailabilityOptions,
	async ({ courseId, taskId, slots }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentSessionAvailabilityEligible(courseId, taskId, user.cid);

		const activeSession = await TrainingSession.fetchActiveForTask(db, {
			studentCid: user.cid,
			courseId,
			taskId
		});
		if (activeSession?.status === 'pending') {
			throw error(
				400,
				'Cannot edit availability while a training session is awaiting confirmation'
			);
		}

		const windowStart = new Date();
		const windowEndsAt = getAvailabilityWindowEndsAt(windowStart);

		let mergedSlots: { startsAt: Date; endsAt: Date }[];
		try {
			mergedSlots = validateAvailabilitySlots(
				slots.map((slot) => ({
					startsAt: new Date(slot.startsAt),
					endsAt: new Date(slot.endsAt)
				})),
				windowStart,
				windowEndsAt
			);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Invalid availability slots');
		}

		if (activeSession?.status === 'confirmed') {
			mergedSlots = validateAvailabilitySlots(
				[...mergedSlots, { startsAt: activeSession.startsAt, endsAt: activeSession.endsAt }],
				windowStart,
				windowEndsAt
			);
		}

		await db
			.delete(trainingSessionAvailability)
			.where(
				and(
					eq(trainingSessionAvailability.cid, user.cid),
					eq(trainingSessionAvailability.courseId, courseId),
					eq(trainingSessionAvailability.taskId, taskId)
				)
			);

		if (mergedSlots.length > 0) {
			await db.insert(trainingSessionAvailability).values(
				mergedSlots.map((slot) => ({
					cid: user.cid,
					courseId,
					taskId,
					startsAt: slot.startsAt,
					endsAt: slot.endsAt,
					updatedAt: new Date()
				}))
			);
		}

		getTrainingSessionAvailability({ courseId, taskId }).refresh();
		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
	}
);

const TrainingSessionActionOptions = type({
	courseId: CourseId,
	taskId: 'number.integer >= 0',
	sessionId: 'number.integer > 0'
});

export const confirmTrainingSession = command(
	TrainingSessionActionOptions,
	async ({ courseId, taskId, sessionId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentTrainingSessionAction(courseId, taskId, sessionId, user.cid);

		try {
			await TrainingSession.confirm(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to confirm training session');
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
	}
);

export const declineTrainingSession = command(
	TrainingSessionActionOptions,
	async ({ courseId, taskId, sessionId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentTrainingSessionAction(courseId, taskId, sessionId, user.cid);

		try {
			await TrainingSession.decline(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to decline training session');
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
	}
);

export const cancelTrainingSession = command(
	TrainingSessionActionOptions,
	async ({ courseId, taskId, sessionId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentTrainingSessionAction(courseId, taskId, sessionId, user.cid);

		try {
			await TrainingSession.cancel(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to cancel training session');
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
	}
);
