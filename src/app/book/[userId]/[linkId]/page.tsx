
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  format, 
  addDays, 
  startOfToday, 
  parseISO, 
  addMinutes,
  isSameDay,
  isBefore,
  startOfDay,
  startOfMonth,
  getDay,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { calculateAvailableSlots } from '@/lib/availability';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const linkId = params.linkId as string;
  
  const db = useFirestore();
  const { toast } = useToast();

  const [linkData, setLinkData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Day, 2: Time, 3: Form, 4: Success
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });

  // Standard Teacher Schedule for fallback
  const defaultSchedule = [
    { dayOfWeek: 1, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 2, enabled: true, slots: [{ start: '08:45', end: '11:50' }, { start: '12:00', end: '12:35' }, { start: '14:05', end: '15:25' }] },
    { dayOfWeek: 3, enabled: true, slots: [{ start: '08:45', end: '09:25' }, { start: '10:25', end: '10:55' }, { start: '11:05', end: '11:35' }] },
    { dayOfWeek: 4, enabled: true, slots: [{ start: '12:00', end: '12:30' }] },
    { dayOfWeek: 5, enabled: true, slots: [{ start: '08:45', end: '11:50' }] },
    { dayOfWeek: 6, enabled: false, slots: [] },
    { dayOfWeek: 0, enabled: false, slots: [] },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId || !linkId) return;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) setUserData(userDoc.data());

        const linkDoc = await getDoc(doc(db, 'users', userId, 'bookingLinks', linkId));
        if (linkDoc.exists()) {
          setLinkData(linkDoc.data());
        } else if (linkId === 'default') {
          setLinkData({ 
            title: 'Görüşme Randevusu', 
            durationMinutes: 30, 
            active: true,
            schedule: defaultSchedule 
          });
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [db, userId, linkId]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !userId) return;
      try {
        const start = startOfDay(selectedDate);
        const end = addDays(start, 1);
        const schedule = linkData?.schedule || defaultSchedule;

        const eventsQuery = query(collection(db, 'users', userId, 'events'), 
          where('start', '>=', start.toISOString()), 
          where('start', '<', end.toISOString())
        );
        const apptsQuery = query(collection(db, 'users', userId, 'bookings'),
          where('start', '>=', start.toISOString()),
          where('start', '<', end.toISOString())
        );

        const [evSnap, appSnap] = await Promise.all([getDocs(eventsQuery), getDocs(apptsQuery)]);
        const busy = [
          ...evSnap.docs.map(d => ({ start: new Date(d.data().start), end: new Date(d.data().end) })),
          ...appSnap.docs.map(d => ({ start: new Date(d.data().start), end: new Date(d.data().end) }))
        ];

        const slots = calculateAvailableSlots(start, end, schedule, busy, {
          duration: linkData?.durationMinutes || 30,
          bufferBefore: linkData?.bookedSettings?.bufferBefore || 0,
          bufferAfter: linkData?.bookedSettings?.bufferAfter || 0,
          timezone: userData?.timezone || 'Europe/Istanbul'
        });
        
        const dayResult = slots.find(s => isSameDay(parseISO(s.date), selectedDate));
        setAvailableSlots(dayResult?.slots || []);
      } catch (e) { console.error("Slot error:", e); }
    };
    fetchSlots();
  }, [selectedDate, linkData, userId, userData]);

  const miniCalendarDays = React.useMemo(() => {
    const start = startOfMonth(miniCalendarMonth);
    const startDay = getDay(start) === 0 ? 6 : getDay(start) - 1;
    const calendarStart = addDays(start, -startDay);
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));
  }, [miniCalendarMonth]);

  const handleBook = async () => {
    if (!form.name || !form.phone) { 
      toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen adınızı ve telefon numaranızı girin.' }); 
      return; 
    }
    try {
      const start = parseISO(`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedSlot.start}`);
      const end = addMinutes(start, linkData.durationMinutes || 30);
      
      const bookingData = {
        userId, 
        linkId, 
        studentName: form.name, 
        phone: form.phone,
        inviteeEmail: form.email, 
        inviteeNote: form.note,
        start: start.toISOString(), 
        end: end.toISOString(), 
        status: 'confirmed', 
        source: 'bookingLink',
        timezone: userData?.timezone || 'Europe/Istanbul', 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', userId, 'bookings'), bookingData);
      await addDoc(collection(db, 'users', userId, 'events'), {
        userId, 
        title: `Randevu: ${form.name}`, 
        start: start.toISOString(), 
        end: end.toISOString(),
        type: 'booking', 
        color: '#10b981', 
        createdAt: serverTimestamp(),
      });
      setStep(4);
    } catch (error) { 
      toast({ variant: 'destructive', title: 'Hata', description: 'Randevu oluşturulamadı.' }); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-800">Yükleniyor...</div>;

  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-2xl">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <CardTitle className="text-2xl font-bold mb-4">Onaylandı!</CardTitle>
          <p className="text-muted-foreground mb-6">Randevunuz başarıyla oluşturuldu.</p>
          <div className="bg-slate-100 p-4 rounded-xl text-left">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarIcon className="w-4 h-4" /> {format(selectedDate!, 'd MMMM yyyy', { locale: tr })}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Clock className="w-4 h-4" /> {selectedSlot.start} - {selectedSlot.end}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 text-slate-900 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
            <Avatar className="w-full h-full">
              <AvatarImage src={userData?.photoURL} />
              <AvatarFallback className="text-2xl bg-blue-600 text-white">{userData?.displayName?.charAt(0) || 'E'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{userData?.displayName || 'DANIŞMAN'}</h2>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">{linkData?.title || 'Görüşme Randevusu'}</h1>
        <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-full shadow-md border border-slate-100">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{linkData?.durationMinutes || 30} Dakika Görüşme</span>
        </div>
      </div>

      <div className="w-full max-w-xl">
        {step === 1 ? (
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-bold mb-8 text-center">Bir Gün Seçin</h3>
            <div className="flex gap-4 sm:gap-8 flex-col sm:flex-row">
              <div className="flex sm:flex-col justify-center gap-4 py-2">
                <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-all border border-slate-100"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-all border border-slate-100"><ChevronRight className="w-6 h-6" /></button>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold mb-6 px-2 text-blue-600 uppercase tracking-wider">{format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}</div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 mb-4 uppercase">
                  {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {miniCalendarDays.map((day, i) => {
                    const isCurMonth = isSameMonth(day, miniCalendarMonth);
                    const disabled = isBefore(day, startOfToday());
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    return (
                      <div key={i} onClick={() => !disabled && (setSelectedDate(day), setStep(2))}
                        className={cn("h-10 w-10 flex items-center justify-center rounded-full cursor-pointer transition-all m-auto text-sm font-semibold",
                          !isCurMonth && "opacity-20",
                          disabled ? "cursor-not-allowed text-slate-300" : "hover:bg-blue-50 hover:text-blue-600 text-slate-900",
                          selectedDate && isSameDay(day, selectedDate) && "bg-blue-600 text-white shadow-lg",
                          isWeekend && !disabled && "text-slate-400"
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ) : step === 2 ? (
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold">Saat Seçin</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{format(selectedDate!, 'd MMMM yyyy', { locale: tr })}</p>
              </div>
              <Button variant="ghost" className="rounded-full" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-2" /> Geri</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {availableSlots.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium italic">Bu gün için müsait saat kalmadı.</p>
                </div>
              ) : (
                availableSlots.map((slot) => (
                  <Button key={slot.start} variant="outline" className="py-8 text-lg hover:bg-blue-600 hover:text-white rounded-2xl border-2 hover:border-blue-600 transition-all font-mono shadow-sm"
                    onClick={() => { setSelectedSlot(slot); setStep(3); }}>
                    {slot.start}
                  </Button>
                ))
              )}
            </div>
          </Card>
        ) : (
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold">Onay ve İletişim</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {format(selectedDate!, 'd MMMM', { locale: tr })} - {selectedSlot.start}
                </p>
              </div>
              <Button variant="ghost" className="rounded-full" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-2" /> Geri</Button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Adınız Soyadınız *</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-100 border-none text-lg focus-visible:ring-blue-600" 
                  placeholder="Lütfen tam adınızı girin" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Telefon Numarası *</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <Input 
                    type="tel"
                    className="h-14 pl-12 rounded-2xl bg-slate-100 border-none text-lg focus-visible:ring-blue-600" 
                    placeholder="0530 151 58 22" 
                    value={form.phone} 
                    onChange={(e) => setForm({...form, phone: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">E-posta (Opsiyonel)</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-100 border-none text-lg focus-visible:ring-blue-600" 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Görüşme Notu</Label>
                <Textarea 
                  className="rounded-2xl bg-slate-100 border-none text-lg min-h-[100px] focus-visible:ring-blue-600" 
                  placeholder="Varsa eklemek istediğiniz bir not..." 
                  value={form.note} 
                  onChange={(e) => setForm({...form, note: e.target.value})} 
                />
              </div>
              <Button 
                className="w-full h-16 text-xl rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]" 
                onClick={handleBook}
              >
                Randevuyu Onayla
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
