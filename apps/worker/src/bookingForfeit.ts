import { Booking, type DB, type Env } from '@czqm/common';
import { policyForKind } from '@czqm/common/bookings';
import { fetchVatsimOnlineControllers } from './vatsimData.js';

function normalizeCallsign(callsign: string): string {
  return callsign.trim().toUpperCase();
}

function isBookedControllerOnline(
  controllers: { cid: number; callsign: string }[],
  cid: number,
  callsign: string,
): boolean {
  const normalized = normalizeCallsign(callsign);
  return controllers.some(
    (c) => c.cid === cid && normalizeCallsign(c.callsign) === normalized,
  );
}

/**
 * Cancel bookings left active after their training session was cancelled/declined
 * (e.g. the VATSIM API was unreachable when the session was cancelled).
 */
async function reconcileClosedTrainingBookings(db: DB, env: Env): Promise<void> {
  const rows = await Booking.fetchActiveForClosedTrainingSessions(db);
  for (const row of rows) {
    const booking = await Booking.fetchById(db, env, row.id);
    if (!booking) continue;
    try {
      await booking.cancelBySystem();
      console.log(
        `Cancelled booking ${row.id} (training session ${row.trainingSessionId} is closed).`,
      );
    } catch (error) {
      console.error(`Failed to cancel booking ${row.id} for closed session:`, error);
    }
  }
}

export async function handleBookingForfeits(db: DB, env: Env): Promise<void> {
  const now = new Date();

  try {
    await reconcileClosedTrainingBookings(db, env);
  } catch (error) {
    console.error('Failed to reconcile bookings for closed training sessions:', error);
  }

  let controllers: { cid: number; callsign: string }[];
  try {
    controllers = await fetchVatsimOnlineControllers();
  } catch (error) {
    console.error(
      'Skipping booking forfeit check: failed to fetch VATSIM live data',
      error,
    );
    return;
  }

  // Empty feed is suspicious (outage / parse failure) — do not mass-forfeit.
  if (controllers.length === 0) {
    console.warn(
      'Skipping booking forfeit check: VATSIM live data returned no controllers',
    );
    return;
  }

  // Only consider bookings that have started and not yet ended.
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await Booking.fetchActiveInRange(db, windowStart, now);

  const liveCandidates = rows.filter((row) => {
    if (row.facility !== 'live') return false;
    if (row.checkedInAt != null) return false;
    if (row.startsAt.getTime() > now.getTime()) return false;

    const graceMinutes = policyForKind(row.policyKind).graceMinutes;
    const graceDeadline = row.startsAt.getTime() + graceMinutes * 60 * 1000;
    return now.getTime() >= graceDeadline;
  });

  console.log(
    `Booking forfeit check: ${liveCandidates.length} live booking(s) past grace without check-in (${controllers.length} controllers online).`,
  );

  // Mark check-in for any active live booking (including those still in grace)
  // where the controller is currently online on the booked callsign.
  const activeLive = rows.filter(
    (row) =>
      row.facility === 'live' &&
      row.checkedInAt == null &&
      row.startsAt.getTime() <= now.getTime() &&
      row.endsAt.getTime() > now.getTime(),
  );

  for (const row of activeLive) {
    if (!isBookedControllerOnline(controllers, row.cid, row.callsign)) {
      continue;
    }
    const booking = await Booking.fetchById(db, env, row.id);
    if (!booking) continue;
    try {
      await booking.markCheckedIn(now);
      console.log(
        `Checked in booking ${row.id}: CID ${row.cid} on ${row.callsign}.`,
      );
    } catch (error) {
      console.error(`Failed to check in booking ${row.id}:`, error);
    }
  }

  for (const row of liveCandidates) {
    // Re-fetch in case we just marked check-in above.
    const booking = await Booking.fetchById(db, env, row.id);
    if (!booking || booking.row.checkedInAt != null) {
      continue;
    }
    if (isBookedControllerOnline(controllers, row.cid, row.callsign)) {
      try {
        await booking.markCheckedIn(now);
      } catch (error) {
        console.error(`Failed to check in booking ${row.id}:`, error);
      }
      continue;
    }

    try {
      await booking.forfeit();
      console.log(
        `Forfeited booking ${row.id}: CID ${row.cid} on ${row.callsign} (policy ${row.policyKind}).`,
      );
    } catch (error) {
      console.error(`Failed to forfeit booking ${row.id}:`, error);
    }
  }
}
