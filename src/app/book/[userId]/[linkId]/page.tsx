
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
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { calculateAvailableSlots } from '@/lib/availability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, CheckCircle2, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const linkId = params.linkId as string;
  
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [linkData, setLinkData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Day Select, 2: Time Select, 3: Form, 4: Success
  const [form, setForm] = useState({ name: '', email: '', note: '' });

  const sintiaSchedule = [
    { dayOfWeek: 1, enabled: false, slots: [] },
    { dayOfWeek: 2, enabled: true, slots: [{ start: '08:45', end: '11:50' }] },
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
          setLinkData({ title: 'Görüşme Randevusu', durationMinutes: 30, active: true });
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
        const workingHours = linkData?.workingHours || sintiaSchedule;

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

        const slots = calculateAvailableSlots(start, end, workingHours, busy, {
          duration: linkData?.durationMinutes || 30,
          bufferBefore: 0,
          bufferAfter: 0,
          timezone: userData?.timezone || 'UTC'
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
    if (!form.name) { toast({ variant: 'destructive', title: 'Hata', description: 'Adınızı girin.' }); return; }
    try {
      const start = parseISO(`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedSlot.start}`);
      const end = addMinutes(start, linkData.durationMinutes || 30);
      const bookingData = {
        userId, linkId, inviteeName: form.name, inviteeEmail: form.email, inviteeNote: form.note,
        start: start.toISOString(), end: end.toISOString(), status: 'confirmed', source: 'bookingLink',
        timezone: userData?.timezone || 'Europe/Istanbul', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'bookings'), bookingData);
      await addDoc(collection(db, 'users', userId, 'events'), {
        userId, title: `Randevu: ${form.name}`, start: start.toISOString(), end: end.toISOString(),
        type: 'booking', color: '#10b981', createdAt: serverTimestamp(),
      });
      setStep(4);
    } catch (error) { toast({ variant: 'destructive', title: 'Hata', description: 'Randevu oluşturulamadı.' }); }
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
      <div className="w-full max-w-2xl flex flex-col items-center mb-12">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
            <Avatar className="w-full h-full">
              <AvatarImage src={userData?.photoURL} />
              <AvatarFallback className="text-2xl">{userData?.displayName?.charAt(0) || 'E'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{userData?.displayName || 'EFE KÜÇÜKVARDAR'}</h2>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{linkData?.title || 'Görüşme Randevusu'}</h1>
        <div className="flex items-center gap-2 text-slate-500 bg-white/50 px-4 py-2 rounded-full shadow-sm">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{linkData?.durationMinutes || 30} Dakika Görüşme</span>
        </div>
      </div>

      <div className="w-full max-w-xl">
        {step === 1 ? (
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in fade-in duration-500">
            <h3 className="text-xl font-bold mb-8">Bir Gün Seçin</h3>
            <div className="flex gap-8">
              <div className="flex flex-col gap-4 pt-12">
                <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6" /></button>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold mb-6 px-2">{format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}</div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-tighter">
                  {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {miniCalendarDays.map((day, i) => {
                    const isCurMonth = isSameMonth(day, miniCalendarMonth);
                    const disabled = isBefore(day, startOfToday()) || getDay(day) === 0 || getDay(day) === 6 || getDay(day) === 1;
                    return (
                      <div key={i} onClick={() => !disabled && (setSelectedDate(day), setStep(2))}
                        className={cn("h-10 w-10 flex items-center justify-center rounded-full cursor-pointer transition-all m-auto text-sm",
                          !isCurMonth && "opacity-20",
                          disabled ? "cursor-not-allowed text-slate-300" : "hover:bg-slate-100 text-slate-900 font-medium",
                          selectedDate && isSameDay(day, selectedDate) && "bg-blue-600 text-white font-bold"
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
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold">Saat Seçin</h3>
                <p className="text-sm text-slate-500">{format(selectedDate!, 'd MMMM', { locale: tr })}</p>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {availableSlots.length === 0 ? (
                <p className="col-span-2 text-center text-slate-400 py-12 italic bg-slate-50 rounded-2xl">Bu gün için müsait saat kalmadı.</p>
              ) : (
                availableSlots.map((slot) => (
                  <Button key={slot.start} variant="outline" className="py-8 text-lg hover:bg-blue-600 hover:text-white rounded-2xl border-2 transition-all font-mono"
                    onClick={() => { setSelectedSlot(slot); setStep(3); }}>
                    {slot.start}
                  </Button>
                ))
              )}
            </div>
          </Card>
        ) : (
          <Card className="border-none shadow-2xl p-8 rounded-3xl animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setStep(2)}><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h3 className="text-xl font-bold">Bilgilerinizi Onaylayın</h3>
                <p className="text-sm text-slate-500">{format(selectedDate!, 'd MMMM yyyy', { locale: tr })} - {selectedSlot.start}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-600">Adınız Soyadınız</Label>
                <Input className="h-14 rounded-xl bg-slate-50 border-none text-lg" placeholder="Lütfen adınızı girin" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">E-posta (İsteğe bağlı)</Label>
                <Input className="h-14 rounded-xl bg-slate-50 border-none text-lg" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Görüşme Notu</Label>
                <Textarea className="rounded-xl bg-slate-50 border-none text-lg min-h-[120px]" placeholder="Varsa eklemek istedikleriniz..." value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} />
              </div>
              <Button className="w-full h-16 text-xl rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl" onClick={handleBook}>Randevuyu Kesinleştir</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
