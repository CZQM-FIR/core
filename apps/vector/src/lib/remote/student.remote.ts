import { command, getRequestEvent, query } from '$app/server';
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
	waitingUsers,
	type TrainingSessionRow
} from '@czqm/db/schema';
import {
	getInstructorStudentView,
	getInstructorTrainingSession,
	getUpcomingInstructorSession
} from './instructor.remote';
import { getMyTrainingSessions } from './users.remote';
import {
	Course,
	describeCourseTask,
	fetchVatcanUserNotes,
	formatTrainingSessionType,
	TrainingSession,
	User,
	vatcanSessionTypeLabel,
	type TrainingSessionStatus
} from '@czqm/common';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { authorizeVectorStudentAccess } from './auth';
import { notifyTrainingSessionEmails } from '$lib/trainingSessionEmails';
import { notifyCourseEnrollmentEmail } from '$lib/courseEnrollmentEmails';

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

	try {
		await notifyCourseEnrollmentEmail('waitlisted', courseId, user.cid);
	} catch (err) {
		console.error('Failed to queue course enrollment email', err);
	}
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
	getInstructorStudentView({ courseId, cid: user.cid }).refresh();

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

const SessionId = type('number.integer > 0');

async function toStudentSessionDetail(row: TrainingSessionRow) {
	const course = await Course.fetchById(row.courseId, db);
	if (!course) throw error(404, 'Course not found');

	const task = course.tasks.find((entry) => entry.taskId === row.taskId);
	const instructor = await User.fromCid(db, row.scheduledByCid);
	if (!instructor) throw error(404, 'Instructor not found');

	const notesSubmitted = row.notesSubmittedAt != null;
	const status = row.status as TrainingSessionStatus;
	const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;
	const objectives = task?.taskType === 'training_session' ? task.objectives : [];
	const objectiveResults = notesSubmitted ? (row.objectiveResults ?? []) : [];

	return {
		id: row.id,
		status,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		actualStartedAt: row.actualStartedAt,
		actualEndedAt: row.actualEndedAt,
		trainingNote: row.trainingNote,
		notesSubmitted,
		instructorNotes: notesSubmitted ? row.instructorNotes : null,
		positionTrained: notesSubmitted ? row.positionTrained : null,
		objectives,
		objectiveResults,
		canConfirm: status === 'pending',
		canDecline: status === 'pending',
		canCancel: status === 'confirmed',
		instructor: {
			cid: instructor.cid,
			name: instructor.displayName,
			role: TrainingSession.schedulerRoleLabel(instructor)
		},
		course: {
			id: course.id,
			name: course.name
		},
		task: {
			taskId: row.taskId,
			description: task ? describeCourseTask(task) : 'Training session',
			sessionType,
			sessionTypeLabel: sessionType ? formatTrainingSessionType(sessionType) : 'Training'
		}
	};
}

export const getStudentTrainingSession = query(SessionId, async (sessionId) => {
	const user = await authorizeVectorStudentAccess();
	const session = await TrainingSession.fetchById(db, sessionId);
	if (!session || session.studentCid !== user.cid) {
		throw error(404, 'Training session not found');
	}
	return toStudentSessionDetail(session);
});

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

		let updated;
		try {
			updated = await TrainingSession.confirm(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to confirm training session');
		}

		try {
			await notifyTrainingSessionEmails('confirmed', courseId, updated);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
		getMyTrainingSessions().refresh();
		getUpcomingInstructorSession().refresh();
		getInstructorTrainingSession(sessionId).refresh();
		getStudentTrainingSession(sessionId).refresh();
	}
);

