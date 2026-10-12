/** Weekly Moncton Monday event window in UTC (not tied to the events table).
 * Monday 22:00 UTC → Tuesday 03:00 UTC.
 */
export const MONCTON_MONDAY_UTC = {
  /** Monday in `Date#getUTCDay()` numbering. */
  startDayOfWeek: 1,
  startHour: 22,
  startMinute: 0,
  /** Window ends on the following calendar day (Tuesday) at this UTC time. */
  endDayOffset: 1,
  endHour: 3,
  endMinute: 0,
} as const;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function mondayOnOrBefore(date: Date): Date {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return addUtcDays(dayStart, -daysSinceMonday);
}

function mondayOnOrAfter(date: Date): Date {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const daysUntilMonday = (8 - day) % 7;
  return addUtcDays(dayStart, daysUntilMonday);
}

export class MonctonMondayWindow {
  static windowStartForWeek(mondayUtc: Date): Date {
    return new Date(
      Date.UTC(
        mondayUtc.getUTCFullYear(),
        mondayUtc.getUTCMonth(),
        mondayUtc.getUTCDate(),
        MONCTON_MONDAY_UTC.startHour,
        MONCTON_MONDAY_UTC.startMinute,
        0,
        0,
      ),
    );
  }

  static windowEndForWeek(mondayUtc: Date): Date {
    const start = MonctonMondayWindow.windowStartForWeek(mondayUtc);
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + MONCTON_MONDAY_UTC.endDayOffset,
        MONCTON_MONDAY_UTC.endHour,
        MONCTON_MONDAY_UTC.endMinute,
        0,
        0,
      ),
    );
  }

  /** True when `[start, end)` overlaps any Moncton Monday UTC window in range. */
  static overlaps(start: Date, end: Date): boolean {
    if (end.getTime() <= start.getTime()) {
      return false;
    }

    const firstMonday = mondayOnOrBefore(start);
    const lastMonday = mondayOnOrBefore(end);

    for (
      let monday = firstMonday;
      monday.getTime() <= lastMonday.getTime();
      monday = addUtcDays(monday, 7)
    ) {
      const windowStart = MonctonMondayWindow.windowStartForWeek(monday);
      const windowEnd = MonctonMondayWindow.windowEndForWeek(monday);
      if (start < windowEnd && end > windowStart) {
        return true;
      }
    }

    const nextMonday = mondayOnOrAfter(end);
    const windowStart = MonctonMondayWindow.windowStartForWeek(nextMonday);
    const windowEnd = MonctonMondayWindow.windowEndForWeek(nextMonday);
    if (start < windowEnd && end > windowStart) {
      return true;
    }

    return false;
  }
}
