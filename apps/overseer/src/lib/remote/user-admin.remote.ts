import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { soloEndorsements, users, usersToFlags } from '@czqm/db/schema';
import {
	OVERSEER_TRAINING_TOOL_FLAGS,
	User,
	grantSoloEndorsement,
	type RosterPositionStatus,
	USER_FETCH_FULL
} from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

const getAuthorizedActioner = async () => {
	const event = getRequestEvent();

	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags: OVERSEER_TRAINING_TOOL_FLAGS
	});

	if (!actioner) {
		throw error(403, 'Forbidden');
	}

	return actioner;
};

const toUserAdminDetails = async (cid: number) => {
	const user = await User.fromCid(db, cid, USER_FETCH_FULL);

	if (!user) {
		throw error(404, 'User not found');
	}

	const flags = (await db.query.flags.findMany({ where: { showInSelect: true } })).filter(
		(flag) => !user.flags.some((userFlag) => userFlag.id === flag.id)
	);

	const sortedSessions = [...user.sessions].sort(
		(a, b) => b.logonTime.getTime() - a.logonTime.getTime()
	);

	const roster: Record<'gnd' | 'twr' | 'app' | 'ctr', RosterPositionStatus> = {
		gnd: user.getRosterStatus('gnd'),
		twr: user.getRosterStatus('twr'),
		app: user.getRosterStatus('app'),
		ctr: user.getRosterStatus('ctr')
	};

	return {
		user: {
			...user.toJSON(),
			active: user.active // Explicitly include active status
		},
		cid: cid.toString(),
		flags,
		roster,
		last10Sessions: sortedSessions.slice(0, 10)
	};
};

export type UserAdminDetails = Awaited<ReturnType<typeof toUserAdminDetails>>;

export const getUserAdminDetails = query(type('number.integer >= 0'), async (cid) => {
	await getAuthorizedActioner();

	return await toUserAdminDetails(cid);
});

const FlagFormSchema = type({
	cid: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0'),
	flag: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0')
});

export const addUserFlag = form(FlagFormSchema, async ({ cid, flag: flagId }) => {
	await getAuthorizedActioner();

	const user = await User.fromCid(db, cid, USER_FETCH_FULL);

	if (!user) {
		throw error(404, 'User not found');
	}

	if (user.flags.some((f) => f.id === flagId)) {
		throw error(400, 'User already has this flag');
	}

	const flag = await db.query.flags.findFirst({ where: { id: flagId } });

	if (!flag) {
		throw error(404, 'Flag not found');
	}

	if (!flag.showInSelect) {
		throw error(400, 'This flag cannot be added on this page');
	}

	await db.insert(usersToFlags).values({
		userId: user.cid,
		flagId: flag.id
	});

	getUserAdminDetails(cid).refresh();

	return {
		message: 'Flag added'
	};
});

export const removeUserFlag = form(FlagFormSchema, async ({ cid, flag: flagId }) => {
	await getAuthorizedActioner();

	const user = await User.fromCid(db, cid, USER_FETCH_FULL);

	if (!user) {
		throw error(404, 'User not found');
	}

	if (!user.flags.some((f) => f.id === flagId)) {
		throw error(400, 'User does not have this flag');
	}

	const flag = await db.query.flags.findFirst({ where: { id: flagId } });

	if (!flag) {
		throw error(404, 'Flag not found');
	}

	if (!flag.showInSelect) {
		throw error(400, 'This flag cannot be removed on this page');
	}

	await db
		.delete(usersToFlags)
		.where(and(eq(usersToFlags.userId, user.cid), eq(usersToFlags.flagId, flag.id)));

	getUserAdminDetails(cid).refresh();

	return {
		message: 'Flag removed'
	};
});

const SoloEndorsementActionSchema = type({
	cid: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0'),
	id: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0')
});

