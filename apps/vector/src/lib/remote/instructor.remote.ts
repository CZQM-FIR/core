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
	trainingSessions,
	type TrainingSessionRow
} from '@czqm/db/schema';
import {
	alignObjectiveResults,
	allObjectivesAchieved,
	canCancelTrainingSession,
	canSubmitTrainingNotesToVatcan,
	canUnsubmitTrainingSessionNotes,
	Course,
	createVatcanTrainingNote,
	describeCourseTask,
	formatTrainingSessionType,
	notesUnsubmitDeadline,
	TrainingSession,
	updateVatcanTrainingNote,
	User,
	userCanGraduateVectorStudents,
	userCanScheduleTrainingSessionType,
	validateSubmittedInstructorNotes,
	validateSubmittedPositionTrained,
	VatcanNoteLockedError,
	vatcanSessionTypeFromVector,
	formatVatcanTrainingNote,
	trainingNotesSentToVatcan,
	trainingSessionBlocksBookingSql,
	type TrainingSessionStatus
} from '@czqm/common';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
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
			canCancelActiveSession:
				activeSession != null &&
				actioner.cid === activeSession.scheduledByCid &&
				(activeSession.status === 'pending' || activeSession.status === 'confirmed')
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
					trainingSessionBlocksBookingSql()
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
		getUpcomingInstructorSession().refresh();
		getInstructorTrainingSession(session.id).refresh();
		getSessionsAwaitingTrainingNotes().refresh();

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
		getUpcomingInstructorSession().refresh();
		getInstructorTrainingSession(sessionId).refresh();
		getSessionsAwaitingTrainingNotes().refresh();
	}
);

const SessionId = type('number.integer > 0');

function refreshInstructorSessionQueries(session: {
	id: number;
	courseId: string;
	studentCid: number;
}) {
	getInstructorTrainingSession(session.id).refresh();
	getUpcomingInstructorSession().refresh();
	getSessionsAwaitingTrainingNotes().refresh();
	getMyTrainingSessions().refresh();
	getInstructorStudentView({ courseId: session.courseId, cid: session.studentCid }).refresh();
	getStudentCourseView(session.courseId).refresh();
	getStudentsWithSessionAvailability().refresh();
}

function remoteCommandError(err: unknown, fallback: string): never {
	throw error(400, err instanceof Error ? err.message : fallback);
}

async function requireSchedulerSession(sessionId: number, actionerCid: number) {
	const session = await TrainingSession.fetchById(db, sessionId);
	if (!session) throw error(404, 'Training session not found');
	if (session.scheduledByCid !== actionerCid) {
		throw error(403, 'Only the person who scheduled this session can manage it');
	}
	return session;
}

async function toInstructorSessionDetail(row: TrainingSessionRow, actionerCid: number) {
	const course = await Course.fetchById(row.courseId, db);
	if (!course) throw error(404, 'Course not found');

	const task = course.tasks.find((entry) => entry.taskId === row.taskId);
	const [student, instructor, completion, positionRows] = await Promise.all([
		User.fromCid(db, row.studentCid),
		User.fromCid(db, row.scheduledByCid),
		task ? task.getCompletion(row.studentCid) : Promise.resolve(null),
		db.query.positions.findMany({
			columns: { callsign: true, name: true },
			orderBy: (position, { asc }) => [asc(position.callsign)]
		})
	]);

	if (!student) throw error(404, 'Student not found');
	if (!instructor) throw error(404, 'Instructor not found');

	const notesLocked = row.notesSubmittedAt != null;
	const unsubmitUntil = row.notesSubmittedAt ? notesUnsubmitDeadline(row.notesSubmittedAt) : null;
	const isFirstSubmit = row.vatcanNoteId == null;
	const taskComplete = completion?.isComplete ?? false;
	const status = row.status as TrainingSessionStatus;
	const canManage = actionerCid === row.scheduledByCid;
	const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;
	const taskObjectives = task?.taskType === 'training_session' ? task.objectives : [];
	const objectiveResults = notesLocked
		? (row.objectiveResults ?? [])
		: alignObjectiveResults(taskObjectives, row.objectiveResults);
	const objectives = notesLocked ? objectiveResults.map((result) => result.text) : taskObjectives;

	return {
		id: row.id,
		status,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		actualStartedAt: row.actualStartedAt,
		actualEndedAt: row.actualEndedAt,
		trainingNote: row.trainingNote,
		instructorNotes: row.instructorNotes,
		positionTrained: row.positionTrained,
		notesSubmittedAt: row.notesSubmittedAt,
		vatcanNoteId: row.vatcanNoteId,
		notesLocked,
		canUnsubmitNotes:
			canManage &&
			canSubmitTrainingNotesToVatcan(status) &&
			canUnsubmitTrainingSessionNotes(row.notesSubmittedAt),
		unsubmitUntil,
		isFirstSubmit,
		taskComplete,
		objectives,
		objectiveResults,
		canManage,
		canStart: canManage && status === 'confirmed',
		canEnd: canManage && status === 'in_progress',
		canCancel:
			canManage && canCancelTrainingSession(status, 'scheduler', trainingNotesSentToVatcan(row)),
		canReschedule: canManage && (status === 'pending' || status === 'confirmed'),
		canSaveNotes: canManage && !notesLocked && status !== 'cancelled' && status !== 'declined',
		canSubmitNotes: canManage && canSubmitTrainingNotesToVatcan(status) && !notesLocked,
		student: {
			cid: student.cid,
			name: student.displayName
		},
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
		},
		positionSuggestions: positionRows
			.filter((position) => {
				const name = position.name.trim();
				const callsign = position.callsign.trim();
				return name.length > 0 && name.toUpperCase() !== callsign.toUpperCase();
			})
			.map((position) => position.callsign)
	};
}

