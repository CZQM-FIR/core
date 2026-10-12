<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageProps } from './$types';
  import type { BookingFacility } from '@czqm/db/schema';
  import { onMount } from 'svelte';
  import { CalendarDays, Clock, Hourglass, UserCheck, UserX } from '@lucide/svelte';

  let { data, form }: PageProps = $props();

  // 45 minutes to 4 hours, in 15/30 minute steps (matches the booking policy limits).
  const DURATION_MINUTES = [45, 60, 90, 120, 150, 180, 210, 240];
  let durationMinutes = $state(60);
  // `datetime-local` value (local time), e.g. "2026-10-12T14:00".
  let startsAtLocal = $state('');

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (rest > 0) parts.push(`${rest} minutes`);
    return parts.join(' ');
  }

  function formatLocalEnd(start: Date, minutes: number): string {
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    const time = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const sameDay = end.toDateString() === start.toDateString();
    if (sameDay) return time;
    return `${end.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  }

  // Each option shows when the booking would end for the chosen start time.
  const durationOptions = $derived.by(() => {
    const start = startsAtLocal ? new Date(startsAtLocal) : null;
    const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
    return DURATION_MINUTES.map((minutes) => ({
      minutes,
      label: validStart
        ? `${formatDuration(minutes)} (ends ${formatLocalEnd(validStart, minutes)})`
        : formatDuration(minutes)
    }));
  });

  // Resolved on the client so the label shows the user's own timezone.
  let timeZone = $state('');
  // Earliest selectable start (now + 1h, local time) as a `datetime-local` value.
  let minStart = $state('');

  // Latest selectable start (now + policy max advance, local time).
  let maxStart = $state('');

  function toLocalInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function computeMinStart(): string {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    // Round up to the next whole minute so the value is never earlier than now + 1h.
    if (d.getSeconds() > 0 || d.getMilliseconds() > 0) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return toLocalInputValue(d);
  }

  function computeMaxStart(): string {
    if (data.maxAdvanceMs == null) return '';
    // Round down so the value is never later than now + max advance.
    const d = new Date(Date.now() + data.maxAdvanceMs);
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  }

  function refreshLimits() {
    minStart = computeMinStart();
    maxStart = computeMaxStart();
  }

  onMount(() => {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    refreshLimits();
    const interval = setInterval(refreshLimits, 30_000);
    return () => clearInterval(interval);
  });

  const facilityLabels: Record<BookingFacility, string> = {
    live: 'VATSIM',
    sweatbox: 'Sweatbox',
    sweatbox2: 'Sweatbox 2',
  };

  function formatUtcRange(start: Date | string, end: Date | string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const datePart = startDate.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
    return `${datePart} ${startTime}z – ${endTime}z`;
  }

  // Self-bookings are always live-network; sweatbox bookings are created from Vector.
  const bookingFacility = $derived<BookingFacility>(data.allowedFacilities[0] ?? 'live');

  const formMessage = $derived(
    form && typeof form === 'object' && 'message' in form
      ? String((form as { message?: string }).message ?? '')
      : '',
  );
  const formOk = $derived(
    form && typeof form === 'object' && 'ok' in form
      ? Boolean((form as { ok?: boolean }).ok)
      : false,
  );
</script>

<div class="mb-12">
    <h2 class="text-xl font-semibold">Position Bookings</h2>
    <div class="divider mt-1"></div>
    <ul class="mb-6 flex max-w-3xl flex-col gap-2 text-sm text-gray-300">
      <li class="flex items-center gap-2">
        <Clock size="16" class="shrink-0" /> Book at least 1 hour in advance
      </li>
      <li class="flex items-center gap-2">
        <CalendarDays size="16" class="shrink-0" /> Book up to 3 days ahead
      </li>
      <li class="flex items-center gap-2">
        <Hourglass size="16" class="shrink-0" /> Bookings must be 45 minutes to 4 hours long (max 2
        hours during Moncton Monday)
      </li>
      <li class="flex items-center gap-2">
        <UserCheck size="16" class="shrink-0" /> Only positions you're certified or solo endorsed for
      </li>
      <li class="flex items-center gap-2">
        <Hourglass size="16" class="shrink-0" /> Up to 8 hours booked in any rolling 24 hours
      </li>
      <li class="flex items-center gap-2">
        <UserX size="16" class="shrink-0" /> Bookings are forfeited if you aren't online within 10
        minutes of the start time
      </li>
    </ul>

    {#if data.canBook}
      <div class="bg-base-300 mb-8 max-w-xl rounded-lg p-5">
        <h2 class="text-lg font-semibold">New booking</h2>
        <p class="mt-1 text-sm text-gray-300">Booking for CID {data.actorCid}</p>
        <form
          method="post"
          action="?/create"
          class="mt-4 flex flex-col gap-3"
          use:enhance={({ formData }) => {
            // The start input is in the user's local time; send an absolute UTC instant.
            const value = formData.get('startsAt');
            if (typeof value === 'string' && value) {
              const date = new Date(value);
              if (!Number.isNaN(date.getTime())) {
                formData.set('startsAt', date.toISOString());
              }
            }

            return async ({ result }) => {
              await applyAction(result);
              if (result.type === 'success') {
                await invalidateAll();
              }
            };
          }}
        >
          <label class="form-control w-full">
            <span class="label-text">Position</span>
            <input
              class="input input-bordered w-full uppercase"
              type="text"
              name="callsign"
              list="booking-positions"
              placeholder="e.g. CZQM_CTR"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              required
            />
            <datalist id="booking-positions">
              {#each data.positions as position (position.callsign)}
                <option value={position.callsign}></option>
              {/each}
            </datalist>
          </label>

          <input type="hidden" name="facility" value={bookingFacility} />

          <label class="form-control w-full">
            <span class="label-text">
              Start
              {#if timeZone}<span class="text-gray-400">({timeZone})</span>{/if}
            </span>
            <input
              class="input input-bordered w-full"
              type="datetime-local"
              name="startsAt"
              bind:value={startsAtLocal}
              min={minStart || undefined}
              max={maxStart || undefined}
              required
            />
          </label>
          <label class="form-control w-full">
            <span class="label-text">Duration</span>
            <select
              class="select select-bordered w-full"
              name="durationMinutes"
              bind:value={durationMinutes}
              required
            >
              {#each durationOptions as option (option.minutes)}
                <option value={option.minutes}>{option.label}</option>
              {/each}
            </select>
          </label>

          <div class="flex flex-row flex-wrap items-center gap-3">
            <button type="submit" class="btn btn-primary btn-outline">Create booking</button>
            {#if form}
              <p class="text-sm {formOk ? 'text-success' : 'text-error'}">
                {formOk ? '' : 'Error: '}{formMessage}
              </p>
            {/if}
          </div>
        </form>
      </div>
    {:else}
      <div class="bg-base-300 mb-8 max-w-xl rounded-lg p-5">
        <p class="text-sm">
          Your account cannot create position bookings. Only controllers, visitors, and training
          staff may book positions.
        </p>
      </div>
    {/if}

    <h2 class="text-xl font-semibold">Upcoming bookings</h2>
    <div class="divider"></div>

    {#if data.bookings.length === 0}
      <p class="p-4 text-center">No upcoming active bookings.</p>
    {:else}
      <table class="table-zebra table">
        <thead>
          <tr>
            <th>Callsign</th>
            <th>CID</th>
            <th>When (UTC)</th>
            <th>Network</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.bookings as booking (booking.id)}
            <tr>
              <td class="font-medium">{booking.callsign}</td>
              <td>
                <a class="hover:link" href="/controller/{booking.cid}">{booking.cid}</a>
              </td>
              <td>{formatUtcRange(booking.startsAt, booking.endsAt)}</td>
              <td>
                <span class="badge badge-neutral">{facilityLabels[booking.facility]}</span>
              </td>
              <td>
                {#if booking.canCancel}
                  <form
                    method="post"
                    action="?/cancel"
                    use:enhance={() => {
                      return async ({ result }) => {
                        await applyAction(result);
                        if (result.type === 'success') {
                          await invalidateAll();
                        }
                      };
                    }}
                  >
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" class="btn btn-error btn-outline btn-sm">Cancel</button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
</div>
