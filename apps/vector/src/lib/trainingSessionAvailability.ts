import type { CourseTaskProgress } from '$lib/courseTaskProgress';

export const AVAILABILITY_WINDOW_DAYS = 14;
export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

export const SLOT_MS = SLOT_MINUTES * 60 * 1000;
export const SLOTS_PER_DAY = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

export type AvailabilitySlot = { startsAt: Date; endsAt: Date };

export function getWindowStartDay(from = new Date()): Date {
	const day = new Date(from);
	day.setHours(0, 0, 0, 0);
	return day;
}

export function slotKey(dayIndex: number, slotIndex: number): string {
	return `${dayIndex}-${slotIndex}`;
}

export function parseSlotKey(key: string): { dayIndex: number; slotIndex: number } | null {
	const [dayStr, slotStr] = key.split('-');
	const dayIndex = Number(dayStr);
	const slotIndex = Number(slotStr);
	if (!Number.isFinite(dayIndex) || !Number.isFinite(slotIndex)) return null;
	return { dayIndex, slotIndex };
}

export function slotStartDate(day: Date, slotIndex: number): Date {
	const minutesFromMidnight = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
	const hour = Math.floor(minutesFromMidnight / 60);
	const minute = minutesFromMidnight % 60;
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

export function dateToSlotKey(date: Date, windowStartDay: Date): string | null {
	const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const dayIndex = Math.round(
		(dayStart.getTime() - windowStartDay.getTime()) / (24 * 60 * 60 * 1000)
	);
	if (dayIndex < 0 || dayIndex >= AVAILABILITY_WINDOW_DAYS) return null;

	const slotIndex = (date.getHours() * 60 + date.getMinutes()) / SLOT_MINUTES;
	if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SLOTS_PER_DAY) return null;

	return slotKey(dayIndex, slotIndex);
}

export function slotsToKeys(
	slots: AvailabilitySlot[],
	windowStartDay: Date,
	now = new Date()
): Set<string> {
	const selected = new Set<string>();
	for (const slot of slots) {
		let current = new Date(slot.startsAt);
		while (current < slot.endsAt) {
			if (current.getTime() + SLOT_MS > now.getTime()) {
				const key = dateToSlotKey(current, windowStartDay);
				if (key) selected.add(key);
			}
			current = new Date(current.getTime() + SLOT_MS);
		}
	}
	return selected;
}

export function keysToSlots(selected: Set<string>, windowStartDay: Date): AvailabilitySlot[] {
	const byDay = new Map<number, number[]>();

	for (const key of selected) {
		const parsed = parseSlotKey(key);
		if (!parsed) continue;

		const indices = byDay.get(parsed.dayIndex) ?? [];
		indices.push(parsed.slotIndex);
		byDay.set(parsed.dayIndex, indices);
	}

	const result: AvailabilitySlot[] = [];

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
			result.push({ startsAt, endsAt });

			if (current !== undefined) {
				rangeStart = current;
				rangeEnd = current;
			}
		}
	}

	return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function isAvailabilitySlotEnabled(
	start: Date,
	windowEndsAt: Date,
	now = new Date()
): boolean {
	const end = new Date(start.getTime() + SLOT_MS);
	return end > now && end <= windowEndsAt;
}

/** Drop elapsed time from a slot, keeping the current 30-minute chunk if it is still in progress. */
export function clipAvailabilitySlotToNow(
	slot: { startsAt: Date; endsAt: Date },
	now = new Date()
): { startsAt: Date; endsAt: Date } | null {
	if (slot.endsAt <= now) return null;
	if (slot.startsAt >= now) return { startsAt: slot.startsAt, endsAt: slot.endsAt };

	const elapsedSlots = Math.floor((now.getTime() - slot.startsAt.getTime()) / SLOT_MS);
	const startsAt = new Date(slot.startsAt.getTime() + elapsedSlots * SLOT_MS);
	if (startsAt >= slot.endsAt) return null;
	return { startsAt, endsAt: slot.endsAt };
}

