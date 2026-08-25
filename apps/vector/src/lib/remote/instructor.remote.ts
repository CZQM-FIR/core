import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	getAvailabilityWindowEndsAt,
	getNextIncompleteTask,
	getWindowStartDay,
	isRangeWithinAvailability,
	isTrainingSessionNext,
	mergeAvailabilitySlots,
	toNextTaskSummary,
	validateSessionTimeRange
} from '$lib/trainingSessionAvailability';
import { getCourseTaskProgress } from '$lib/courseTaskProgress';
import { loadTrainingNotesForStudent } from '$lib/trainingNotes';
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
	canTransferTrainingSession,
	canUnsubmitTrainingSessionNotes,
	Course,
	CourseTask,
	certifyControllerOnRoster,
	createVatcanTrainingNote,
	describeCourseTask,
	formatTrainingSessionType,
	grantSoloEndorsement,
	isRosterPosition,
	notesUnsubmitDeadline,
	parseSoloDurationDays,
	TrainingSession,
	updateVatcanTrainingNote,
	User,
	USER_FETCH_MINIMAL,
	userCanCompleteInstructorOnlyCourseTasks,
	userCanForceCompleteCourseTasks,
	userCanGraduateVectorStudents,
	userCanPauseVectorTraining,
	userCanScheduleTrainingSessionType,
	userHasVectorAdminAccess,
	userHasVectorInstructorAccess,
	getAssistantParentFlagsForUser,
	requiresInstructorToComplete,
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
import {
	authorizeVectorAdminAccess,
	authorizeVectorInstructorAccess,
	authorizeVectorInstructorOrAdminAccess
} from './auth';
import { getStudentCourseView } from './student.remote';
import { getMyTrainingSessions } from './users.remote';
import { notifyTrainingSessionEmails } from '$lib/trainingSessionEmails';
import { notifyCourseEnrollmentEmail } from '$lib/courseEnrollmentEmails';
import { notifyCourseTaskCompletionEmail } from '$lib/courseTaskCompletionEmails';
import {
	assertEnrollmentNotPaused,
	requireActiveUnpausedEnrollment,
	toCoursePauseInfo
} from '$lib/courseEnrollmentPause';

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
		const actioner = await authorizeVectorInstructorOrAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const student = await User.fromCid(db, cid);
		if (!student) throw error(404, 'Student not found');

		const waitlistId = course.waitlist.id;

		const [waiting, enrolled, completed, assistantParents] = await Promise.all([
			db.query.waitingUsers.findFirst({ where: { waitlistId, cid } }),
			db.query.enrolledUsers.findFirst({ where: { waitlistId, cid } }),
			db.query.completedUsers.findFirst({ where: { waitlistId, cid } }),
			getAssistantParentFlagsForUser(db, actioner.cid)
		]);

		const status = completed
			? 'completed'
			: enrolled
				? 'enrolled'
				: waiting
					? 'waitlisted'
					: 'none';

		const pause = status === 'enrolled' ? toCoursePauseInfo(enrolled) : null;
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
				pause == null &&
				canViewSessionAvailability &&
				activeSession == null &&
				userHasVectorInstructorAccess(actioner) &&
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
			pause,
			canPauseTraining: userCanPauseVectorTraining(actioner, assistantParents),
			tasks,
			canGraduateStudent: userCanGraduateVectorStudents(actioner),
			canCompleteInstructorOnlyTasks: userCanCompleteInstructorOnlyCourseTasks(actioner),
			canForceCompleteTasks: userCanForceCompleteCourseTasks(actioner, assistantParents),
			canMarkTasksComplete: userHasVectorInstructorAccess(actioner),
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

export type ScheduledSessionInWindow = {
	id: number;
	startsAt: Date;
	endsAt: Date;
	status: TrainingSessionStatus;
	sessionType: string;
	sessionTypeLabel: string;
	sessionDescription: string;
	courseId: string;
	courseName: string;
	studentCid: number;
	studentName: string;
	instructorCid: number;
	instructorName: string;
};