export const extendSoloEndorsement = form(SoloEndorsementActionSchema, async ({ cid, id }) => {
	try {
		await getAuthorizedActioner();

		const user = await User.fromCid(db, cid, USER_FETCH_FULL);

		if (!user) {
			return { message: 'User not found', ok: false };
		}

		const endorsement = user.soloEndorsements.find((e) => e.id === id);

		if (!endorsement) {
			return { message: 'Endorsement not found', ok: false };
		}

		const now = new Date();
		const diff = endorsement.expiresAt.getTime() - now.getTime();
		const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

		if (diffDays > 7) {
			return { message: 'Must be within a week of expiration to extend', ok: false };
		}

		const expiresAt = new Date(endorsement.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);

		await db.update(soloEndorsements).set({ expiresAt }).where(eq(soloEndorsements.id, id));

		getUserAdminDetails(cid).refresh();

		return {
			message: 'Endorsement extended by 30 days',
			ok: true
		};
	} catch (err) {
		return { message: err instanceof Error ? err.message : 'An error occurred', ok: false };
	}
});

export const renewSoloEndorsement = form(SoloEndorsementActionSchema, async ({ cid, id }) => {
	try {
		await getAuthorizedActioner();

		const user = await User.fromCid(db, cid, USER_FETCH_FULL);

		if (!user) {
			return { message: 'User not found', ok: false };
		}

		if (!user.soloEndorsements.some((e) => e.id === id)) {
			return { message: 'Endorsement not found', ok: false };
		}

		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await db.update(soloEndorsements).set({ expiresAt }).where(eq(soloEndorsements.id, id));

		getUserAdminDetails(cid).refresh();

		return {
			message: 'Endorsement renewed',
			ok: true
		};
	} catch (err) {
		return { message: err instanceof Error ? err.message : 'An error occurred', ok: false };
	}
});

export const deleteSoloEndorsement = form(SoloEndorsementActionSchema, async ({ cid, id }) => {
	try {
		await getAuthorizedActioner();

		const user = await User.fromCid(db, cid, USER_FETCH_FULL);

		if (!user) {
			return { message: 'User not found', ok: false };
		}

		if (!user.soloEndorsements.some((e) => e.id === id)) {
			return { message: 'Endorsement not found', ok: false };
		}

		await db.delete(soloEndorsements).where(eq(soloEndorsements.id, id));

		getUserAdminDetails(cid).refresh();

		return {
			message: 'Endorsement revoked',
			ok: true
		};
	} catch (err) {
		return { message: err instanceof Error ? err.message : 'An error occurred', ok: false };
	}
});

const CreateSoloEndorsementSchema = type({
	'positions?': 'string',
	'position?': 'string',
	duration: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 1'),
	cid: type('string.integer')
		.pipe((v) => Number(v))
		.to('number.integer >= 0')
});

export const createSoloEndorsement = form(
	CreateSoloEndorsementSchema,
	async ({ positions: positionsRaw, position, duration, cid }) => {
		try {
			await getAuthorizedActioner();

			const user = await User.fromCid(db, cid, USER_FETCH_FULL);

			if (!user) {
				return { message: 'User not found', ok: false };
			}

			const callsigns = (positionsRaw ?? position ?? '')
				.split(/[\n,]+/)
				.map((value) => value.trim().toUpperCase())
				.filter(Boolean);

			if (callsigns.length < 1 || callsigns.length > 5) {
				return { message: 'Provide 1–5 callsigns', ok: false };
			}

			await grantSoloEndorsement(db, user.cid, callsigns, duration);

			getUserAdminDetails(cid).refresh();

			return {
				message: 'Endorsement created',
				ok: true
			};
		} catch (err) {
			return { message: err instanceof Error ? err.message : 'An error occurred', ok: false };
		}
	}
);

const SetActiveStatusSchema = type({
	cid: 'number.integer >= 0',
	status: '-1 | 0 | 1'
});

export const setUserActiveStatus = command(SetActiveStatusSchema, async ({ cid, status }) => {
	await getAuthorizedActioner();

	const user = await User.fromCid(db, cid, USER_FETCH_FULL);

	if (!user) {
		throw error(404, 'User not found');
	}

	await db.update(users).set({ active: status }).where(eq(users.cid, cid));

	getUserAdminDetails(cid).refresh();

	return {
		message: `User's active status set to ${status === 1 ? 'active' : status === -1 ? 'on leave' : 'inactive'}`,
		active: status
	};
});
