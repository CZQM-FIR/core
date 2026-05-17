import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { assistants, type AssistantRole } from '@czqm/db/schema';
import { ASSISTANT_ROLE_INFO, OVERSEER_PARENT_PARITY_GATE_FLAGS, User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';

const getAuthorizedActioner = async () => {
	const event = getRequestEvent();

	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags: OVERSEER_PARENT_PARITY_GATE_FLAGS
	});

	if (!actioner) {
		throw error(403, 'Forbidden');
	}

	return actioner;
};

export type AssistantRow = {
	id: number;
	cid: number;
	role: AssistantRole;
	assignedAt: Date;
	name: string;
};

export const getAssistants = query(async (): Promise<AssistantRow[]> => {
	await getAuthorizedActioner();

	const rows = await db.query.assistants.findMany({
		with: { user: true }
	});

	return rows
		.map((row) => ({
			id: row.id,
			cid: row.cid,
			role: row.role as AssistantRole,
			assignedAt: row.assignedAt,
			name: row.user.name_full
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
});

const CreateAssistantSchema = type({
	cid: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0'),
	role: "'asst-web' | 'asst-chief-instructor' | 'asst-events' | 'asst-sector'"
});

export const createAssistant = form(CreateAssistantSchema, async ({ cid, role }) => {
	try {
		await getAuthorizedActioner();

		const user = await User.fromCid(db, cid);

		if (!user) {
			return { ok: false, message: 'User not found' };
		}

		if (!(role in ASSISTANT_ROLE_INFO)) {
			return { ok: false, message: 'Invalid role' };
		}

		await db
			.insert(assistants)
			.values({
				cid,
				role
			})
			.onConflictDoNothing({
				target: [assistants.cid, assistants.role]
			});

		getAssistants().refresh();

		return { ok: true, message: `Added ${user.displayName} as ${ASSISTANT_ROLE_INFO[role].label}` };
	} catch (err) {
		return { ok: false, message: err instanceof Error ? err.message : 'An error occurred' };
	}
});

const RemoveAssistantSchema = type({
	id: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0')
});

export const removeAssistant = form(RemoveAssistantSchema, async ({ id }) => {
	try {
		await getAuthorizedActioner();

		const existing = await db.query.assistants.findFirst({ where: { id } });

		if (!existing) {
			return { ok: false, message: 'Assistant not found' };
		}

		await db.delete(assistants).where(eq(assistants.id, id));

		getAssistants().refresh();

		return { ok: true, message: 'Assistant removed' };
	} catch (err) {
		return { ok: false, message: err instanceof Error ? err.message : 'An error occurred' };
	}
});
