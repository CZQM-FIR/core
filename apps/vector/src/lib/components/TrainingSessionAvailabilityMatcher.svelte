<script lang="ts">
	import {
		AVAILABILITY_WINDOW_DAYS,
		DAY_START_HOUR,
		SLOT_MINUTES,
		SLOTS_PER_DAY,
		type AvailabilitySlot,
		getAvailabilityWindowEndsAt,
		getWindowStartDay,
		isAvailabilitySlotEnabled,
		keysToSlots,
		slotKey,
		slotStartDate,
		slotsToKeys
	} from '$lib/trainingSessionAvailability';
	import ScheduledSessionsList from '$lib/components/ScheduledSessionsList.svelte';
	import type { ScheduledSessionInWindow } from '$lib/remote/instructor.remote';
	import {
		formatScheduledSessionSummary,
		groupSessionsByVisibleDay,
		occupiedSlotKeys,
		sessionsBySlotKey,
		toOverlaySession
	} from '$lib/scheduledSessionOverlay';

	type MatcherStudent = {
		cid: number;
		slots: AvailabilitySlot[];
	};

	let {
		students,
		windowEndsAt,
		scheduledSessions = [],
		selectedSlots = $bindable([] as AvailabilitySlot[])
	}: {
		students: MatcherStudent[];
		windowEndsAt: Date;
		scheduledSessions?: ScheduledSessionInWindow[];
		selectedSlots?: AvailabilitySlot[];
	} = $props();

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const daysPerPage = 7;
	const pageCount = Math.ceil(AVAILABILITY_WINDOW_DAYS / daysPerPage);
	const slotIndices = Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) => slotIndex);

	let weekPage = $state(0);
	let selectedKeys = $state<Set<string>>(slotsToKeys(selectedSlots, getWindowStartDay()));
	let dragState = $state<{
		anchor: { dayIndex: number; slotIndex: number };
		current: { dayIndex: number; slotIndex: number };
		baseKeys: Set<string>;
		mode: 'select' | 'deselect';
	} | null>(null);

	const resolvedWindowEndsAt = $derived(windowEndsAt ?? getAvailabilityWindowEndsAt());
	const overlaySessions = $derived(scheduledSessions.map(toOverlaySession));
	const occupiedKeys = $derived(occupiedSlotKeys(overlaySessions, getWindowStartDay()));
	const sessionsByKey = $derived(sessionsBySlotKey(overlaySessions, getWindowStartDay()));

	const heatmapCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		const windowStartDay = getWindowStartDay();
		for (const student of students) {
			for (const key of slotsToKeys(student.slots, windowStartDay)) {
				counts[key] = (counts[key] ?? 0) + 1;
			}
		}
		return counts;
	});

	const maxCount = $derived(Math.max(0, ...Object.values(heatmapCounts)));

	function dayFromIndex(windowStartDay: Date, dayIndex: number): Date {
		return new Date(
			windowStartDay.getFullYear(),
			windowStartDay.getMonth(),
			windowStartDay.getDate() + dayIndex
		);
	}

	function getVisibleDays(): { day: Date; dayIndex: number }[] {
		const start = getWindowStartDay();
		const pageStart = weekPage * daysPerPage;
		return Array.from({ length: daysPerPage }, (_, offset) => {
			const dayIndex = pageStart + offset;
			if (dayIndex >= AVAILABILITY_WINDOW_DAYS) return null;
			return { day: dayFromIndex(start, dayIndex), dayIndex };
		}).filter((entry): entry is { day: Date; dayIndex: number } => entry !== null);
	}

	function formatWeekRange(days: { day: Date }[]): string {
		if (days.length === 0) return '';
		const first = days[0].day.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
		const last = days[days.length - 1].day.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
		return first === last ? first : `${first} – ${last}`;
	}

	function formatSlotLabel(slotIndex: number): string {
		const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
		const hour = Math.floor(minutesFromMidnight / 60);
		const minute = minutesFromMidnight % 60;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}

	function isHourBoundary(slotIndex: number): boolean {
		const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
		return minutesFromMidnight % 60 === 0;
	}

	function formatHourLabel(slotIndex: number): string {
		const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
		const hour = Math.floor(minutesFromMidnight / 60);
		return `${String(hour).padStart(2, '0')}:00`;
	}

	function formatDayHeader(day: Date): string {
		return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function commitSelection(next: Set<string>) {
		selectedKeys = next;
		selectedSlots = keysToSlots(next, getWindowStartDay());
	}

	function getRangeKeys(
		anchor: { dayIndex: number; slotIndex: number },
		current: { dayIndex: number; slotIndex: number }
	): string[] {
		const windowStartDay = getWindowStartDay();
		const keys: string[] = [];
		const minDay = Math.min(anchor.dayIndex, current.dayIndex);
		const maxDay = Math.max(anchor.dayIndex, current.dayIndex);
		const minSlot = Math.min(anchor.slotIndex, current.slotIndex);
		const maxSlot = Math.max(anchor.slotIndex, current.slotIndex);

		for (let dayIndex = minDay; dayIndex <= maxDay; dayIndex++) {
			const day = dayFromIndex(windowStartDay, dayIndex);
			for (let slotIndex = minSlot; slotIndex <= maxSlot; slotIndex++) {
				if (isAvailabilitySlotEnabled(slotStartDate(day, slotIndex), resolvedWindowEndsAt)) {
					keys.push(slotKey(dayIndex, slotIndex));
				}
			}
		}

		return keys;
	}

	function applyDragSelection(
		baseKeys: Set<string>,
		anchor: { dayIndex: number; slotIndex: number },
		current: { dayIndex: number; slotIndex: number },
		dragMode: 'select' | 'deselect'
	): Set<string> {
		const range = getRangeKeys(anchor, current);
		if (dragMode === 'select') {
			return new Set([...baseKeys, ...range]);
		}
		const drop = new Set(range);
		return new Set([...baseKeys].filter((key) => !drop.has(key)));
	}

	function endDrag() {
		dragState = null;
	}

	function beginDrag(dayIndex: number, slotIndex: number, day: Date) {
		const start = slotStartDate(day, slotIndex);
		if (!isAvailabilitySlotEnabled(start, resolvedWindowEndsAt)) return;

		const key = slotKey(dayIndex, slotIndex);
		const anchor = { dayIndex, slotIndex };
		const dragMode = selectedKeys.has(key) ? 'deselect' : 'select';
		const baseKeys = new Set(selectedKeys);

		dragState = { anchor, current: anchor, baseKeys, mode: dragMode };
		commitSelection(applyDragSelection(baseKeys, anchor, anchor, dragMode));
	}

	function updateDrag(dayIndex: number, slotIndex: number) {
		if (!dragState) return;

		if (dragState.current.dayIndex === dayIndex && dragState.current.slotIndex === slotIndex) {
			return;
		}

		const current = { dayIndex, slotIndex };
		dragState = { ...dragState, current };
		commitSelection(
			applyDragSelection(dragState.baseKeys, dragState.anchor, current, dragState.mode)
		);
	}

	function clearSelection() {
		commitSelection(new Set());
	}

	function getSlotClass(dayIndex: number, slotIndex: number, enabled: boolean) {
		const key = slotKey(dayIndex, slotIndex);
		const occupied = occupiedKeys.has(key);
		if (!enabled) return 'bg-base-100 cursor-not-allowed opacity-30';
		if (selectedKeys.has(key)) {
			return ['bg-accent text-accent-content', occupied && 'training-session-occupied-slot'];
		}
		if (occupied && (heatmapCounts[key] ?? 0) === 0) {
			return 'training-session-occupied-slot bg-warning/50 cursor-pointer hover:bg-warning/60';
		}
		if (occupied) return 'training-session-occupied-slot cursor-pointer hover:brightness-95';
		if ((heatmapCounts[key] ?? 0) === 0) return 'bg-base-100 hover:bg-base-300 cursor-pointer';
		return 'cursor-pointer hover:brightness-95';
	}

	function getHeatmapColor(
		dayIndex: number,
		slotIndex: number,
		enabled: boolean
	): string | undefined {
		const key = slotKey(dayIndex, slotIndex);
		if (selectedKeys.has(key) || !enabled || maxCount === 0) return undefined;
		const count = heatmapCounts[key] ?? 0;
		if (count === 0) return undefined;
		const pct = Math.round(20 + (count / maxCount) * 80);
		return `color-mix(in oklab, var(--color-primary) ${pct}%, var(--color-base-100))`;
	}

	function slotOccupancyLabel(dayIndex: number, slotIndex: number): string {
		const sessions = sessionsByKey.get(slotKey(dayIndex, slotIndex)) ?? [];
		if (sessions.length === 0) return '';
		return sessions.map(formatScheduledSessionSummary).join('; ');
	}

	const visibleDays = $derived(getVisibleDays());
	const weekRangeLabel = $derived(formatWeekRange(visibleDays));
	const visibleScheduledGroups = $derived(groupSessionsByVisibleDay(overlaySessions, visibleDays));
</script>

<svelte:window onpointerup={endDrag} onpointercancel={endDrag} />

<div class="card bg-base-200 w-full shadow-sm">
	<div class="card-body gap-3">
		<div>
			<h2 class="card-title text-lg">Your availability</h2>
			<p class="text-sm opacity-70">
				Times shown in your local timezone ({timeZone}).
			</p>
			<p class="text-sm opacity-70">
				Shaded intensity shows how many listed students are free. Striped slots are other scheduled
				sessions. Drag to highlight your free times.
			</p>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2">
			<button
				type="button"
				class="btn btn-outline btn-sm"
				disabled={weekPage === 0}
				onclick={() => (weekPage -= 1)}
			>
				This week
			</button>
			<span class="text-sm font-medium">{weekRangeLabel}</span>
			<button
				type="button"
				class="btn btn-outline btn-sm"
				disabled={weekPage >= pageCount - 1}
				onclick={() => (weekPage += 1)}
			>
				Next week
			</button>
		</div>

		<div class="flex flex-wrap gap-3 text-[11px] opacity-80">
			<span class="flex items-center gap-1">
				<span class="bg-primary/40 inline-block h-3 w-3 rounded-sm"></span>
				Student availability
			</span>
			<span class="flex items-center gap-1">
				<span class="bg-accent inline-block h-3 w-3 rounded-sm"></span>
				Your selection
			</span>
			<span class="flex items-center gap-1">
				<span class="training-session-occupied-slot bg-warning/50 inline-block h-3 w-3 rounded-sm"
				></span>
				Other scheduled sessions
			</span>
		</div>

		<div class="overflow-x-auto overflow-y-auto">
			<div
				class="bg-base-300 grid min-w-max touch-none gap-px {dragState ? 'select-none' : ''}"
				style="grid-template-columns: 2.25rem repeat({visibleDays.length}, minmax(2.25rem, 1fr));"
			>
				<div class="bg-base-200 sticky top-0 left-0 z-20"></div>
				{#each visibleDays as { day, dayIndex } (`${dayIndex}-${day.toISOString()}`)}
					<div
						class="bg-base-200 sticky top-0 z-10 px-0.5 py-1 text-center text-[10px] leading-tight font-semibold"
					>
						{formatDayHeader(day)}
					</div>
				{/each}

				{#each slotIndices as slotIndex (slotIndex)}
					<div
						class="bg-base-200 sticky left-0 z-10 px-0.5 text-right text-[9px] leading-none opacity-70"
					>
						{#if isHourBoundary(slotIndex)}
							{formatHourLabel(slotIndex)}
						{/if}
					</div>
					{#each visibleDays as { day, dayIndex } (`${dayIndex}-${slotIndex}`)}
						{@const start = slotStartDate(day, slotIndex)}
						{@const enabled = isAvailabilitySlotEnabled(start, resolvedWindowEndsAt)}
						{@const selected = selectedKeys.has(slotKey(dayIndex, slotIndex))}
						{@const occupancy = slotOccupancyLabel(dayIndex, slotIndex)}
						<button
							type="button"
							class={[
								'h-3 min-h-3 border-0 p-0 transition-colors',
								getSlotClass(dayIndex, slotIndex, enabled)
							]}
							style:background-color={getHeatmapColor(dayIndex, slotIndex, enabled)}
							tabindex={enabled ? 0 : -1}
							title={occupancy || undefined}
							aria-disabled={!enabled}
							aria-label="{formatDayHeader(day)} {formatSlotLabel(slotIndex)}{occupancy
								? ` · ${occupancy}`
								: ''}"
							aria-pressed={selected}
							onpointerdown={(event) => {
								if (!enabled) return;
								event.preventDefault();
								beginDrag(dayIndex, slotIndex, day);
							}}
							onpointerenter={() => updateDrag(dayIndex, slotIndex)}
						></button>
					{/each}
				{/each}
			</div>
		</div>

		<ScheduledSessionsList groups={visibleScheduledGroups} />

		{#if selectedKeys.size > 0}
			<div class="flex flex-wrap items-center gap-3">
				<button type="button" class="btn btn-outline btn-sm" onclick={clearSelection}>
					Clear selection
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.training-session-occupied-slot) {
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 2px,
			rgb(245 158 11 / 0.55) 2px,
			rgb(245 158 11 / 0.55) 4px
		);
	}
</style>
