import { db } from '$lib/db';
import { type } from 'arktype';
import type { PageServerLoad } from './$types';
import { events } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
	const events = await db.query.events.findMany();

	return { events };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			id: 'number.integer >= 0'
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400);
		}

		const { id } = data;

		if (!locals.user) return { status: 401, body: { message: 'Unauthorized' } };

		const actioner = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.cid, locals.user?.cid || 0),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});

		if (
			!actioner ||
			!actioner.flags.some(
				(f) =>
					f.flag.name === 'admin' ||
					f.flag.name === 'chief' ||
					f.flag.name === 'deputy' ||
					f.flag.name === 'chief-instructor' ||
					f.flag.name === 'events'
			)
		) {
			return { status: 401, body: { message: 'Unauthorized' } };
		}

		const event = await db.query.events.findFirst({
			where: (events, { eq }) => eq(events.id, id)
		});

		if (!event) {
			return { status: 404, body: { message: 'Event not found' } };
		}

		await db.delete(events).where(eq(events.id, id));

		return { status: 200 };
	}
};