export function rangesOverlap(a: AvailabilitySlot, b: AvailabilitySlot): boolean {
	return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function anySlotsOverlap(a: AvailabilitySlot[], b: AvailabilitySlot[]): boolean {
	if (a.length === 0 || b.length === 0) return false;
	return a.some((left) => b.some((right) => rangesOverlap(left, right)));
}

export function getNextIncompleteTask(tasks: CourseTaskProgress[]): CourseTaskProgress | null {
	return tasks.find((task) => !task.isComplete) ?? null;
}

export function isTrainingSessionNext(tasks: CourseTaskProgress[]): boolean {
	const next = getNextIncompleteTask(tasks);
	return next?.taskType === 'training_session';
}

export function getAvailabilityWindowEndsAt(from = new Date()): Date {
	return new Date(from.getTime() + AVAILABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function toNextTaskSummary(
	task: CourseTaskProgress | null
): { taskId: number; taskType: string; description: string } | null {
	if (!task) return null;
	return {
		taskId: task.taskId,
		taskType: task.taskType,
		description: task.description
	};
}

export function mergeAvailabilitySlots(
	slots: { startsAt: Date; endsAt: Date }[]
): { startsAt: Date; endsAt: Date }[] {
	if (slots.length === 0) return [];

	const sorted = [...slots].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
	const merged: { startsAt: Date; endsAt: Date }[] = [{ ...sorted[0] }];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];
		if (current.startsAt.getTime() <= last.endsAt.getTime()) {
			if (current.endsAt.getTime() > last.endsAt.getTime()) {
				last.endsAt = current.endsAt;
			}
		} else {
			merged.push({ ...current });
		}
	}

	return merged;
}

export function validateAvailabilitySlots(
	slots: { startsAt: Date; endsAt: Date }[],
	windowStart = new Date(),
	windowEnd = getAvailabilityWindowEndsAt(windowStart)
): { startsAt: Date; endsAt: Date }[] {
	const clipped: { startsAt: Date; endsAt: Date }[] = [];

	for (const slot of slots) {
		if (slot.startsAt >= slot.endsAt) {
			throw new Error('Each slot must have startsAt before endsAt');
		}

		const durationMs = slot.endsAt.getTime() - slot.startsAt.getTime();
		if (durationMs % SLOT_MS !== 0) {
			throw new Error('Each slot duration must be a multiple of 30 minutes');
		}

		if (slot.endsAt > windowEnd) {
			throw new Error('Each slot must fall within the availability window');
		}

		// Merged blocks keep their original start. Once that start has passed, still
		// allow editing the remaining time instead of rejecting the whole block.
		const remaining = clipAvailabilitySlotToNow(slot, windowStart);
		if (remaining) clipped.push(remaining);
	}

	return mergeAvailabilitySlots(clipped);
}

export function isSameCalendarDay(startsAt: Date, endsAt: Date): boolean {
	return (
		startsAt.getFullYear() === endsAt.getFullYear() &&
		startsAt.getMonth() === endsAt.getMonth() &&
		startsAt.getDate() === endsAt.getDate()
	);
}

export function validateSessionTimeRange(
	startsAt: Date,
	endsAt: Date,
	windowStart = new Date(),
	windowEnd = getAvailabilityWindowEndsAt(windowStart)
): void {
	if (startsAt >= endsAt) {
		throw new Error('Session start must be before end');
	}

	const durationMs = endsAt.getTime() - startsAt.getTime();
	if (durationMs % SLOT_MS !== 0) {
		throw new Error('Session duration must be a multiple of 30 minutes');
	}

	if (startsAt < windowStart || endsAt > windowEnd) {
		throw new Error('Session must fall within the availability window');
	}
}

export function isRangeWithinAvailability(
	selectedRange: { startsAt: Date; endsAt: Date },
	availabilitySlots: { startsAt: Date; endsAt: Date }[]
): boolean {
	if (availabilitySlots.length === 0) return false;

	const merged = mergeAvailabilitySlots(availabilitySlots);
	let current = new Date(selectedRange.startsAt);

	while (current < selectedRange.endsAt) {
		const chunkEnd = new Date(current.getTime() + SLOT_MS);
		const covered = merged.some((slot) => current >= slot.startsAt && chunkEnd <= slot.endsAt);
		if (!covered) return false;
		current = chunkEnd;
	}

	return true;
}
