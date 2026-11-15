import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { DB } from '@czqm/common';
import { TrainingSession } from '../../../packages/common/src/models/trainingSession';

test('no-show eligibility, history, booking, and concurrent start', async () => {
	const client = createClient({ url: ':memory:' });
	await client.execute(`
		CREATE TABLE training_sessions (
			id INTEGER PRIMARY KEY, student_cid INTEGER NOT NULL, course_id TEXT NOT NULL,
			task_id INTEGER NOT NULL, scheduled_by_cid INTEGER NOT NULL,
			starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, status TEXT NOT NULL,
			cancellation_reason TEXT, training_note TEXT, actual_started_at INTEGER,
			actual_ended_at INTEGER, instructor_notes TEXT, position_trained TEXT,
			objective_results TEXT, notes_submitted_at INTEGER, vatcan_note_id INTEGER,
			is_backdated INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
		)
	`);
	const db = drizzle({ client }) as unknown as DB;
	const now = Math.floor(Date.now() / 1000);
	const insert = async (
		id: number,
		status: string,
		startsAt: number,
		startedAt: number | null = null
	) =>
		client.execute({
			sql: `INSERT INTO training_sessions
				(id, student_cid, course_id, task_id, scheduled_by_cid, starts_at, ends_at, status, actual_started_at, created_at, updated_at)
				VALUES (?, 2, 'test1', ?, 1, ?, ?, ?, ?, ?, ?)`,
			args: [id, id, startsAt, startsAt + 3600, status, startedAt, now, now]
		});
	await insert(1, 'confirmed', now - 600);
	await insert(2, 'pending', now - 600);
	await insert(3, 'confirmed', now + 600);
	await insert(4, 'confirmed', now - 600, now - 300);
	await insert(5, 'confirmed', now - 600);

	await assert.rejects(TrainingSession.markNoShow(db, 1, 2), /scheduled this session/);
	await assert.rejects(TrainingSession.markNoShow(db, 2, 1), /confirmed sessions/);
	await assert.rejects(TrainingSession.markNoShow(db, 3, 1), /start time/);
	await assert.rejects(TrainingSession.markNoShow(db, 4, 1), /not started/);
	const marked = await TrainingSession.markNoShow(db, 1, 1);
	assert.equal(marked.status, 'no_show');
	assert.equal(
		await TrainingSession.fetchActiveForTask(db, { studentCid: 2, courseId: 'test1', taskId: 1 }),
		null
	);
	assert.deepEqual(
		(await TrainingSession.fetchNoShowsForUser(db, 1)).map((row) => row.id),
		[1]
	);
	assert.deepEqual(
		(await TrainingSession.fetchNoShowsForUser(db, 2)).map((row) => row.id),
		[1]
	);
	assert.deepEqual(await TrainingSession.fetchNoShowsForUser(db, 3), []);
	const markedAt = marked.updatedAt.getTime();
	assert.deepEqual(
		(
			await TrainingSession.fetchNoShowsForUser(
				db,
				2,
				new Date(markedAt + 48 * 60 * 60 * 1000 - 1000)
			)
		).map((row) => row.id),
		[1]
	);
	assert.deepEqual(
		await TrainingSession.fetchNoShowsForUser(db, 2, new Date(markedAt + 48 * 60 * 60 * 1000)),
		[]
	);
	await assert.rejects(TrainingSession.saveNotes(db, 1, 1, {}), /Cannot edit/);

	// Force the no-show to be written after start has read the confirmed row.
	const fetch = TrainingSession.fetchById;
	TrainingSession.fetchById = async (...args) => {
		const row = await fetch(...args);
		TrainingSession.fetchById = fetch;
		await TrainingSession.markNoShow(db, 5, 1);
		return row;
	};
	try {
		await assert.rejects(TrainingSession.start(db, 5, 1), /session changed/);
		assert.equal((await fetch(db, 5))?.status, 'no_show');
	} finally {
		TrainingSession.fetchById = fetch;
		client.close();
	}
});
