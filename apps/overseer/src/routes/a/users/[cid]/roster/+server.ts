import { db } from '$lib/db';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { roster, users } from '@czqm/db/schema';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	const actioner = await db.query.users.findFirst({
		where: eq(users.cid, locals.user.cid),
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
				f.flag.name === 'chief-instructor'
		)
	)
		return new Response(null, { status: 401 });

	const cid = Number(params.cid);
	const { position, status } = (await request.json()) as {
		position: string;
		status: -1 | 0 | 1 | 2;
	};

	const user = await db.query.users.findFirst({
		where: eq(users.cid, cid),
		with: {
			roster: true
		}
	});
	if (!user) return new Response(null, { status: 404 });

	if (user.roster.some((r) => r.status === 1 && r.position === position))
		return new Response(null, { status: 409 });

	const existingRoster = await db.query.roster.findFirst({
		where: and(eq(roster.controllerId, cid), eq(roster.position, position))
	});

	if (existingRoster) {
		await db
			.update(roster)
			.set({
				position,
				status
			})
			.where(and(eq(roster.controllerId, cid), eq(roster.position, position)));
	} else {
		await db.insert(roster).values({
			controllerId: cid,
			position,
			status
		});
	}

	const newData = await db.query.users.findFirst({
		where: eq(users.cid, Number(params.cid)),
		with: {
			rating: true,
			roster: true,
			soloEndorsements: {
				with: {
					position: true
				}
			}
		}
	});

	return new Response(JSON.stringify({ user: newData }), { status: 200 });
};