export const getUpcomingInstructorSession = query(async () => {
	const actioner = await authorizeVectorInstructorAccess();
	const now = new Date();
	const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	const [row] = await db
		.select()
		.from(trainingSessions)
		.where(
			and(
				eq(trainingSessions.scheduledByCid, actioner.cid),
				or(
					and(
						inArray(trainingSessions.status, ['pending', 'confirmed']),
						lte(trainingSessions.startsAt, windowEnd),
						or(gte(trainingSessions.startsAt, now), gte(trainingSessions.endsAt, now))
					),
					eq(trainingSessions.status, 'in_progress')
				)
			)
		)
		.orderBy(trainingSessions.startsAt)
		.limit(1);

	if (!row) return null;

	const student = await User.fromCid(db, row.studentCid);
	const course = await Course.fetchById(row.courseId, db);
	const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
	const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;

	return {
		id: row.id,
		status: row.status as TrainingSessionStatus,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		studentName: student?.displayName ?? `CID ${row.studentCid}`,
		courseName: course?.name ?? 'Course',
		sessionDescription: task ? describeCourseTask(task) : 'Training session',
		sessionType,
		sessionTypeLabel: sessionType ? formatTrainingSessionType(sessionType) : 'Training'
	};
});

export const getSessionsAwaitingTrainingNotes = query(async () => {
	const actioner = await authorizeVectorInstructorAccess();

	const rows = await db
		.select()
		.from(trainingSessions)
		.where(
			and(
				eq(trainingSessions.scheduledByCid, actioner.cid),
				eq(trainingSessions.status, 'completed'),
				isNull(trainingSessions.notesSubmittedAt)
			)
		)
		.orderBy(desc(trainingSessions.actualEndedAt), desc(trainingSessions.startsAt));

	return Promise.all(
		rows.map(async (row) => {
			const student = await User.fromCid(db, row.studentCid);
			const course = await Course.fetchById(row.courseId, db);
			const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
			const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;

			return {
				id: row.id,
				status: row.status as TrainingSessionStatus,
				startsAt: row.startsAt,
				endsAt: row.endsAt,
				studentName: student?.displayName ?? `CID ${row.studentCid}`,
				courseName: course?.name ?? 'Course',
				sessionDescription: task ? describeCourseTask(task) : 'Training session',
				sessionType,
				sessionTypeLabel: sessionType ? formatTrainingSessionType(sessionType) : 'Training'
			};
		})
	);
});

export const getAuthoredTrainingNotes = query(async () => {
	const actioner = await authorizeVectorInstructorAccess();

	const submittedRows = await db
		.select()
		.from(trainingSessions)
		.where(
			and(
				eq(trainingSessions.scheduledByCid, actioner.cid),
				isNotNull(trainingSessions.notesSubmittedAt)
			)
		)
		.orderBy(
			desc(trainingSessions.notesSubmittedAt),
			desc(trainingSessions.actualEndedAt),
			desc(trainingSessions.startsAt)
		);

	const courseIds = [...new Set(submittedRows.map((row) => row.courseId))];
	const studentCids = [...new Set(submittedRows.map((row) => row.studentCid))];

	const [courses, loadedStudents] = await Promise.all([
		courseIds.length === 0
			? Promise.resolve([])
			: db.query.courses.findMany({
					where: { id: { in: courseIds } },
					columns: { id: true, name: true, tasks: true }
				}),
		Promise.all(studentCids.map((cid) => User.fromCid(db, cid)))
	]);

	const courseById = new Map(courses.map((course) => [course.id, course]));
	const studentByCid = new Map(
		loadedStudents
			.filter((student): student is User => student != null)
			.map((student) => [student.cid, student])
	);

	return submittedRows.map((row) => {
		const course = courseById.get(row.courseId);
		const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
		const student = studentByCid.get(row.studentCid);
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
			studentName: student?.displayName ?? `CID ${row.studentCid}`,
			instructorNotes: row.instructorNotes
		};
	});
});

