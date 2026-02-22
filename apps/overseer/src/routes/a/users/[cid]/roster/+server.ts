import { db } from '$lib/db';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { roster } from '@czqm/db/schema';
import { User } from '@czqm/common';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	const actioner = await User.fromCid(db, locals.user!.cid);

	if (!actioner || !actioner.hasFlag(['admin', 'chief', 'deputy', 'chief-instructor']))
		return new Response(null, { status: 401 });

	const cid = Number(params.cid);
	const { position, status } = (await request.json()) as {
		position: string;
		status: -1 | 0 | 1 | 2;
	};

	const user = await User.fromCid(db, cid);
	if (!user) return new Response(null, { status: 404 });

	if (user.roster.some((r) => r.status === 1 && r.position === position))
		return new Response(null, { status: 409 });

	const existingRoster = await db.query.roster.findFirst({
		where: { controllerId: cid, position }
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

	const newData = await User.fromCid(db, Number(params.cid));

	return new Response(JSON.stringify({ user: newData }), { status: 200 });
};
