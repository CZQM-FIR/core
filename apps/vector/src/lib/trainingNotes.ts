import { db } from '$lib/db';
import { env } from '$env/dynamic/private';
import { type LegacyTrainingNote, type StudentTrainingNotes } from '$lib/trainingNoteTypes';
import { trainingSessions } from '@czqm/db/schema';
import {
	describeCourseTask,
	fetchVatcanUserNotes,
	formatTrainingSessionType,
	TrainingSession,
	User,
	vatcanSessionTypeLabel
} from '@czqm/common';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

function parseVatcanNoteDate(value: string | null): Date | null {
	const parsed = value ? Date.parse(value) : Number.NaN;
	return Number.isNaN(parsed) ? null : new Date(parsed);
}

export async function loadTrainingNotesForStudent(
	studentCid: number
): Promise<StudentTrainingNotes> {
	const [submittedRows, vatcanLinkedRows] = await Promise.all([
		db
			.select()
			.from(trainingSessions)
			.where(
				and(
					eq(trainingSessions.studentCid, studentCid),
					isNotNull(trainingSessions.notesSubmittedAt)
				)
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
				and(eq(trainingSessions.studentCid, studentCid), isNotNull(trainingSessions.vatcanNoteId))
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
		User.fromCids(db, instructorCids)
	]);

	const courseById = new Map(courses.map((course) => [course.id, course]));
	const instructorByCid = new Map(
		loadedInstructors.map((instructor) => [instructor.cid, instructor])
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

	let legacyNotes: LegacyTrainingNote[] = [];
	let legacyError: string | null = null;

	if (!env.VATCAN_API_TOKEN) {
		legacyError = 'VATCAN API token is not configured on this server.';
	} else {
		try {
			const vatcanNotes = await fetchVatcanUserNotes(env.VATCAN_API_TOKEN, studentCid);
			const unmatched = vatcanNotes.filter((note) => !linkedVatcanIds.has(note.id));
			const legacyInstructorCids = [
				...new Set(
					unmatched.map((note) => note.instructorCid).filter((cid): cid is number => cid != null)
				)
			];
			const legacyInstructors = await User.fromCids(db, legacyInstructorCids);
			const legacyInstructorByCid = new Map(
				legacyInstructors.map((instructor) => [instructor.cid, instructor])
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
}
