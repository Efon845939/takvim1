"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { TimeSlot } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface SlotPickerProps {
  slots: TimeSlot[];
  bookedSlots: string[]; // Array of startTime like "09:35"
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
}

export function SlotPicker({ slots, bookedSlots, selectedSlot, onSelect }: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Bu gün için müsait randevu bulunmamaktadır.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
      {slots.map((slot) => {
        const isBooked = bookedSlots.includes(slot.startTime);
        const isSelected = selectedSlot?.startTime === slot.startTime;

        return (
          <Button
            key={slot.startTime}
            variant={isSelected ? "default" : isBooked ? "outline" : "secondary"}
            disabled={isBooked}
            onClick={() => onSelect(slot)}
            className={cn(
              "h-14 flex flex-col items-center justify-center transition-all duration-200",
              isBooked && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-dashed",
              isSelected && "ring-2 ring-primary ring-offset-2 scale-105"
            )}
          >
            <span className="text-sm font-semibold flex items-center gap-1">
               {slot.startTime}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {isBooked ? "Dolu" : isSelected ? "Seçildi" : `${slot.endTime}'e kadar`}
            </span>
          </Button>
        );
      })}
    </div>
  );
}