export const getScheduledSessionsInWindow = query(async () => {
	await authorizeVectorInstructorAccess();

	const windowStart = getWindowStartDay();
	const windowEndsAt = getAvailabilityWindowEndsAt(windowStart);
	const rows = await TrainingSession.fetchScheduledInWindow(db, windowStart, windowEndsAt);
	if (rows.length === 0) return [];

	const courseIds = [...new Set(rows.map((row) => row.courseId))];
	const userCids = [...new Set(rows.flatMap((row) => [row.studentCid, row.scheduledByCid]))];

	const [courses, loadedUsers] = await Promise.all([
		db.query.courses.findMany({
			where: { id: { in: courseIds } },
			columns: { id: true, name: true, tasks: true }
		}),
		Promise.all(userCids.map((cid) => User.fromCid(db, cid)))
	]);

	const courseById = new Map(courses.map((course) => [course.id, course]));
	const userByCid = new Map(
		loadedUsers.filter((user): user is User => user != null).map((user) => [user.cid, user])
	);

	return rows.map((row): ScheduledSessionInWindow => {
		const course = courseById.get(row.courseId);
		const task = course?.tasks.find((entry) => entry.taskId === row.taskId);
		const sessionType = task?.taskValue1 || 'generic';
		const student = userByCid.get(row.studentCid);
		const instructor = userByCid.get(row.scheduledByCid);

		return {
			id: row.id,
			startsAt: row.startsAt,
			endsAt: row.endsAt,
			status: row.status as TrainingSessionStatus,
			sessionType,
			sessionTypeLabel: formatTrainingSessionType(sessionType),
			sessionDescription: task ? describeCourseTask(task) : 'Training session',
			courseId: row.courseId,
			courseName: course?.name ?? 'Course',
			studentCid: row.studentCid,
			studentName: student?.displayName ?? `CID ${row.studentCid}`,
			instructorCid: row.scheduledByCid,
			instructorName: instructor?.displayName ?? `CID ${row.scheduledByCid}`
		};
	});
});

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
					columns: { cid: true, waitlistId: true, pausedAt: true }
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

	const enrolledKeys = new Set(
		enrolledRows.filter((row) => row.pausedAt == null).map((row) => `${row.cid}:${row.waitlistId}`)
	);
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
		assertEnrollmentNotPaused(enrolled);

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
		getScheduledSessionsInWindow().refresh();
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
		getScheduledSessionsInWindow().refresh();
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
	getInstructorStudentTrainingNotes({ cid: session.studentCid }).refresh();
	getStudentCourseView(session.courseId).refresh();
	getStudentsWithSessionAvailability().refresh();
	getScheduledSessionsInWindow().refresh();
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

async function actorCanTransferSession(actioner: User, session: TrainingSessionRow) {
	if (
		!canTransferTrainingSession(
			session.status as TrainingSessionStatus,
			trainingNotesSentToVatcan(session)
		)
	) {
		return false;
	}
	if (actioner.cid === session.scheduledByCid) return true;
	const parents = await getAssistantParentFlagsForUser(db, actioner.cid);
	return userHasVectorAdminAccess(actioner, parents);
}

function trainingSessionTypeFromCourse(course: Course | null, taskId: number): string | null {
	const task = course?.tasks.find((entry) => entry.taskId === taskId);
	return task?.taskType === 'training_session' ? (task.taskValue1 ?? null) : null;
}

async function toInstructorSessionDetail(row: TrainingSessionRow, actioner: User) {
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
	const canManage = actioner.cid === row.scheduledByCid;
	const canTransfer = await actorCanTransferSession(actioner, row);
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
		canTransfer,
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

export const getInstructorStudentTrainingNotes = query(
	type({
		cid: 'number.integer > 0'
	}),
	async ({ cid }) => {
		await authorizeVectorInstructorOrAdminAccess();

		const student = await User.fromCid(db, cid);
		if (!student) throw error(404, 'Student not found');

		return loadTrainingNotesForStudent(cid);
	}
);

export const getInstructorTrainingSession = query(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorOrAdminAccess();
	const session = await TrainingSession.fetchById(db, sessionId);
	if (!session) throw error(404, 'Training session not found');
	return toInstructorSessionDetail(session, actioner);
});

