import { db } from '$lib/db';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { flags, positions, soloEndorsements, users, usersToFlags } from '@czqm/db/schema';
import { fail } from '@sveltejs/kit';

export const load = (async ({ params }) => {
	const user = await db.query.users.findFirst({
		where: eq(users.cid, Number(params.cid)),
		with: {
			flags: {
				with: {
					flag: true
				}
			},
			rating: true,
			roster: true,
			soloEndorsements: {
				with: {
					position: true
				}
			},
			sessions: {
				with: {
					position: true
				}
			}
		}
	});

	const flags = (await db.query.flags.findMany({}))
		.filter((f) => f.showInSelect)
		.filter((f) => !user?.flags.some((uf) => uf.flagId === f.id));

	return { user, cid: params.cid, flags };
}) satisfies PageServerLoad;

export const actions = {
	addFlag: async ({ request, locals }) => {
		const data = await request.formData();
		const cid = Number(data.get('cid'));
		const flagId = Number(data.get('flag'));

		if (!cid || !flagId) {
			return fail(400);
		}

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
			return fail(401, {
				ok: false,
				message: 'You do not have permission to add this flag'
			});

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});
		if (!user) return fail(404, { ok: false, message: 'User not found' });
		if (user.flags.some((f) => f.flagId === flagId)) {
			return fail(400, { ok: false, message: 'User already has this flag' });
		}

		const flag = await db.query.flags.findFirst({
			where: eq(flags.id, flagId)
		});

		if (!flag) return fail(404, { ok: false, message: 'Flag not found' });

		if (!flag.showInSelect) {
			return fail(400, { ok: false, message: 'This flag cannot be added on this page' });
		}

		await db.insert(usersToFlags).values({
			userId: user.cid,
			flagId: flag.id
		});

		return {
			ok: true,
			status: 200,
			message: 'Flag added'
		};
	},
	removeFlag: async ({ request, locals }) => {
		const data = await request.formData();
		const cid = Number(data.get('cid'));
		const flagId = Number(data.get('flag'));

		if (!cid || !flagId) {
			return fail(400);
		}

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
			return fail(401, {
				ok: false,
				message: 'You do not have permission to remove this flag'
			});

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});
		if (!user) return fail(404, { ok: false, message: 'User not found' });
		if (!user.flags.some((f) => f.flagId === flagId)) {
			return fail(400, { ok: false, message: 'User does not have this flag' });
		}

		const flag = await db.query.flags.findFirst({
			where: eq(flags.id, flagId)
		});

		if (!flag) return fail(404, { ok: false, message: 'Flag not found' });

		if (!flag.showInSelect) {
			return fail(400, { ok: false, message: 'This flag cannot be removed on this page' });
		}

		await db
			.delete(usersToFlags)
			.where(and(eq(usersToFlags.userId, user.cid), eq(usersToFlags.flagId, flag.id)));

		return {
			ok: true,
			status: 200,
			message: 'Flag removed'
		};
	},
	extendSoloEndorsement: async ({ request, locals }) => {
		const data = await request.formData();
		const cid = Number(data.get('cid'));
		const endorsementId = Number(data.get('id'));

		if (!cid || !endorsementId) {
			return fail(400);
		}

		// verify the actioner has perms
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
			return fail(401);

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				soloEndorsements: {
					with: {
						position: true
					}
				}
			}
		});
		if (!user) return fail(404);
		if (!user.soloEndorsements.some((e) => e.id === endorsementId)) {
			return fail(404);
		}

		const endorsement = user.soloEndorsements.find((e) => e.id === endorsementId)!;
		let expiresAt = endorsement.expiresAt;

		// check if within a week of expiration
		const now = new Date();
		const diff = expiresAt.getTime() - now.getTime();
		const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (diffDays > 7) {
			return {
				status: 400,
				statusText: 'Must be within a week of expiration to extend'
			};
		}

		expiresAt = new Date(expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);

		await db
			.update(soloEndorsements)
			.set({ expiresAt })
			.where(eq(soloEndorsements.id, endorsementId));

		return { status: 200, statusText: 'Endorsement extended by 30 days' };
	},
	renewSoloEndorsement: async ({ request, locals }) => {
		const data = await request.formData();
		const cid = Number(data.get('cid'));
		const endorsementId = Number(data.get('id'));

		if (!cid || !endorsementId) {
			return fail(400);
		}

		// verify the actioner has perms
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
			return fail(401);

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				soloEndorsements: {
					with: {
						position: true
					}
				}
			}
		});
		if (!user) return fail(404);
		if (!user.soloEndorsements.some((e) => e.id === endorsementId)) {
			return fail(404);
		}

		const endorsement = user.soloEndorsements.find((e) => e.id === endorsementId)!;
		let expiresAt = endorsement.expiresAt;

		expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await db
			.update(soloEndorsements)
			.set({ expiresAt })
			.where(eq(soloEndorsements.id, endorsementId));

		return { status: 200, statusText: 'Endorsement renewed' };
	},
	deleteSoloEndorsement: async ({ request, locals }) => {
		const data = await request.formData();
		const cid = Number(data.get('cid'));
		const endorsementId = Number(data.get('id'));

		if (!cid || !endorsementId) {
			return fail(400);
		}

		console.log('cid', cid);
		console.log('endorsementId', endorsementId);

		// verify the actioner has perms
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
			return fail(401);

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				soloEndorsements: {
					with: {
						position: true
					}
				}
			}
		});
		if (!user) return fail(404);
		if (!user.soloEndorsements.some((e) => e.id === endorsementId)) {
			return fail(404);
		}

		await db.delete(soloEndorsements).where(eq(soloEndorsements.id, endorsementId));

		return { status: 200, statusText: 'Endorsement revoked' };
	},
	createSoloEndorsement: async ({ request, locals }) => {
		const data = await request.formData();
		const positionName = data.get('position')?.toString();
		const duration = Number(data.get('duration'));
		const cid = Number(data.get('cid'));

		if (!positionName || !duration || !cid) {
			return fail(400);
		}

		// verify the actioner has perms
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
			return fail(401);

		const user = await db.query.users.findFirst({
			where: eq(users.cid, cid),
			with: {
				soloEndorsements: {
					with: {
						position: true
					}
				},
				roster: true
			}
		});

		if (!user) return fail(404);

		// check if the user already is certified for this position
		if (user.roster.some((r) => positionName.includes(r.position) && r.status === 2)) {
			return {
				status: 409,
				statusText: 'User is already certified for this position'
			};
		}

		// check if the user already has an endorsement for this position
		if (user.soloEndorsements.some((e) => e.position.callsign === positionName)) {
			return {
				status: 409,
				statusText: 'User already has an endorsement for this position'
			};
		}

		const position = await db.query.positions.findFirst({
			where: eq(positions.callsign, positionName.toUpperCase())
		});

		if (!position) return { status: 404, statusText: 'Position not found' };

		const endorsementInsert = await db
			.insert(soloEndorsements)
			.values({
				controllerId: user.cid,
				positionId: position.id,
				expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
			})
			.returning();

		const endorsement = await db.query.soloEndorsements.findFirst({
			where: eq(soloEndorsements.id, endorsementInsert[0].id),
			with: {
				position: true
			}
		});

		if (endorsement) {
			return { status: 200, endorsement, statusText: 'Endorsement created' };
		} else {
			return fail(500);
		}
	}
} satisfies Actions;
