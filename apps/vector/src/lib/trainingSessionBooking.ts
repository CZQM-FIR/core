import { Booking, TrainingSession, User, type DB } from '@czqm/common';
import { BOOKING_FACILITIES, type BookingFacility } from '@czqm/db/schema';

export type VectorBookingEnv = {
	VATSIM_BOOKINGS_API_TOKEN: string;
};

export function vectorBookingEnv(token: string): VectorBookingEnv {
	return { VATSIM_BOOKINGS_API_TOKEN: token };
}

export function parseBookingFacility(value: string): BookingFacility | null {
	const normalized = value.trim().toLowerCase();
	if ((BOOKING_FACILITIES as readonly string[]).includes(normalized)) {
		return normalized as BookingFacility;
	}
	return null;
}

/** Live: student on the network calendar; sweatbox: instructor (scheduler). */
export function bookedCidForTrainingSession(
	facility: BookingFacility,
	studentCid: number,
	schedulerCid: number
): number {
	if (facility === 'live') return studentCid;
	return schedulerCid;
}

export async function createLinkedBookingForSession(
	db: DB,
	env: VectorBookingEnv,
	input: {
		actor: User;
		sessionId: number;
		studentCid: number;
		schedulerCid: number;
		callsign: string;
		facility: BookingFacility;
		startsAt: Date;
		endsAt: Date;
	}
): Promise<void> {
	await Booking.create(db, env, {
		actor: input.actor,
		cid: bookedCidForTrainingSession(input.facility, input.studentCid, input.schedulerCid),
		callsign: input.callsign,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		facility: input.facility,
		trainingSessionId: input.sessionId,
		intent: { linkedTraining: true }
	});
}

export type LinkedBookingTimes = { startsAt: Date; endsAt: Date };

/**
 * Update linked booking times. Throws if the booking exists but cannot be updated
 * (so callers can avoid committing a session reschedule). Returns the previous
 * times so the caller can roll back, or null when there is no active linked booking.
 */
export async function updateLinkedBookingTimesForSession(
	db: DB,
	env: VectorBookingEnv,
	trainingSessionId: number,
	startsAt: Date,
	endsAt: Date
): Promise<LinkedBookingTimes | null> {
	const booking = await Booking.fetchByTrainingSessionId(db, env, trainingSessionId);
	if (!booking || booking.row.status !== 'active') return null;

	const previous = { startsAt: booking.row.startsAt, endsAt: booking.row.endsAt };
	const actor = await requireBookingCancelActor(db, booking.row.createdByCid);
	await booking.update({
		actor,
		startsAt,
		endsAt
	});
	return previous;
}

/** Roll the linked booking back to previous times; logs instead of throwing. */
export async function restoreLinkedBookingTimesForSession(
	db: DB,
	env: VectorBookingEnv,
	trainingSessionId: number,
	previous: LinkedBookingTimes
): Promise<void> {
	try {
		const booking = await Booking.fetchByTrainingSessionId(db, env, trainingSessionId);
		if (!booking || booking.row.status !== 'active') return;
		await booking.restoreTimes(previous.startsAt, previous.endsAt);
	} catch (err) {
		console.error('Failed to restore linked position booking times', {
			trainingSessionId,
			err
		});
	}
}

export async function cancelLinkedBookingForSession(
	db: DB,
	env: VectorBookingEnv,
	trainingSessionId: number
): Promise<void> {
	const booking = await Booking.fetchByTrainingSessionId(db, env, trainingSessionId);
	if (!booking || booking.row.status !== 'active') return;

	const actor = await requireBookingCancelActor(db, booking.row.createdByCid);
	await booking.cancel({ actor });
}

/**
 * Best-effort cancel used after the session itself is already cancelled/declined.
 * Failures are logged; the worker reconciles any booking left active.
 */
export async function tryCancelLinkedBookingForSession(
	db: DB,
	token: string | undefined,
	trainingSessionId: number
): Promise<void> {
	if (!token) {
		console.error('Skipping linked booking cancel: VATSIM_BOOKINGS_API_TOKEN is not configured', {
			trainingSessionId
		});
		return;
	}
	try {
		await cancelLinkedBookingForSession(db, vectorBookingEnv(token), trainingSessionId);
	} catch (err) {
		console.error('Failed to cancel linked position booking', { trainingSessionId, err });
	}
}

async function requireBookingCancelActor(db: DB, cid: number): Promise<User> {
	const actor = await User.fromCid(db, cid);
	if (!actor) {
		throw new Error('Booking owner not found');
	}
	return actor;
}

export async function rollbackPendingSessionAfterBookingFailure(
	db: DB,
	sessionId: number,
	schedulerCid: number
): Promise<void> {
	try {
		await TrainingSession.cancel(db, sessionId, schedulerCid);
	} catch (cleanupError) {
		console.error('Failed to roll back training session after booking error', {
			sessionId,
			cleanupError
		});
	}
}