export const getTrainingSessionTransferTargets = query(SessionId, async (sessionId) => {
	const actioner = await authorizeVectorInstructorOrAdminAccess();
	const session = await TrainingSession.fetchById(db, sessionId);
	if (!session) throw error(404, 'Training session not found');
	if (!(await actorCanTransferSession(actioner, session))) {
		throw error(403, 'You cannot transfer this training session');
	}

	const course = await Course.fetchById(session.courseId, db);
	const sessionType = trainingSessionTypeFromCourse(course, session.taskId);
	const candidates = await User.fromFlag(
		db,
		['instructor', 'mentor', 'chief-instructor', 'admin'],
		USER_FETCH_MINIMAL
	);

	const seen = new Set<number>();
	const targets = [];
	for (const candidate of candidates) {
		if (seen.has(candidate.cid)) continue;
		seen.add(candidate.cid);
		if (candidate.cid === session.scheduledByCid || candidate.cid === session.studentCid) {
			continue;
		}
		if (!userHasVectorInstructorAccess(candidate)) continue;
		if (!userCanScheduleTrainingSessionType(candidate, sessionType)) continue;
		targets.push({
			cid: candidate.cid,
			name: candidate.displayName,
			role: TrainingSession.schedulerRoleLabel(candidate)
		});
	}

	return targets.sort((a, b) => a.name.localeCompare(b.name));
});

const TransferTrainingSessionOptions = type({
	sessionId: SessionId,
	toCid: 'number.integer > 0'
});

export const transferTrainingSession = command(
	TransferTrainingSessionOptions,
	async ({ sessionId, toCid }) => {
		const actioner = await authorizeVectorInstructorOrAdminAccess();
		const session = await TrainingSession.fetchById(db, sessionId);
		if (!session) throw error(404, 'Training session not found');
		if (!(await actorCanTransferSession(actioner, session))) {
			throw error(403, 'You cannot transfer this training session');
		}

		const course = await Course.fetchById(session.courseId, db);
		if (!course) throw error(404, 'Course not found');
		const sessionType = trainingSessionTypeFromCourse(course, session.taskId);

		const target = await User.fromCid(db, toCid);
		if (!target) throw error(404, 'Instructor not found');
		if (target.cid === session.scheduledByCid) {
			throw error(400, 'This training session is already assigned to that instructor');
		}
		if (target.cid === session.studentCid) {
			throw error(400, 'A training session cannot be transferred to the student');
		}
		if (!userHasVectorInstructorAccess(target)) {
			throw error(400, 'Sessions can only be transferred to an instructor or mentor');
		}
		if (!userCanScheduleTrainingSessionType(target, sessionType)) {
			throw error(400, 'This session type cannot be transferred to a mentor');
		}

		let updated;
		try {
			updated = await TrainingSession.transfer(db, sessionId, toCid);
		} catch (err) {
			remoteCommandError(err, 'Failed to transfer training session');
		}

		try {
			await notifyTrainingSessionEmails('transferred', session.courseId, {
				...updated,
				previousScheduledByCid: session.scheduledByCid
			});
		} catch (err) {
			console.error('Failed to queue training session emails', err);
		}

		refreshInstructorSessionQueries(updated);
		getTrainingSessionTransferTargets(sessionId).refresh();
	}
);

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
		await requireActiveUnpausedEnrollment(
			session.courseId,
			session.studentCid,
			'Student is not enrolled in this course'
		);

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

async function getCourseTaskById(courseId: string, taskId: number) {
	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const task = course.tasks.find((entry) => entry.taskId === taskId);
	if (!task) throw error(404, 'Task not found');
	return { course, task };
}

async function getInstructorCourseTask(courseId: string, taskId: number) {
	const { task } = await getCourseTaskById(courseId, taskId);
	if (task.isAutoCompletable() || !task.isManuallyCompletable()) {
		throw error(400, 'This task cannot be marked complete manually');
	}

	return task;
}

