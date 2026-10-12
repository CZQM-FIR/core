import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import env from '$lib/env';
import { Booking, BookingPolicyFactory, User, canCancelBooking } from '@czqm/common';
import { BOOKING_FACILITIES, type BookingFacility, positions } from '@czqm/db/schema';
import { asc } from 'drizzle-orm';

const bookingEnv = {
  VATSIM_BOOKINGS_API_TOKEN: env.VATSIM_BOOKINGS_API_TOKEN
};

function parseUtcDatetime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isBookingFacility(value: string): value is BookingFacility {
  return (BOOKING_FACILITIES as readonly string[]).includes(value);
}

export const load = (async ({ locals }) => {
  const rows = await Booking.fetchUpcomingActive(db);
  const positionRows = await db
    .select({
      callsign: positions.callsign,
      name: positions.name,
      frequency: positions.frequency
    })
    .from(positions)
    .orderBy(asc(positions.callsign));

  // Autocomplete suggestions skip positions whose name is blank, "UNKN", or the same as the
  // callsign. Any valid callsign can still be typed in manually.
  const namedPositions = positionRows.filter((position) => {
    const name = position.name.trim().toUpperCase();
    const callsign = position.callsign.trim().toUpperCase();
    return name.length > 0 && name !== 'UNKN' && callsign !== 'UNKN' && name !== callsign;
  });

  let actor: User | null = null;
  let canBook = false;
  let allowedFacilities: BookingFacility[] = [];
  let maxAdvanceMs: number | null = null;

  if (locals.user) {
    actor = await User.fromCid(db, locals.user.cid, { roster: true, soloEndorsements: true });
    if (actor) {
      try {
        const policy = BookingPolicyFactory.forActor(actor);
        canBook = true;
        allowedFacilities = [...policy.allowedFacilities];
        maxAdvanceMs = policy.maxAdvanceMs;
      } catch {
        canBook = false;
      }
    }
  }

  // Only suggest positions the user is certified or solo-endorsed for.
  const bookablePositions = actor
    ? namedPositions.filter((position) => actor!.isQualifiedForPosition(position.callsign))
    : [];

  const bookings = rows.map((row) => ({
    ...Booking.toPublicSummary(row),
    canCancel: actor ? canCancelBooking(actor, row) : false
  }));

  return {
    bookings,
    positions: bookablePositions,
    canBook,
    allowedFacilities,
    maxAdvanceMs,
    actorCid: actor?.cid ?? null
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  create: async (event) => {
    const { locals } = event;
    if (!locals.user) {
      return fail(401, { ok: false, message: 'You must be logged in to create a booking' });
    }

    const actor = await User.fromCid(db, locals.user.cid);
    if (!actor) {
      return fail(401, { ok: false, message: 'User not found' });
    }

    const data = await event.request.formData();
    const callsign = (data.get('callsign') ?? '').toString();
    const facilityRaw = (data.get('facility') ?? 'live').toString();
    const startsRaw = (data.get('startsAt') ?? '').toString();
    const durationRaw = Number(data.get('durationMinutes'));

    if (!isBookingFacility(facilityRaw)) {
      return fail(400, { ok: false, message: 'Invalid facility' });
    }

    const startsAt = parseUtcDatetime(startsRaw);
    if (!startsAt) {
      return fail(400, { ok: false, message: 'Invalid start time' });
    }
    if (!Number.isInteger(durationRaw) || durationRaw <= 0) {
      return fail(400, { ok: false, message: 'Invalid duration' });
    }
    // Policy limits (45 min minimum, 4h / 2h maximum) are enforced by Booking.create.
    const endsAt = new Date(startsAt.getTime() + durationRaw * 60 * 1000);

    try {
      await Booking.create(db, bookingEnv, {
        actor,
        cid: actor.cid,
        callsign,
        startsAt,
        endsAt,
        facility: facilityRaw
      });
      return { ok: true, message: 'Booking created' };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create booking';
      return fail(400, { ok: false, message });
    }
  },

  cancel: async (event) => {
    const { locals } = event;
    if (!locals.user) {
      return fail(401, { ok: false, message: 'You must be logged in to cancel a booking' });
    }

    const actor = await User.fromCid(db, locals.user.cid);
    if (!actor) {
      return fail(401, { ok: false, message: 'User not found' });
    }

    const data = await event.request.formData();
    const bookingId = Number(data.get('bookingId'));
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return fail(400, { ok: false, message: 'Invalid booking' });
    }

    const booking = await Booking.fetchById(db, bookingEnv, bookingId);
    if (!booking) {
      return fail(404, { ok: false, message: 'Booking not found' });
    }

    try {
      await booking.cancel({ actor });
      return { ok: true, message: 'Booking cancelled' };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to cancel booking';
      return fail(400, { ok: false, message });
    }
  }
};
