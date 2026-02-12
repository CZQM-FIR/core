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
			id: type('string.integer')
				.pipe((v) => Number(v))
				.to('number.integer >= 0')
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400);
		}

		const { id } = data;

		if (!locals.user) return { status: 401, body: { message: 'Unauthorized' } };

		const actioner = await db.query.users.findFirst({
			where: { cid: locals.user?.cid || 0 },
			with: {
				flags: true
			}
		});

		if (
			!actioner ||
			!actioner.flags.some(
				(f) =>
					f.name === 'admin' ||
					f.name === 'chief' ||
					f.name === 'deputy' ||
					f.name === 'chief-instructor' ||
					f.name === 'events'
			)
		) {
			return { status: 401, body: { message: 'Unauthorized' } };
		}

		const event = await db.query.events.findFirst({
			where: { id }
		});

		if (!event) {
			return { status: 404, body: { message: 'Event not found' } };
		}

		await db.delete(events).where(eq(events.id, id));

		return { status: 200 };
	}
};
