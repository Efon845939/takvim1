
import { 
  addMinutes, 
  format, 
  isBefore, 
  isAfter, 
  parseISO, 
  startOfDay, 
  endOfDay, 
  eachDayOfInterval, 
  getDay,
  parse,
  isEqual,
  addDays
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export type WorkingHours = {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  enabled: boolean;
  slots: { start: string; end: string }[];
};

export type EventOverlap = {
  start: Date;
  end: Date;
};

export type SlotOptions = {
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  timezone: string;
};

/**
 * Calculates available slots for a given date range based on working hours and existing events.
 */
export function calculateAvailableSlots(
  startDate: Date,
  endDate: Date,
  workingHours: WorkingHours[],
  existingEvents: EventOverlap[],
  options: SlotOptions
): { date: string; slots: { start: string; end: string }[] }[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const result: { date: string; slots: { start: string; end: string }[] }[] = [];

  days.forEach((day) => {
    const dayOfWeek = getDay(day);
    const dayConfig = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);

    if (!dayConfig || !dayConfig.enabled) return;

    const daySlots: { start: string; end: string }[] = [];
    const dateStr = format(day, 'yyyy-MM-dd');

    dayConfig.slots.forEach((range) => {
      const rangeStart = parse(`${dateStr} ${range.start}`, 'yyyy-MM-dd HH:mm', day);
      const rangeEnd = parse(`${dateStr} ${range.end}`, 'yyyy-MM-dd HH:mm', day);

      let current = rangeStart;

      while (isBefore(addMinutes(current, options.duration + options.bufferAfter), rangeEnd) || 
             isEqual(addMinutes(current, options.duration + options.bufferAfter), rangeEnd)) {
        
        const slotStart = current;
        const slotEnd = addMinutes(current, options.duration);
        
        // Check for overlaps with existing events
        const isOverlap = existingEvents.some((event) => {
          const bufferStart = addMinutes(slotStart, -options.bufferBefore);
          const bufferEnd = addMinutes(slotEnd, options.bufferAfter);
          
          return (
            (isBefore(bufferStart, event.end) && isAfter(bufferEnd, event.start))
          );
        });

        if (!isOverlap) {
          daySlots.push({
            start: format(slotStart, 'HH:mm'),
            end: format(slotEnd, 'HH:mm'),
          });
        }

        current = addMinutes(current, 15); // Check every 15 mins increment
      }
    });

    if (daySlots.length > 0) {
      result.push({ date: dateStr, slots: daySlots });
    }
  });

  return result;
}