export const getInstructorTrainingSession = query(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorAccess();
	const session = await TrainingSession.fetchById(db, sessionId);
	if (!session) throw error(404, 'Training session not found');
	return toInstructorSessionDetail(session, actioner.cid);
});

const ObjectiveResult = type({
	text: 'string',
	achieved: 'boolean'
});

const SaveTrainingSessionNotesOptions = type({
	sessionId: SessionId,
	instructorNotes: 'string',
	positionTrained: 'string',
	'objectiveResults?': ObjectiveResult.array()
});

function resolveTaskObjectives(task: { taskType: string; objectives: string[] } | undefined) {
	return task?.taskType === 'training_session' ? task.objectives : [];
}

export const saveTrainingSessionNotes = command(
	SaveTrainingSessionNotesOptions,
	async ({ sessionId, instructorNotes, positionTrained, objectiveResults }) => {
		const actioner = await authorizeVectorInstructorAccess();
		const session = await requireSchedulerSession(sessionId, actioner.cid);

		const course = await Course.fetchById(session.courseId, db);
		if (!course) throw error(404, 'Course not found');
		const task = course.tasks.find((entry) => entry.taskId === session.taskId);
		const alignedResults = alignObjectiveResults(
			resolveTaskObjectives(task),
			objectiveResults ?? session.objectiveResults
		);

		try {
			await TrainingSession.saveNotes(db, sessionId, actioner.cid, {
				instructorNotes,
				positionTrained,
				objectiveResults: alignedResults
			});
		} catch (err) {
			remoteCommandError(err, 'Failed to save training notes');
		}

		refreshInstructorSessionQueries(session);
	}
);

export const startTrainingSession = command(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorAccess();
	const session = await requireSchedulerSession(sessionId, actioner.cid);

	try {
		await TrainingSession.start(db, sessionId, actioner.cid);
	} catch (err) {
		remoteCommandError(err, 'Failed to start training session');
	}

	refreshInstructorSessionQueries(session);
});

export const endTrainingSession = command(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorAccess();
	const session = await requireSchedulerSession(sessionId, actioner.cid);

	try {
		await TrainingSession.end(db, sessionId, actioner.cid);
	} catch (err) {
		remoteCommandError(err, 'Failed to end training session');
	}

	refreshInstructorSessionQueries(session);
});

const RescheduleTrainingSessionOptions = type({
	sessionId: SessionId,
	startsAt: 'string',
	endsAt: 'string'
});

export const rescheduleTrainingSession = command(
	RescheduleTrainingSessionOptions,
	async ({ sessionId, startsAt, endsAt }) => {
		const actioner = await authorizeVectorInstructorAccess();
		const session = await requireSchedulerSession(sessionId, actioner.cid);

		if (session.status !== 'pending' && session.status !== 'confirmed') {
			throw error(400, 'Only pending or confirmed training sessions can be rescheduled');
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
					eq(trainingSessionAvailability.cid, session.studentCid),
					eq(trainingSessionAvailability.courseId, session.courseId),
					eq(trainingSessionAvailability.taskId, session.taskId)
				)
			);

		const outsideAvailability = !isRangeWithinAvailability(
			{ startsAt: startsAtDate, endsAt: endsAtDate },
			availabilityRows.map((row) => ({ startsAt: row.startsAt, endsAt: row.endsAt }))
		);

		let updated;
		try {
			updated = await TrainingSession.reschedule(
				db,
				sessionId,
				actioner.cid,
				startsAtDate,
				endsAtDate
			);
		} catch (err) {
			remoteCommandError(err, 'Failed to reschedule training session');
		}

		try {
			await notifyTrainingSessionEmails('rescheduled', session.courseId, updated);
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		refreshInstructorSessionQueries(session);
		return { outsideAvailability };
	}
);

const SubmitTrainingSessionNotesOptions = type({
	sessionId: SessionId,
	instructorNotes: 'string',
	positionTrained: 'string',
	'objectiveResults?': ObjectiveResult.array()
});

