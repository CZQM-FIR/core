import { db } from '$lib/db';
import type { PageServerLoad } from './$types';
import { events } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';

export const load = (async () => {
	const events = await db.query.events.findMany();

	return { events };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id') as string);

		if (!locals.user) return { status: 401, body: { message: 'Unauthorized' } };

		const actioner = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.cid, locals.user.cid),
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