export const declineTrainingSession = command(
	TrainingSessionActionOptions,
	async ({ courseId, taskId, sessionId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentTrainingSessionAction(courseId, taskId, sessionId, user.cid);

		let updated;
		try {
			updated = await TrainingSession.decline(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to decline training session');
		}

		try {
			await notifyTrainingSessionEmails('declined', courseId, updated);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
		getMyTrainingSessions().refresh();
		getUpcomingInstructorSession().refresh();
		getInstructorTrainingSession(sessionId).refresh();
		getStudentTrainingSession(sessionId).refresh();
	}
);

export const cancelTrainingSession = command(
	TrainingSessionActionOptions,
	async ({ courseId, taskId, sessionId }) => {
		const user = await authorizeVectorStudentAccess();
		await assertStudentTrainingSessionAction(courseId, taskId, sessionId, user.cid);

		let updated;
		try {
			updated = await TrainingSession.cancel(db, sessionId, user.cid);
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to cancel training session');
		}

		try {
			await notifyTrainingSessionEmails('cancelled', courseId, updated);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		getStudentCourseView(courseId).refresh();
		getInstructorStudentView({ courseId, cid: user.cid }).refresh();
		getMyTrainingSessions().refresh();
		getUpcomingInstructorSession().refresh();
		getInstructorTrainingSession(sessionId).refresh();
		getStudentTrainingSession(sessionId).refresh();
	}
);

function parseVatcanNoteDate(value: string | null): Date | null {
	const parsed = value ? Date.parse(value) : Number.NaN;
	return Number.isNaN(parsed) ? null : new Date(parsed);
}

export const getMyTrainingNotes = query(async () => {
	const event = getRequestEvent();
	const user = await User.fromSessionToken(db, event.cookies.get('session') || '');
	if (!user) throw error(403, 'Forbidden');

	const [submittedRows, vatcanLinkedRows] = await Promise.all([
		db
			.select()
			.from(trainingSessions)
			.where(
				and(eq(trainingSessions.studentCid, user.cid), isNotNull(trainingSessions.notesSubmittedAt))
			)
			.orderBy(
				desc(trainingSessions.notesSubmittedAt),
				desc(trainingSessions.actualEndedAt),
				desc(trainingSessions.startsAt)
			),
		db
			.select({ vatcanNoteId: trainingSessions.vatcanNoteId })
			.from(trainingSessions)
			.where(
				and(eq(trainingSessions.studentCid, user.cid), isNotNull(trainingSessions.vatcanNoteId))
			)
	]);

	const courseIds = [...new Set(submittedRows.map((row) => row.courseId))];
	const instructorCids = [...new Set(submittedRows.map((row) => row.scheduledByCid))];

	const [courses, loadedInstructors] = await Promise.all([
		courseIds.length === 0
			? Promise.resolve([])
			: db.query.courses.findMany({
					where: { id: { in: courseIds } },
					columns: { id: true, name: true, tasks: true }
				}),
		Promise.all(instructorCids.map((cid) => User.fromCid(db, cid)))
	]);

	const courseById = new Map(courses.map((course) => [course.id, course]));
	const instructorByCid = new Map(
		loadedInstructors
			.filter((instructor): instructor is User => instructor != null)
			.map((instructor) => [instructor.cid, instructor])
	);

	const notes = submittedRows.map((row) => {
		const course = courseById.get(row.courseId);
		const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
		const instructor = instructorByCid.get(row.scheduledByCid);
		const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;

		return {
			sessionId: row.id,
			notesSubmittedAt: row.notesSubmittedAt,
			startsAt: row.startsAt,
			actualEndedAt: row.actualEndedAt,
			courseName: course?.name ?? 'Course',
			sessionDescription: task ? describeCourseTask(task) : 'Training session',
			sessionTypeLabel: sessionType ? formatTrainingSessionType(sessionType) : 'Training',
			positionTrained: row.positionTrained,
			instructorName: instructor?.displayName ?? `CID ${row.scheduledByCid}`,
			instructorRole: instructor ? TrainingSession.schedulerRoleLabel(instructor) : 'Staff',
			instructorNotes: row.instructorNotes
		};
	});

	const linkedVatcanIds = new Set(
		vatcanLinkedRows.map((row) => row.vatcanNoteId).filter((id): id is number => id != null)
	);

	let legacyNotes: {
		id: number;
		createdAt: Date | null;
		createdAtRaw: string | null;
		position: string | null;
		sessionTypeLabel: string | null;
		instructorName: string | null;
		trainingNote: string | null;
	}[] = [];
	let legacyError: string | null = null;

	if (!env.VATCAN_API_TOKEN) {
		legacyError = 'VATCAN API token is not configured on this server.';
	} else {
		try {
			const vatcanNotes = await fetchVatcanUserNotes(env.VATCAN_API_TOKEN, user.cid);
			const unmatched = vatcanNotes.filter((note) => !linkedVatcanIds.has(note.id));
			const legacyInstructorCids = [
				...new Set(
					unmatched.map((note) => note.instructorCid).filter((cid): cid is number => cid != null)
				)
			];
			const legacyInstructors = await Promise.all(
				legacyInstructorCids.map((cid) => User.fromCid(db, cid))
			);
			const legacyInstructorByCid = new Map(
				legacyInstructors
					.filter((instructor): instructor is User => instructor != null)
					.map((instructor) => [instructor.cid, instructor])
			);

			legacyNotes = unmatched
				.map((note) => {
					const instructor =
						note.instructorCid != null ? legacyInstructorByCid.get(note.instructorCid) : undefined;
					return {
						id: note.id,
						createdAt: parseVatcanNoteDate(note.createdAt),
						createdAtRaw: note.createdAt,
						position: note.position,
						sessionTypeLabel: vatcanSessionTypeLabel(note.sessionType),
						instructorName:
							instructor?.displayName ??
							(note.instructorCid != null ? `CID ${note.instructorCid}` : null),
						trainingNote: note.trainingNote
					};
				})
				.sort((a, b) => {
					const timeA = a.createdAt?.getTime() ?? 0;
					const timeB = b.createdAt?.getTime() ?? 0;
					if (timeA !== timeB) return timeB - timeA;
					return b.id - a.id;
				});
		} catch (err) {
			legacyError = err instanceof Error ? err.message : 'Failed to load legacy training notes.';
		}
	}

	return { notes, legacyNotes, legacyError };
});
