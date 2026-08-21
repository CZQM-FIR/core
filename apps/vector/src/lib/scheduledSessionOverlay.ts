import type { ScheduledSessionInWindow } from '$lib/remote/instructor.remote';
import {
	rangesOverlap,
	slotsToKeys,
	type AvailabilitySlot
} from '$lib/trainingSessionAvailability';

export type OverlaySession = Pick<
	ScheduledSessionInWindow,
	| 'id'
	| 'startsAt'
	| 'endsAt'
	| 'status'
	| 'sessionTypeLabel'
	| 'sessionDescription'
	| 'courseName'
	| 'studentName'
	| 'instructorName'
>;

export function toOverlaySession(session: ScheduledSessionInWindow): ScheduledSessionInWindow {
	return {
		...session,
		startsAt: session.startsAt instanceof Date ? session.startsAt : new Date(session.startsAt),
		endsAt: session.endsAt instanceof Date ? session.endsAt : new Date(session.endsAt)
	};
}

export function scheduledSessionStatusLabel(status: string): string {
	switch (status) {
		case 'pending':
			return 'Awaiting confirmation';
		case 'confirmed':
			return 'Confirmed';
		case 'in_progress':
			return 'In progress';
		default:
			return status;
	}
}

export function formatScheduledSessionTime(startsAt: Date, endsAt: Date): string {
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
	return `${startTime} – ${endTime}`;
}

export function formatScheduledSessionSummary(session: OverlaySession): string {
	return `${session.sessionTypeLabel} · ${session.studentName} with ${session.instructorName} · ${formatScheduledSessionTime(session.startsAt, session.endsAt)}`;
}

export function occupiedSlotKeys(
	sessions: Pick<OverlaySession, 'startsAt' | 'endsAt'>[],
	windowStartDay: Date
): Set<string> {
	return slotsToKeys(
		sessions.map((session) => ({ startsAt: session.startsAt, endsAt: session.endsAt })),
		windowStartDay
	);
}

export function sessionsBySlotKey<T extends OverlaySession>(
	sessions: T[],
	windowStartDay: Date
): Map<string, T[]> {
	const byKey = new Map<string, T[]>();
	for (const session of sessions) {
		for (const key of slotsToKeys(
			[{ startsAt: session.startsAt, endsAt: session.endsAt }],
			windowStartDay
		)) {
			const list = byKey.get(key) ?? [];
			list.push(session);
			byKey.set(key, list);
		}
	}
	return byKey;
}

export function sessionsOverlappingRange<T extends OverlaySession>(
	sessions: T[],
	range: AvailabilitySlot
): T[] {
	return sessions.filter((session) =>
		rangesOverlap(range, { startsAt: session.startsAt, endsAt: session.endsAt })
	);
}

export type ScheduledSessionDayGroup<T extends OverlaySession = OverlaySession> = {
	day: Date;
	dayKey: string;
	sessions: T[];
};

export function groupSessionsByVisibleDay<T extends OverlaySession>(
	sessions: T[],
	visibleDays: { day: Date }[]
): ScheduledSessionDayGroup<T>[] {
	return visibleDays
		.map(({ day }) => {
			const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
			const daySessions = sessions.filter((session) =>
				rangesOverlap(
					{ startsAt: session.startsAt, endsAt: session.endsAt },
					{ startsAt: dayStart, endsAt: dayEnd }
				)
			);
			return {
				day,
				dayKey: `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
				sessions: daySessions
			};
		})
		.filter((group) => group.sessions.length > 0);
}
