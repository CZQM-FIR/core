import { db } from '$lib/db';
import { enrolledUsers, roster, waitlists, type RosterPosition } from '@czqm/db/schema';
import { and, eq, inArray, ne } from 'drizzle-orm';

export const ROSTER_POSITIONS: RosterPosition[] = ['gnd', 'twr', 'app', 'ctr'];

const STATUS_NONE = -1;
const STATUS_TRAINING = 0;

/** Mark a controller in training for the given positions without downgrading solo/certified. */
export async function markUserInTraining(cid: number, positions: RosterPosition[]) {
	for (const position of new Set(positions)) {
		const existing = await db.query.roster.findFirst({
			where: { controllerId: cid, position }
		});

		if (!existing) {
			await db.insert(roster).values({ controllerId: cid, position, status: STATUS_TRAINING });
		} else if (existing.status === STATUS_NONE) {
			await db.update(roster).set({ status: STATUS_TRAINING }).where(eq(roster.id, existing.id));
		}
	}
}

/**
 * Clear in-training marks for the given positions (only if still in training), skipping positions
 * another active enrolment of the user also trains.
 */
export async function clearInTraining(
	cid: number,
	positions: RosterPosition[],
	excludeWaitlistId: number
) {
	if (positions.length === 0) return;

	const otherEnrolments = await db
		.select({ trainingPositions: waitlists.trainingPositions })
		.from(enrolledUsers)
		.innerJoin(waitlists, eq(waitlists.id, enrolledUsers.waitlistId))
		.where(and(eq(enrolledUsers.cid, cid), ne(enrolledUsers.waitlistId, excludeWaitlistId)));
	const stillTrained = new Set(otherEnrolments.flatMap((e) => e.trainingPositions ?? []));

	const toClear = positions.filter((p) => !stillTrained.has(p));
	if (toClear.length === 0) return;

	await db
		.update(roster)
		.set({ status: STATUS_NONE })
		.where(
			and(
				eq(roster.controllerId, cid),
				inArray(roster.position, toClear),
				eq(roster.status, STATUS_TRAINING)
			)
		);
}