export const submitTrainingSessionNotes = command(
	SubmitTrainingSessionNotesOptions,
	async ({ sessionId, instructorNotes, positionTrained, objectiveResults }) => {
		const actioner = await authorizeVectorInstructorAccess();
		const session = await requireSchedulerSession(sessionId, actioner.cid);

		if (session.status === 'cancelled' || session.status === 'declined') {
			throw error(400, 'Cancelled sessions cannot have training notes submitted to VATCAN');
		}
		if (!canSubmitTrainingNotesToVatcan(session.status as TrainingSessionStatus)) {
			throw error(400, 'Notes can only be submitted after the session has ended');
		}
		if (session.notesSubmittedAt) {
			throw error(400, 'Training notes are already submitted');
		}
		if (!session.actualStartedAt || !session.actualEndedAt) {
			throw error(400, 'Session start and end times are required to submit training notes');
		}

		let note: string;
		let position: string;
		try {
			note = validateSubmittedInstructorNotes(instructorNotes);
			position = validateSubmittedPositionTrained(positionTrained);
		} catch (err) {
			remoteCommandError(err, 'Invalid training note');
		}

		const course = await Course.fetchById(session.courseId, db);
		if (!course) throw error(404, 'Course not found');
		const task = course.tasks.find((entry) => entry.taskId === session.taskId);
		const sessionType = task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;
		const alignedResults = alignObjectiveResults(
			resolveTaskObjectives(task),
			objectiveResults ?? session.objectiveResults
		);
		const completion = task ? await task.getCompletion(session.studentCid) : null;
		const taskComplete = completion?.isComplete ?? false;

		try {
			await TrainingSession.saveNotes(db, sessionId, actioner.cid, {
				instructorNotes: note,
				positionTrained: position,
				objectiveResults: alignedResults
			});
		} catch (err) {
			remoteCommandError(err, 'Failed to save training notes');
		}

		const vatcanInput = {
			instructorCid: actioner.cid,
			position,
			note: formatVatcanTrainingNote(note, session.actualStartedAt, session.actualEndedAt, {
				sessionTypeLabel: sessionType ? formatTrainingSessionType(sessionType) : 'Training',
				sessionDescription:
					task?.taskType === 'training_session' ? (task.taskValue2 ?? null) : null,
				objectives: alignedResults
			}),
			sessionType: vatcanSessionTypeFromVector(sessionType)
		};

		if (!env.VATCAN_API_TOKEN) {
			throw error(500, 'VATCAN API token is not configured on this server.');
		}

		const vatcanEnv = { VATCAN_API_TOKEN: env.VATCAN_API_TOKEN };
		let vatcanNoteId = session.vatcanNoteId;

		try {
			if (vatcanNoteId != null) {
				await updateVatcanTrainingNote(vatcanEnv, session.studentCid, vatcanNoteId, vatcanInput);
			} else {
				const created = await createVatcanTrainingNote(vatcanEnv, session.studentCid, vatcanInput);
				vatcanNoteId = created.id;
			}
		} catch (err) {
			if (err instanceof VatcanNoteLockedError) {
				if (vatcanNoteId != null) {
					try {
						await TrainingSession.submitNotes(db, sessionId, actioner.cid, vatcanNoteId);
					} catch (lockErr) {
						console.error('Failed to re-lock training notes after VATCAN 403', lockErr);
					}
					refreshInstructorSessionQueries(session);
				}
				throw error(
					403,
					'VATCAN no longer accepts edits to this training note. Vector has kept the note locked.'
				);
			}
			throw error(
				502,
				err instanceof Error ? err.message : 'Failed to submit training note to VATCAN'
			);
		}

		if (vatcanNoteId == null) {
			throw error(502, 'VATCAN did not return a training note id');
		}

		try {
			await TrainingSession.submitNotes(db, sessionId, actioner.cid, vatcanNoteId);
		} catch (err) {
			remoteCommandError(err, 'Failed to lock training notes');
		}

		if (!taskComplete && allObjectivesAchieved(alignedResults) && task) {
			try {
				await task.complete(session.studentCid);
			} catch (err) {
				console.error('Failed to complete course task after training note submit', err);
				throw error(
					500,
					'Training note was submitted to VATCAN, but marking the course task complete failed.'
				);
			}
		}

		refreshInstructorSessionQueries(session);
	}
);

export const unsubmitTrainingSessionNotes = command(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorAccess();
	const session = await requireSchedulerSession(sessionId, actioner.cid);

	try {
		await TrainingSession.unsubmitNotes(db, sessionId, actioner.cid);
	} catch (err) {
		remoteCommandError(err, 'Failed to unsubmit training notes');
	}

	refreshInstructorSessionQueries(session);
});

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

export const syncStudentCourseTasks = command(
	type({
		courseId: CourseId,
		cid: 'number.integer > 0'
	}),
	async ({ courseId, cid }) => {
		await authorizeVectorInstructorAccess();

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
			throw error(403, 'Student must be actively enrolled in this course');
		}

		if (!env.VATCAN_API_TOKEN) {
			throw error(500, 'VATCAN API token is not configured on this server.');
		}

		await course.syncTaskCompletions(cid, {
			VATCAN_API_TOKEN: env.VATCAN_API_TOKEN
		});

		getInstructorStudentView({ courseId, cid }).refresh();
		getStudentCourseView(courseId).refresh();

		return { ok: true as const };
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
