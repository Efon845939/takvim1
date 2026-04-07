
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
  startOfDay
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { calculateAvailableSlots } from '@/lib/availability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const linkId = params.linkId as string;
  
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [linkData, setLinkData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Day Select, 2: Time Select, 3: Form, 4: Success
  const [form, setForm] = useState({ name: '', email: '', note: '' });

  // Sintia Hoca's Specific Rules (Manual Logic)
  // Teacher UI overrides this in reality, but we hardcode for this link if "default"
  const sintiaSchedule = [
    { day: 2, slots: [{ start: '08:45', end: '11:50' }] }, // Salı
    { day: 3, slots: [{ start: '08:45', end: '09:25' }, { start: '10:25', end: '10:55' }, { start: '11:05', end: '11:35' }] }, // Çar
    { day: 4, slots: [{ start: '12:00', end: '12:30' }] }, // Per
    { day: 5, slots: [{ start: '08:45', end: '11:50' }] }, // Cum
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId || !linkId) return;
        
        const linkDoc = await getDoc(doc(db, 'users', userId, 'bookingLinks', linkId));
        if (linkDoc.exists()) {
          setLinkData(linkDoc.data());
        } else if (linkId === 'default') {
          setLinkData({ title: 'Görüşme Randevusu', durationMinutes: 30, active: true });
        }

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) setUserData(userDoc.data());

      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [db, userId, linkId]);

  // Fetch slots whenever date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !userId) return;
      
      try {
        const start = startOfDay(selectedDate);
        const end = addDays(start, 1);
        
        // Use teacher's schedule from firestore or fallback to Sintia's rules
        const workingHours = linkData?.workingHours || sintiaSchedule;

        // Fetch conflicting events
        const eventsQuery = query(
          collection(db, 'users', userId, 'events'),
          where('start', '>=', start.toISOString()),
          where('start', '<', end.toISOString())
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const busy = eventsSnapshot.docs.map(d => ({
          start: new Date(d.data().start),
          end: new Date(d.data().end)
        }));

        const slots = calculateAvailableSlots(
          start,
          end,
          workingHours,
          busy,
          {
            duration: linkData?.durationMinutes || 30,
            bufferBefore: 0,
            bufferAfter: 0,
            timezone: userData?.timezone || 'UTC'
          }
        );
        
        const dayResult = slots.find(s => isSameDay(parseISO(s.date), selectedDate));
        setAvailableSlots(dayResult?.slots || []);
      } catch (e) {
        console.error("Slot calc error:", e);
      }
    };
    fetchSlots();
  }, [selectedDate, linkData, userId, userData]);

  const handleBook = async () => {
    if (!form.name) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Adınızı girin.' });
      return;
    }

    try {
      const start = parseISO(`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedSlot.start}`);
      const end = addMinutes(start, linkData.durationMinutes || 30);

      const bookingData = {
        userId,
        linkId,
        inviteeName: form.name,
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-xl">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold mb-4">Onaylandı!</CardTitle>
          <p className="text-muted-foreground mb-6">Randevunuz başarıyla oluşturuldu.</p>
          <div className="bg-muted p-4 rounded-xl text-left">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate!, 'd MMMM yyyy', { locale: tr })}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {selectedSlot.start} - {selectedSlot.end}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 text-slate-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-10">
          <Avatar className="w-20 h-20 mb-4 border-4 border-white shadow-xl">
            <AvatarImage src={userData?.photoURL} />
            <AvatarFallback>{userData?.displayName?.charAt(0) || 'H'}</AvatarFallback>
          </Avatar>
          <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{userData?.displayName}</h1>
          <h2 className="text-3xl font-extrabold text-slate-900">{linkData?.title}</h2>
          <div className="mt-4 flex items-center gap-2 text-slate-500">
             <Clock className="w-4 h-4" />
             <span>{linkData?.durationMinutes} Dakika Görüşme</span>
          </div>
        </div>

        <div className="flex justify-center">
          {step === 1 ? (
            <Card className="w-full max-w-md border-none shadow-2xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg">Bir Gün Seçin</CardTitle>
              </CardHeader>
              <Calendar 
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  if (d) setStep(2);
                }}
                locale={tr}
                disabled={(date) => isBefore(date, startOfToday())}
                className="rounded-md border-none"
              />
            </Card>
          ) : step === 2 ? (
            <Card className="w-full max-w-md border-none shadow-2xl p-6">
               <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Saat Seçin</CardTitle>
                  <CardDescription>{format(selectedDate!, 'd MMMM', { locale: tr })}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {availableSlots.length === 0 ? (
                  <p className="col-span-2 text-center text-slate-400 py-8 italic">Müsait saat kalmadı.</p>
                ) : (
                  availableSlots.map((slot) => (
                    <Button 
                      key={slot.start} 
                      variant="outline" 
                      className="py-6 hover:bg-blue-600 hover:text-white transition-all font-mono"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep(3);
                      }}
                    >
                      {slot.start}
                    </Button>
                  ))
                )}
              </div>
            </Card>
          ) : (
            <Card className="w-full max-w-lg border-none shadow-2xl">
              <CardHeader>
                <Button variant="ghost" className="w-fit -ml-2 mb-4" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
                </Button>
                <CardTitle>Bilgilerinizi Onaylayın</CardTitle>
                <CardDescription>
                  {format(selectedDate!, 'd MMMM yyyy', { locale: tr })} saat {selectedSlot.start} için randevu oluşturuyorsunuz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Adınız Soyadınız</Label>
                  <Input 
                    placeholder="Lütfen adınızı girin" 
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-posta</Label>
                  <Input 
                    type="email"
                    placeholder="opsiyonel@mail.com" 
                    value={form.email} 
                    onChange={(e) => setForm({...form, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notunuz</Label>
                  <Textarea 
                    placeholder="Görüşme öncesi iletmek istediğiniz bir not var mı?"
                    value={form.note} 
                    onChange={(e) => setForm({...form, note: e.target.value})}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700" onClick={handleBook}>Randevuyu Kesinleştir</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
