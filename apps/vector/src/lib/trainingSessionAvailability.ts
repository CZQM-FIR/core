import type { CourseTaskProgress } from '$lib/courseTaskProgress';

export const AVAILABILITY_WINDOW_DAYS = 14;
export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

export const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export function getNextIncompleteTask(
	tasks: CourseTaskProgress[]
): CourseTaskProgress | null {
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

	const sorted = [...slots].sort(
		(a, b) => a.startsAt.getTime() - b.startsAt.getTime()
	);
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
	for (const slot of slots) {
		if (slot.startsAt >= slot.endsAt) {
			throw new Error('Each slot must have startsAt before endsAt');
		}

		const durationMs = slot.endsAt.getTime() - slot.startsAt.getTime();
		if (durationMs % SLOT_MS !== 0) {
			throw new Error('Each slot duration must be a multiple of 30 minutes');
		}

		if (slot.startsAt < windowStart || slot.endsAt > windowEnd) {
			throw new Error('Each slot must fall within the availability window');
		}
	}

	return mergeAvailabilitySlots(slots);
}
