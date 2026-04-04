import { getDay, addMinutes, format, parse, isBefore, isEqual, startOfDay } from 'date-fns';

export type TimeSlot = {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
};

const WEEKLY_SCHEDULE: Record<number, { start: string; end: string }[]> = {
  2: [ // Tuesday (Salı)
    { start: '09:35', end: '11:50' },
    { start: '12:00', end: '12:35' },
    { start: '14:05', end: '15:25' },
  ],
  3: [ // Wednesday (Çarşamba)
    { start: '10:25', end: '11:50' },
  ],
  4: [ // Thursday (Perşembe)
    { start: '12:00', end: '12:35' },
  ],
  5: [ // Friday (Cuma)
    { start: '08:45', end: '11:50' },
  ],
};

export function getAvailableSlotsForDate(date: Date): TimeSlot[] {
  const dayOfWeek = getDay(date);
  const schedule = WEEKLY_SCHEDULE[dayOfWeek];

  if (!schedule) return [];

  const slots: TimeSlot[] = [];
  const slotDuration = 15;

  schedule.forEach((range) => {
    let current = parse(range.start, 'HH:mm', date);
    const end = parse(range.end, 'HH:mm', date);

    while (true) {
      const next = addMinutes(current, slotDuration);
      if (isBefore(next, end) || isEqual(next, end)) {
        slots.push({
          startTime: format(current, 'HH:mm'),
          endTime: format(next, 'HH:mm'),
        });
        current = next;
      } else {
        break;
      }
    }
  });

  return slots;
}

export function isDayDisabled(date: Date): boolean {
  const day = getDay(date);
  // Mon (1), Sat (6), Sun (0) are disabled
  if (day === 1 || day === 6 || day === 0) return true;
  // Past dates are also disabled
  if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
  return false;
}