async function applyCourseTaskCompletion(
	task: CourseTask,
	courseId: string,
	cid: number,
	actionerCid: number
) {
	try {
		if (task.taskType === 'certify') {
			const position = task.taskValue1?.trim() ?? '';
			if (!isRosterPosition(position)) {
				throw new Error('This certify task is missing a valid roster position');
			}
			await certifyControllerOnRoster(db, cid, position);
		} else if (task.taskType === 'solo') {
			const callsign = task.taskValue1?.trim() ?? '';
			const durationDays = parseSoloDurationDays(task.taskValue2);
			await grantSoloEndorsement(db, cid, callsign, durationDays);
		}
	} catch (err) {
		remoteCommandError(err, 'Failed to update roster or solo endorsement');
	}

	await task.complete(cid);

	if (task.taskType === 'certify' || task.taskType === 'solo') {
		try {
			await notifyCourseTaskCompletionEmail(task.taskType, courseId, cid, actionerCid, task);
		} catch (err) {
			console.error('Failed to queue training completion email', err);
		}
	}

	getInstructorStudentView({ courseId, cid }).refresh();
	getStudentCourseView(courseId).refresh();

	return {
		followUp: task.taskType === 'certify' || task.taskType === 'solo' ? task.taskType : null
	};
}

export const completeStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		const actioner = await authorizeVectorInstructorAccess();
		await requireActiveUnpausedEnrollment(courseId, cid, 'Student is not enrolled in this course');

		const task = await getInstructorCourseTask(courseId, taskId);
		if (
			requiresInstructorToComplete(task.taskType) &&
			!userCanCompleteInstructorOnlyCourseTasks(actioner)
		) {
			throw error(403, 'Only instructors can mark this task complete');
		}

		if (task.taskType === 'certify' || task.taskType === 'solo') {
			const course = await Course.fetchById(courseId, db);
			if (!course) throw error(404, 'Course not found');

			const taskIndex = course.tasks.findIndex((entry) => entry.taskId === taskId);
			const priorTasks = course.tasks.slice(0, Math.max(taskIndex, 0));
			for (const priorTask of priorTasks) {
				const completion = await priorTask.getCompletion(cid);
				if (!completion?.isComplete) {
					throw error(400, 'Complete all previous tasks first');
				}
			}
		}

		return applyCourseTaskCompletion(task, courseId, cid, actioner.cid);
	}
);

export const forceCompleteStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		const actioner = await authorizeVectorAdminAccess();
		await requireActiveUnpausedEnrollment(courseId, cid, 'Student is not enrolled in this course');

		const { task } = await getCourseTaskById(courseId, taskId);
		return applyCourseTaskCompletion(task, courseId, cid, actioner.cid);
	}
);

export const uncompleteStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		const actioner = await authorizeVectorInstructorAccess();
		await requireActiveUnpausedEnrollment(courseId, cid, 'Student is not enrolled in this course');

		const task = await getInstructorCourseTask(courseId, taskId);
		if (
			requiresInstructorToComplete(task.taskType) &&
			!userCanCompleteInstructorOnlyCourseTasks(actioner)
		) {
			throw error(403, 'Only instructors can mark this task incomplete');
		}

		const completion = await task.getCompletion(cid);
		if (!completion) throw error(404, 'Task completion not found');

		await completion.uncomplete();

		getInstructorStudentView({ courseId, cid }).refresh();
		getStudentCourseView(courseId).refresh();
	}
);

export const forceUncompleteStudentCourseTask = command(
	StudentTaskOptions,
	async ({ courseId, cid, taskId }) => {
		await authorizeVectorAdminAccess();
		await requireActiveUnpausedEnrollment(courseId, cid, 'Student is not enrolled in this course');

		const { task } = await getCourseTaskById(courseId, taskId);
		const completion = await task.getCompletion(cid);
		if (!completion) throw error(404, 'Task completion not found');

		await completion.uncomplete();

		getInstructorStudentView({ courseId, cid }).refresh();
		getStudentCourseView(courseId).refresh();
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
		assertEnrollmentNotPaused(enrolled);

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
		assertEnrollmentNotPaused(enrolled);

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
