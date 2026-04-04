"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAvailableSlotsForDate, isDayDisabled, TimeSlot } from '@/lib/schedule';
import { Calendar } from '@/components/ui/calendar';
import { SlotPicker } from '@/components/SlotPicker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateBookingConfirmation } from '@/ai/flows/booking-confirmation-generator';
import { CalendarDays, User, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [studentName, setStudentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ message: string; date: string; slot: TimeSlot } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate) {
      setSlots(getAvailableSlotsForDate(selectedDate));
      setSelectedSlot(null);

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const q = query(collection(db, 'appointments'), where('date', '==', dateStr));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const booked = snapshot.docs.map(doc => doc.data().startTime);
        setBookedSlots(booked);
      });

      return () => unsubscribe();
    }
  }, [selectedDate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot || !studentName.trim()) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      await addDoc(collection(db, 'appointments'), {
        studentName,
        date: dateStr,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        createdAt: serverTimestamp(),
      });

      const aiResponse = await generateBookingConfirmation({
        studentName,
        date: dateStr,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      });

      setBookingResult({
        message: aiResponse.message,
        date: dateStr,
        slot: selectedSlot
      });
      
      toast({ title: "Başarılı", description: "Randevunuz oluşturuldu." });
    } catch (error) {
      console.error("Booking error:", error);
      toast({ title: "Hata", description: "Randevu oluşturulamadı. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in zoom-in duration-500">
        <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl bg-white/90 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Harika!</CardTitle>
            <CardDescription className="text-base text-balance whitespace-pre-line leading-relaxed">
              {bookingResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Yeni Randevu Al
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:py-12 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
          Sintia Hoca Danışmanlık
        </h1>
        <p className="text-muted-foreground text-lg">Rehberlik Randevu Sistemi</p>
      </header>

      <section className="space-y-6">
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-primary/5 py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Adım 1: Tarih Seçin
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDayDisabled}
              locale={tr}
              className="p-4"
            />
          </CardContent>
        </Card>

        {selectedDate && (
          <Card className="shadow-lg border-none animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="border-b bg-primary/5 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className={cn("w-5 h-5 text-primary", isSubmitting && "animate-spin")} />
                Adım 2: Saat Dilimi Seçin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <SlotPicker
                slots={slots}
                bookedSlots={bookedSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            </CardContent>
          </Card>
        )}

        {selectedSlot && (
          <Card className="shadow-lg border-none animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="border-b bg-primary/5 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Adım 3: İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleBooking} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Adınız Soyadınız</Label>
                  <Input
                    id="name"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    className="h-12 text-lg"
                    autoComplete="name"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold transition-all hover:gap-4 flex items-center justify-center gap-2"
                  disabled={isSubmitting || !studentName.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin w-6 h-6" />
                  ) : (
                    <>
                      Randevu Al
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>

      <footer className="text-center py-8 text-muted-foreground/60 text-sm">
        © {new Date().getFullYear()} Sintia Hoca Danışmanlık. Tüm hakları saklıdır.
      </footer>
    </main>
  );
}