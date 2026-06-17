<script lang="ts">
	import {
		AVAILABILITY_WINDOW_DAYS,
		DAY_END_HOUR,
		DAY_START_HOUR,
		SLOT_MINUTES,
		SLOT_MS,
		getAvailabilityWindowEndsAt
	} from '$lib/trainingSessionAvailability';
	import {
		getInstructorStudentSessionAvailability
	} from '$lib/remote/instructor.remote';
	import {
		getTrainingSessionAvailability,
		saveTrainingSessionAvailability
	} from '$lib/remote/student.remote';

	let {
		courseId,
		taskId,
		cid,
		readOnly = false,
		sessionDescription = ''
	}: {
		courseId: string;
		taskId: number;
		cid?: number;
		readOnly?: boolean;
		sessionDescription?: string;
	} = $props();

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const slotsPerDay = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
	const daysPerPage = 7;
	const pageCount = Math.ceil(AVAILABILITY_WINDOW_DAYS / daysPerPage);

	let weekPage = $state(0);
	let selectedKeys = $state<Set<string>>(new Set());
	let windowEndsAt = $state<Date>(getAvailabilityWindowEndsAt());
	let loading = $state(true);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let loadError = $state<string | null>(null);
	let dragState = $state<{
		anchor: { dayIndex: number; slotIndex: number };
		current: { dayIndex: number; slotIndex: number };
		baseKeys: Set<string>;
		mode: 'select' | 'deselect';
	} | null>(null);

	function getWindowStartDay(): Date {
		const day = new Date();
		day.setHours(0, 0, 0, 0);
		return day;
	}

	function getVisibleDays(): { day: Date; dayIndex: number }[] {
		const start = getWindowStartDay();
		const pageStart = weekPage * daysPerPage;
		return Array.from({ length: daysPerPage }, (_, offset) => {
			const dayIndex = pageStart + offset;
			if (dayIndex >= AVAILABILITY_WINDOW_DAYS) return null;
			const day = new Date(start);
			day.setDate(day.getDate() + dayIndex);
			return { day, dayIndex };
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

	function slotStartDate(day: Date, slotIndex: number): Date {
		const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
		const hour = Math.floor(minutesFromMidnight / 60);
		const minute = minutesFromMidnight % 60;
		return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
	}

	function slotKey(dayIndex: number, slotIndex: number): string {
		return `${dayIndex}-${slotIndex}`;
	}

	function dateToSlotKey(date: Date, windowStartDay: Date): string | null {
		const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const dayIndex = Math.round(
			(dayStart.getTime() - windowStartDay.getTime()) / (24 * 60 * 60 * 1000)
		);
		if (dayIndex < 0 || dayIndex >= AVAILABILITY_WINDOW_DAYS) return null;

		const slotIndex = (date.getHours() * 60 + date.getMinutes()) / SLOT_MINUTES;
		if (slotIndex < 0 || slotIndex >= slotsPerDay) return null;

		return slotKey(dayIndex, slotIndex);
	}

	function loadSlotsToSelected(
		slots: { startsAt: Date; endsAt: Date }[],
		windowStartDay: Date
	): Set<string> {
		const selected = new Set<string>();
		for (const slot of slots) {
			let current = new Date(slot.startsAt);
			while (current < slot.endsAt) {
				const key = dateToSlotKey(current, windowStartDay);
				if (key) selected.add(key);
				current = new Date(current.getTime() + SLOT_MS);
			}
		}
		return selected;
	}

	function selectedKeysToSlots(
		selected: Set<string>,
		windowStartDay: Date
	): { startsAt: string; endsAt: string }[] {
		const byDay = new Map<number, number[]>();

		for (const key of selected) {
			const [dayStr, slotStr] = key.split('-');
			const dayIndex = Number(dayStr);
			const slotIndex = Number(slotStr);
			if (!Number.isFinite(dayIndex) || !Number.isFinite(slotIndex)) continue;

			const indices = byDay.get(dayIndex) ?? [];
			indices.push(slotIndex);
			byDay.set(dayIndex, indices);
		}

		const result: { startsAt: string; endsAt: string }[] = [];

		for (const [dayIndex, slotIndices] of byDay) {
			slotIndices.sort((a, b) => a - b);
			const day = new Date(windowStartDay);
			day.setDate(day.getDate() + dayIndex);

			let rangeStart = slotIndices[0];
			let rangeEnd = slotIndices[0];

			for (let i = 1; i <= slotIndices.length; i++) {
				const current = slotIndices[i];
				if (current === rangeEnd + 1) {
					rangeEnd = current;
					continue;
				}

				const startsAt = slotStartDate(day, rangeStart);
				const endsAt = new Date(slotStartDate(day, rangeEnd).getTime() + SLOT_MS);
				result.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });

				if (current !== undefined) {
					rangeStart = current;
					rangeEnd = current;
				}
			}
		}

		return result.sort(
			(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
		);
	}

	function isSlotEnabled(start: Date): boolean {
		const now = new Date();
		const end = new Date(start.getTime() + SLOT_MS);
		return start >= now && end <= windowEndsAt;
	}

	function formatSlotLabel(slotIndex: number): string {
		const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
		const hour = Math.floor(minutesFromMidnight / 60);
		const minute = minutesFromMidnight % 60;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}

	function formatDayHeader(day: Date): string {
		return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}

	async function loadAvailability() {
		loading = true;
		loadError = null;
		try {
			const data =
				readOnly && cid != null
					? await getInstructorStudentSessionAvailability({ courseId, cid, taskId })
					: await getTrainingSessionAvailability({ courseId, taskId });
			windowEndsAt = data.windowEndsAt;
			selectedKeys = loadSlotsToSelected(data.slots, getWindowStartDay());
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				loadError = body?.message ?? 'Failed to load availability';
			} else if (err instanceof Error) {
				loadError = err.message;
			} else {
				loadError = 'Failed to load availability';
			}
		} finally {
			loading = false;
		}
	}

	function getRangeKeys(
		anchor: { dayIndex: number; slotIndex: number },
		current: { dayIndex: number; slotIndex: number }
	): string[] {
		const windowStartDay = getWindowStartDay();
		const minDay = Math.min(anchor.dayIndex, current.dayIndex);
		const maxDay = Math.max(anchor.dayIndex, current.dayIndex);
		const minSlot = Math.min(anchor.slotIndex, current.slotIndex);
		const maxSlot = Math.max(anchor.slotIndex, current.slotIndex);
		const keys: string[] = [];

		for (let dayIndex = minDay; dayIndex <= maxDay; dayIndex++) {
			const day = new Date(windowStartDay);
			day.setDate(day.getDate() + dayIndex);
			for (let slotIndex = minSlot; slotIndex <= maxSlot; slotIndex++) {
				if (isSlotEnabled(slotStartDate(day, slotIndex))) {
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
		mode: 'select' | 'deselect'
	): Set<string> {
		const next = new Set(baseKeys);
		for (const key of getRangeKeys(anchor, current)) {
			if (mode === 'select') next.add(key);
			else next.delete(key);
		}
		return next;
	}

	function endDrag() {
		dragState = null;
		window.removeEventListener('pointerup', endDrag);
		window.removeEventListener('pointercancel', endDrag);
	}

	function beginDrag(dayIndex: number, slotIndex: number, day: Date) {
		if (readOnly) return;

		const start = slotStartDate(day, slotIndex);
		if (!isSlotEnabled(start)) return;

		const key = slotKey(dayIndex, slotIndex);
		const anchor = { dayIndex, slotIndex };
		const baseKeys = new Set(selectedKeys);
		const mode = selectedKeys.has(key) ? 'deselect' : 'select';

		dragState = { anchor, current: anchor, baseKeys, mode };
		selectedKeys = applyDragSelection(baseKeys, anchor, anchor, mode);

		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
	}

	function updateDrag(dayIndex: number, slotIndex: number) {
		if (!dragState) return;
		if (
			dragState.current.dayIndex === dayIndex &&
			dragState.current.slotIndex === slotIndex
		) {
			return;
		}

		const current = { dayIndex, slotIndex };
		dragState = { ...dragState, current };
		selectedKeys = applyDragSelection(
			dragState.baseKeys,
			dragState.anchor,
			current,
			dragState.mode
		);
	}

	async function handleSave() {
		if (readOnly) return;

		saving = true;
		saveError = null;
		try {
			await saveTrainingSessionAvailability({
				courseId,
				taskId,
				slots: selectedKeysToSlots(selectedKeys, getWindowStartDay())
			});
			await loadAvailability();
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				saveError = body?.message ?? 'Failed to save availability';
			} else if (err instanceof Error) {
				saveError = err.message;
			} else {
				saveError = 'Failed to save availability';
			}
		} finally {
			saving = false;
		}
	}

	const visibleDays = $derived(getVisibleDays());
	const weekRangeLabel = $derived(formatWeekRange(visibleDays));

	$effect(() => {
		courseId;
		taskId;
		cid;
		readOnly;
		loadAvailability();
	});
</script>

<div class="card bg-base-200 w-full shadow-sm">
	<div class="card-body gap-4">
		<div>
			<h2 class="card-title text-lg">Training Session Availability</h2>
			{#if sessionDescription}
				<p class="text-sm opacity-80">{sessionDescription}</p>
			{/if}
			<p class="text-sm opacity-70">
				Times shown in your local timezone ({timeZone}).
			</p>
		</div>

		{#if loading}
			<p class="text-sm">Loading availability...</p>
		{:else if loadError}
			<p class="text-error text-sm">{loadError}</p>
		{:else}
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

			<div class="overflow-x-auto">
				<div
					class="grid min-w-max gap-px bg-base-300 touch-none {dragState ? 'select-none' : ''}"
					style="grid-template-columns: 4rem repeat({visibleDays.length}, minmax(3.5rem, 1fr));"
				>
					<div class="bg-base-200 sticky left-0 z-10 px-1 py-2 text-xs font-semibold"></div>
					{#each visibleDays as { day, dayIndex } (`${dayIndex}-${day.toISOString()}`)}
						<div class="bg-base-200 px-1 py-2 text-center text-xs font-semibold">
							{formatDayHeader(day)}
						</div>
					{/each}

					{#each Array.from({ length: slotsPerDay }, (_, slotIndex) => slotIndex) as slotIndex (slotIndex)}
						<div
							class="bg-base-200 sticky left-0 z-10 px-1 py-0.5 text-right text-[10px] opacity-70"
						>
							{formatSlotLabel(slotIndex)}
						</div>
						{#each visibleDays as { day, dayIndex } (`${dayIndex}-${slotIndex}`)}
							{@const start = slotStartDate(day, slotIndex)}
							{@const enabled = isSlotEnabled(start)}
							{@const selected = selectedKeys.has(slotKey(dayIndex, slotIndex))}
							<button
								type="button"
								class="min-h-4 border-0 px-0 py-0.5 text-[10px] transition-colors {selected
									? 'bg-primary text-primary-content'
									: enabled
										? 'bg-base-100 hover:bg-base-300 cursor-pointer'
										: 'bg-base-100 opacity-30 cursor-not-allowed'}"
								disabled={readOnly}
								tabindex={enabled && !readOnly ? 0 : -1}
								aria-disabled={readOnly || !enabled}
								aria-label="{formatDayHeader(day)} {formatSlotLabel(slotIndex)}"
								aria-pressed={selected}
								onpointerdown={(event) => {
									if (readOnly || !enabled) return;
									event.preventDefault();
									beginDrag(dayIndex, slotIndex, day);
								}}
								onpointerenter={() => updateDrag(dayIndex, slotIndex)}
							></button>
						{/each}
					{/each}
				</div>
			</div>

			{#if !readOnly}
				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="btn btn-primary btn-sm"
						disabled={saving}
						onclick={handleSave}
					>
						{#if saving}
							<span class="loading loading-spinner loading-sm"></span>
							Saving...
						{:else}
							Save availability
						{/if}
					</button>
					{#if saveError}
						<p class="text-error text-sm">{saveError}</p>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
