<script lang="ts">
	import {
		AVAILABILITY_WINDOW_DAYS,
		DAY_END_HOUR,
		DAY_START_HOUR,
		SLOT_MINUTES,
		SLOT_MS,
		getAvailabilityWindowEndsAt,
		isRangeWithinAvailability,
		isSameCalendarDay
	} from '$lib/trainingSessionAvailability';
	import {
		getInstructorStudentSessionAvailability,
		getScheduledSessionsInWindow,
		rescheduleTrainingSession,
		scheduleTrainingSession,
		type ScheduledSessionInWindow
	} from '$lib/remote/instructor.remote';
	import {
		getTrainingSessionAvailability,
		saveTrainingSessionAvailability
	} from '$lib/remote/student.remote';
	import ScheduledSessionsList from '$lib/components/ScheduledSessionsList.svelte';
	import {
		formatScheduledSessionSummary,
		groupSessionsByVisibleDay,
		occupiedSlotKeys,
		sessionsBySlotKey,
		sessionsOverlappingRange,
		toOverlaySession
	} from '$lib/scheduledSessionOverlay';

	type Props =
		| {
				courseId: string;
				taskId: number;
				mode?: 'edit';
				cid?: never;
				sessionDescription?: string;
				confirmedSession?: { startsAt: Date; endsAt: Date };
		  }
		| {
				courseId: string;
				taskId: number;
				mode: 'view' | 'schedule';
				cid: number;
				sessionDescription?: string;
				onComplete?: () => void;
		  }
		| {
				courseId: string;
				taskId: number;
				mode: 'reschedule';
				cid: number;
				sessionId: number;
				sessionDescription?: string;
				onComplete?: () => void;
		  };

	let {
		courseId,
		taskId,
		cid,
		mode = 'edit',
		sessionDescription = '',
		confirmedSession,
		sessionId,
		onComplete
	}: Props & { sessionId?: number; onComplete?: () => void } = $props();

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const slotsPerDay = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
	const daysPerPage = 7;
	const pageCount = Math.ceil(AVAILABILITY_WINDOW_DAYS / daysPerPage);

	let weekPage = $state(0);
	let availabilityKeys = $state<Set<string>>(new Set());
	let selectedKeys = $state<Set<string>>(new Set());
	let savedKeys = $state<Set<string>>(new Set());
	let windowEndsAt = $state<Date>(getAvailabilityWindowEndsAt());
	let loading = $state(true);
	let saving = $state(false);
	let scheduling = $state(false);
	let saveError = $state<string | null>(null);
	let scheduleError = $state<string | null>(null);
	let loadError = $state<string | null>(null);
	let outsideAvailabilityWarning = $state(false);
	let scheduledSessions = $state.raw<ScheduledSessionInWindow[]>([]);
	let confirmDialog = $state<HTMLDialogElement | null>(null);
	let dragState = $state<{
		anchor: { dayIndex: number; slotIndex: number };
		current: { dayIndex: number; slotIndex: number };
		baseKeys: Set<string>;
		mode: 'select' | 'deselect';
	} | null>(null);

	const isScheduling = $derived(mode === 'schedule' || mode === 'reschedule');
	const isInteractive = $derived(mode === 'edit' || isScheduling);
	const showScheduledOverlay = $derived(mode !== 'edit');
	const overlaySessions = $derived(
		sessionId == null
			? scheduledSessions
			: scheduledSessions.filter((session) => session.id !== sessionId)
	);
	const occupiedKeys = $derived(occupiedSlotKeys(overlaySessions, getWindowStartDay()));
	const sessionsByKey = $derived(sessionsBySlotKey(overlaySessions, getWindowStartDay()));
	const calendarTitle = $derived(
		mode === 'reschedule'
			? 'Reschedule Training Session'
			: mode === 'schedule'
				? 'Schedule Training Session'
				: 'Training Session Availability'
	);

	function getBlockedKeys(): Set<string> {
		if (!confirmedSession) return new Set();
		return loadSlotsToSelected(
			[{ startsAt: confirmedSession.startsAt, endsAt: confirmedSession.endsAt }],
			getWindowStartDay()
		);
	}

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

	function parseSlotKey(key: string): { dayIndex: number; slotIndex: number } | null {
		const [dayStr, slotStr] = key.split('-');
		const dayIndex = Number(dayStr);
		const slotIndex = Number(slotStr);
		if (!Number.isFinite(dayIndex) || !Number.isFinite(slotIndex)) return null;
		return { dayIndex, slotIndex };
	}

	function toLinearIndex(dayIndex: number, slotIndex: number): number {
		return dayIndex * slotsPerDay + slotIndex;
	}

	function fromLinearIndex(linear: number): { dayIndex: number; slotIndex: number } {
		return {
			dayIndex: Math.floor(linear / slotsPerDay),
			slotIndex: linear % slotsPerDay
		};
	}

	function keysToLinearIndices(keys: Set<string>): number[] {
		const indices: number[] = [];
		for (const key of keys) {
			const parsed = parseSlotKey(key);
			if (!parsed) continue;
			indices.push(toLinearIndex(parsed.dayIndex, parsed.slotIndex));
		}
		return indices;
	}

	function getLinearBounds(keys: Set<string>): { min: number; max: number } | null {
		if (keys.size === 0) return null;
		const indices = keysToLinearIndices(keys);
		if (indices.length === 0) return null;
		const min = Math.min(...indices);
		const max = Math.max(...indices);
		if (max - min + 1 !== keys.size) return null;
		return { min, max };
	}

	function isContiguousWithSelection(
		dayIndex: number,
		slotIndex: number,
		keys: Set<string>
	): boolean {
		if (keys.size === 0) return true;
		if (keys.has(slotKey(dayIndex, slotIndex))) return true;

		const bounds = getLinearBounds(keys);
		if (!bounds) return false;
		const linear = toLinearIndex(dayIndex, slotIndex);
		return linear === bounds.min - 1 || linear === bounds.max + 1;
	}

	function keepSingleContiguousBlock(keys: Set<string>): Set<string> {
		if (keys.size === 0 || getLinearBounds(keys)) return keys;

		const indices = keysToLinearIndices(keys).sort((a, b) => a - b);
		if (indices.length === 0) return new Set();

		let bestStart = indices[0];
		let bestEnd = indices[0];
		let bestSize = 1;
		let rangeStart = indices[0];
		let rangeEnd = indices[0];

		for (let i = 1; i <= indices.length; i++) {
			const current = indices[i];
			if (current === rangeEnd + 1) {
				rangeEnd = current;
				continue;
			}

			const size = rangeEnd - rangeStart + 1;
			if (size > bestSize) {
				bestStart = rangeStart;
				bestEnd = rangeEnd;
				bestSize = size;
			}

			if (current !== undefined) {
				rangeStart = current;
				rangeEnd = current;
			}
		}

		const next = new Set<string>();
		for (let linear = bestStart; linear <= bestEnd; linear++) {
			const { dayIndex, slotIndex } = fromLinearIndex(linear);
			next.add(slotKey(dayIndex, slotIndex));
		}
		return next;
	}

	function getSelectedSessionRange(): { startsAt: Date; endsAt: Date } | null {
		const bounds = getLinearBounds(selectedKeys);
		if (!bounds) return null;

		const windowStartDay = getWindowStartDay();
		const start = fromLinearIndex(bounds.min);
		const end = fromLinearIndex(bounds.max);
		const startDay = new Date(windowStartDay);
		startDay.setDate(startDay.getDate() + start.dayIndex);
		const endDay = new Date(windowStartDay);
		endDay.setDate(endDay.getDate() + end.dayIndex);

		return {
			startsAt: slotStartDate(startDay, start.slotIndex),
			endsAt: new Date(slotStartDate(endDay, end.slotIndex).getTime() + SLOT_MS)
		};
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

		return result.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
	}

	function isSlotEnabled(start: Date): boolean {
		const now = new Date();
		const end = new Date(start.getTime() + SLOT_MS);
		if (end > windowEndsAt) return false;
		// Scheduling cannot start in the past. Editing availability can still
		// toggle a block until each 30-minute slot has ended.
		return isScheduling ? start >= now : end > now;
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

	function formatSelectedRange(): string {
		const range = getSelectedSessionRange();
		if (!range) return '';

		const { startsAt, endsAt } = range;
		const startDateLabel = startsAt.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		const startTime = startsAt.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		const endTime = endsAt.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		if (isSameCalendarDay(startsAt, endsAt)) {
			return `${startDateLabel}, ${startTime} – ${endTime}`;
		}

		const endDateLabel = endsAt.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		return `${startDateLabel}, ${startTime} – ${endDateLabel}, ${endTime}`;
	}

	async function loadAvailability() {
		loading = true;
		loadError = null;
		try {
			if (mode !== 'edit') {
				if (cid == null) {
					throw new Error('Student is required to load session availability');
				}
				const [data, scheduled] = await Promise.all([
					getInstructorStudentSessionAvailability({ courseId, cid, taskId }),
					getScheduledSessionsInWindow()
				]);
				windowEndsAt = data.windowEndsAt;
				scheduledSessions = scheduled.map(toOverlaySession);

				if (isScheduling) {
					availabilityKeys = loadSlotsToSelected(data.slots, getWindowStartDay());
					selectedKeys = new Set();
				} else {
					selectedKeys = loadSlotsToSelected(data.slots, getWindowStartDay());
					availabilityKeys = new Set();
					for (const key of getBlockedKeys()) {
						selectedKeys.add(key);
					}
					savedKeys = new Set(selectedKeys);
				}
			} else {
				const data = await getTrainingSessionAvailability({ courseId, taskId });
				windowEndsAt = data.windowEndsAt;
				scheduledSessions = [];
				selectedKeys = loadSlotsToSelected(data.slots, getWindowStartDay());
				availabilityKeys = new Set();
				for (const key of getBlockedKeys()) {
					selectedKeys.add(key);
				}
				savedKeys = new Set(selectedKeys);
			}
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
		const keys: string[] = [];

		if (isScheduling) {
			const minLinear = Math.min(
				toLinearIndex(anchor.dayIndex, anchor.slotIndex),
				toLinearIndex(current.dayIndex, current.slotIndex)
			);
			const maxLinear = Math.max(
				toLinearIndex(anchor.dayIndex, anchor.slotIndex),
				toLinearIndex(current.dayIndex, current.slotIndex)
			);

			for (let linear = minLinear; linear <= maxLinear; linear++) {
				const { dayIndex, slotIndex } = fromLinearIndex(linear);
				if (dayIndex < 0 || dayIndex >= AVAILABILITY_WINDOW_DAYS) continue;
				const day = new Date(windowStartDay);
				day.setDate(day.getDate() + dayIndex);
				if (isSlotEnabled(slotStartDate(day, slotIndex))) {
					keys.push(slotKey(dayIndex, slotIndex));
				}
			}

			return keys;
		}

		const minDay = Math.min(anchor.dayIndex, current.dayIndex);
		const maxDay = Math.max(anchor.dayIndex, current.dayIndex);
		const minSlot = Math.min(anchor.slotIndex, current.slotIndex);
		const maxSlot = Math.max(anchor.slotIndex, current.slotIndex);

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
		dragMode: 'select' | 'deselect'
	): Set<string> {
		const next = new Set(baseKeys);
		const blockedKeys = getBlockedKeys();
		for (const key of getRangeKeys(anchor, current)) {
			if (blockedKeys.has(key)) continue;
			if (dragMode === 'select') next.add(key);
			else next.delete(key);
		}
		for (const key of blockedKeys) next.add(key);
		return isScheduling ? keepSingleContiguousBlock(next) : next;
	}

	function endDrag() {
		dragState = null;
		window.removeEventListener('pointerup', endDrag);
		window.removeEventListener('pointercancel', endDrag);
	}

	function beginDrag(dayIndex: number, slotIndex: number, day: Date) {
		if (!isInteractive) return;

		const start = slotStartDate(day, slotIndex);
		if (!isSlotEnabled(start)) return;

		const key = slotKey(dayIndex, slotIndex);
		if (getBlockedKeys().has(key)) return;

		const anchor = { dayIndex, slotIndex };
		const dragMode = selectedKeys.has(key) ? 'deselect' : 'select';
		const replaceSelection =
			isScheduling &&
			dragMode === 'select' &&
			!isContiguousWithSelection(dayIndex, slotIndex, selectedKeys);
		const baseKeys = replaceSelection ? new Set<string>() : new Set(selectedKeys);

		dragState = { anchor, current: anchor, baseKeys, mode: dragMode };
		selectedKeys = applyDragSelection(baseKeys, anchor, anchor, dragMode);

		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
	}

	function updateDrag(dayIndex: number, slotIndex: number) {
		if (!dragState) return;

		if (dragState.current.dayIndex === dayIndex && dragState.current.slotIndex === slotIndex) {
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

	function getSlotClass(dayIndex: number, slotIndex: number, enabled: boolean) {
		const key = slotKey(dayIndex, slotIndex);
		const scheduled = selectedKeys.has(key);
		const available = availabilityKeys.has(key);
		const blocked = getBlockedKeys().has(key);
		const occupied = occupiedKeys.has(key);

		if (blocked) return 'training-session-blocked-slot cursor-not-allowed';
		if (!enabled) return 'bg-base-100 cursor-not-allowed opacity-30';

		if (isScheduling) {
			return [
				occupied && 'training-session-occupied-slot',
				scheduled && 'bg-accent text-accent-content',
				!scheduled && occupied && !available && 'bg-warning/50',
				!scheduled && available && 'bg-primary/40 hover:bg-primary/50',
				!scheduled && !available && !occupied && 'bg-base-100 hover:bg-base-300 cursor-pointer',
				!scheduled && !available && occupied && 'hover:bg-warning/60 cursor-pointer'
			];
		}

		return [
			occupied && 'training-session-occupied-slot',
			scheduled && 'bg-primary text-primary-content',
			!scheduled && occupied && 'bg-warning/50',
			!scheduled && !occupied && 'bg-base-100 hover:bg-base-300 cursor-pointer',
			!isInteractive && 'cursor-default'
		];
	}

	function slotOccupancyLabel(dayIndex: number, slotIndex: number): string {
		const sessions = sessionsByKey.get(slotKey(dayIndex, slotIndex)) ?? [];
		if (sessions.length === 0) return '';
		return sessions.map(formatScheduledSessionSummary).join('; ');
	}

	async function handleSave() {
		if (mode !== 'edit') return;

		saving = true;
		saveError = null;
		try {
			const keysToSave = new Set(selectedKeys);
			for (const key of getBlockedKeys()) {
				keysToSave.add(key);
			}
			await saveTrainingSessionAvailability({
				courseId,
				taskId,
				slots: selectedKeysToSlots(keysToSave, getWindowStartDay())
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

	function openScheduleDialog() {
		if (selectedKeys.size === 0 || !isScheduling) return;

		const range = getSelectedSessionRange();
		if (!range) return;

		const availabilitySlots = selectedKeysToSlots(availabilityKeys, getWindowStartDay()).map(
			(slot) => ({
				startsAt: new Date(slot.startsAt),
				endsAt: new Date(slot.endsAt)
			})
		);

		outsideAvailabilityWarning = !isRangeWithinAvailability(range, availabilitySlots);

		scheduleError = null;
		confirmDialog?.showModal();
	}

	async function handleSchedule() {
		if (!isScheduling) return;

		const range = getSelectedSessionRange();
		if (!range) return;

		scheduling = true;
		scheduleError = null;
		const fallback =
			mode === 'reschedule' ? 'Failed to reschedule session' : 'Failed to schedule session';
		try {
			if (mode === 'reschedule') {
				if (sessionId == null) {
					throw new Error('Session is required to reschedule');
				}
				await rescheduleTrainingSession({
					sessionId,
					startsAt: range.startsAt.toISOString(),
					endsAt: range.endsAt.toISOString()
				});
			} else {
				if (cid == null) {
					throw new Error('Student is required to schedule a session');
				}
				await scheduleTrainingSession({
					courseId,
					studentCid: cid,
					taskId,
					startsAt: range.startsAt.toISOString(),
					endsAt: range.endsAt.toISOString()
				});
			}
			confirmDialog?.close();
			await loadAvailability();
			onComplete?.();
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				scheduleError = body?.message ?? fallback;
			} else if (err instanceof Error) {
				scheduleError = err.message;
			} else {
				scheduleError = fallback;
			}
		} finally {
			scheduling = false;
		}
	}

	const visibleDays = $derived(getVisibleDays());
	const weekRangeLabel = $derived(formatWeekRange(visibleDays));
	const selectedRangeLabel = $derived(formatSelectedRange());
	const visibleScheduledGroups = $derived(groupSessionsByVisibleDay(overlaySessions, visibleDays));
	const overlappingScheduled = $derived.by(() => {
		const range = getSelectedSessionRange();
		if (!range) return [];
		return sessionsOverlappingRange(overlaySessions, range);
	});
	const hasUnsavedChanges = $derived(
		mode === 'edit' &&
			!loading &&
			[...selectedKeys].sort().join(',') !== [...savedKeys].sort().join(',')
	);

	$effect(() => {
		void (courseId, taskId, mode, cid, sessionId, confirmedSession);
		loadAvailability();
	});
</script>

<div class="card bg-base-200 w-full shadow-sm">
	<div class="card-body gap-3">
		<div>
			<h2 class="card-title text-lg">{calendarTitle}</h2>
			{#if sessionDescription}
				<p class="text-sm opacity-80">{sessionDescription}</p>
			{/if}
			<p class="text-sm opacity-70">
				Times shown in your local timezone ({timeZone}).
			</p>
			{#if isScheduling}
				<p class="text-sm opacity-70">
					Drag to select a continuous session time. Shaded slots show student availability. Striped
					slots are other scheduled sessions.
				</p>
			{:else if confirmedSession}
				<p class="text-sm opacity-70">
					Purple sections are your confirmed training session and cannot be changed.
				</p>
			{:else if showScheduledOverlay}
				<p class="text-sm opacity-70">Striped slots are other scheduled sessions.</p>
			{/if}
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

			{#if showScheduledOverlay}
				<div class="flex flex-wrap gap-3 text-[11px] opacity-80">
					{#if isScheduling}
						<span class="flex items-center gap-1">
							<span class="bg-primary/40 inline-block h-3 w-3 rounded-sm"></span>
							Student availability
						</span>
						<span class="flex items-center gap-1">
							<span class="bg-accent inline-block h-3 w-3 rounded-sm"></span>
							Your selection
						</span>
					{/if}
					<span class="flex items-center gap-1">
						<span
							class="training-session-occupied-slot bg-warning/50 inline-block h-3 w-3 rounded-sm"
						></span>
						Other scheduled sessions
					</span>
				</div>
			{/if}

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

					{#each Array.from({ length: slotsPerDay }, (_, slotIndex) => slotIndex) as slotIndex (slotIndex)}
						<div
							class="bg-base-200 sticky left-0 z-10 px-0.5 text-right text-[9px] leading-none opacity-70"
						>
							{#if isHourBoundary(slotIndex)}
								{formatHourLabel(slotIndex)}
							{/if}
						</div>
						{#each visibleDays as { day, dayIndex } (`${dayIndex}-${slotIndex}`)}
							{@const start = slotStartDate(day, slotIndex)}
							{@const enabled = isSlotEnabled(start)}
							{@const selected = selectedKeys.has(slotKey(dayIndex, slotIndex))}
							{@const blocked = getBlockedKeys().has(slotKey(dayIndex, slotIndex))}
							{@const occupancy = slotOccupancyLabel(dayIndex, slotIndex)}
							<button
								type="button"
								class={[
									'h-3 min-h-3 border-0 p-0 transition-colors',
									getSlotClass(dayIndex, slotIndex, enabled)
								]}
								disabled={!isInteractive || blocked}
								tabindex={enabled && isInteractive && !blocked ? 0 : -1}
								title={occupancy || undefined}
								aria-disabled={!isInteractive || !enabled || blocked}
								aria-label="{formatDayHeader(day)} {formatSlotLabel(slotIndex)}{occupancy
									? ` · ${occupancy}`
									: ''}"
								aria-pressed={selected}
								onpointerdown={(event) => {
									if (!isInteractive || !enabled || blocked) return;
									event.preventDefault();
									beginDrag(dayIndex, slotIndex, day);
								}}
								onpointerenter={() => updateDrag(dayIndex, slotIndex)}
							></button>
						{/each}
					{/each}
				</div>
			</div>

			{#if showScheduledOverlay}
				<ScheduledSessionsList groups={visibleScheduledGroups} />
			{/if}

			{#if mode === 'edit'}
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
					{:else if hasUnsavedChanges}
						<p class="text-warning text-sm">You have unsaved changes.</p>
					{/if}
				</div>
			{:else if isScheduling}
				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="btn btn-primary btn-sm"
						disabled={selectedKeys.size === 0}
						onclick={openScheduleDialog}
					>
						{mode === 'reschedule' ? 'Reschedule session' : 'Schedule session'}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={confirmDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">
			{mode === 'reschedule' ? 'Reschedule training session' : 'Schedule training session'}
		</h3>
		{#if selectedRangeLabel}
			<p class="py-2 text-sm">{selectedRangeLabel}</p>
		{/if}

		{#if outsideAvailabilityWarning}
			<p class="text-warning text-sm">This time is outside the student's submitted availability.</p>
		{/if}

		{#if overlappingScheduled.length > 0}
			<p class="text-warning text-sm">
				This time overlaps {overlappingScheduled.length} other scheduled
				{overlappingScheduled.length === 1 ? 'session' : 'sessions'}.
			</p>
			<ul class="mt-1 space-y-1 text-sm">
				{#each overlappingScheduled as session (session.id)}
					<li>
						{formatScheduledSessionSummary(session)} · {session.courseName}
					</li>
				{/each}
			</ul>
		{/if}

		{#if scheduleError}
			<p class="text-error mt-2 text-sm">{scheduleError}</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={scheduling}>Cancel</button>
			</form>
			<button type="button" class="btn btn-primary" disabled={scheduling} onclick={handleSchedule}>
				{#if scheduling}
					<span class="loading loading-spinner loading-sm"></span>
					{mode === 'reschedule' ? 'Rescheduling...' : 'Scheduling...'}
				{:else}
					Confirm
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<style>
	:global(.training-session-blocked-slot) {
		background-color: #7c3aed;
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 2px,
			rgb(255 255 255 / 0.2) 2px,
			rgb(255 255 255 / 0.2) 4px
		);
	}

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
