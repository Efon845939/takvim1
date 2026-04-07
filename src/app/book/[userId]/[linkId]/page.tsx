
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc } from '@/firebase';
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
  isBefore, 
  isAfter,
  addMinutes
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { calculateAvailableSlots } from '@/lib/availability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const linkId = params.linkId as string;
  
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [linkData, setLinkData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Select Time, 2: Info, 3: Success
  const [form, setForm] = useState({ name: '', email: '', note: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const linkDoc = await getDoc(doc(db, 'users', userId, 'bookingLinks', linkId));
        if (!linkDoc.exists() || !linkDoc.data().active) {
          router.push('/404');
          return;
        }
        setLinkData(linkDoc.data());

        const userDoc = await getDoc(doc(db, 'users', userId));
        setUserData(userDoc.data());

        // Fetch events for availability calculation (next 14 days)
        const start = startOfToday();
        const end = addDays(start, 14);
        
        const eventsQuery = query(
          collection(db, 'users', userId, 'events'),
          where('start', '>=', start.toISOString()),
          where('start', '<=', end.toISOString())
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const existingEvents = eventsSnapshot.docs.map(d => ({
          start: new Date(d.data().start),
          end: new Date(d.data().end)
        }));

        const slots = calculateAvailableSlots(
          start,
          end,
          userDoc.data()?.workingHours || [],
          existingEvents,
          {
            duration: linkDoc.data().durationMinutes,
            bufferBefore: 0,
            bufferAfter: 0,
            timezone: userDoc.data()?.timezone || 'UTC'
          }
        );
        setAvailableSlots(slots);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [db, userId, linkId, router]);

  const handleBook = async () => {
    if (!form.name) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen adınızı girin.' });
      return;
    }

    try {
      const start = parseISO(`${selectedSlot.date}T${selectedSlot.slot.start}`);
      const end = addMinutes(start, linkData.durationMinutes);

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
        timezone: userData.timezone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create Booking record
      await addDoc(collection(db, 'users', userId, 'bookings'), bookingData);
      
      // Create Event record for host
      await addDoc(collection(db, 'users', userId, 'events'), {
        userId,
        title: `Randevu: ${form.name}`,
        description: `Link: ${linkData.title}\nNot: ${form.note}`,
        start: start.toISOString(),
        end: end.toISOString(),
        type: 'booking',
        color: '#10b981',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStep(3);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Randevu oluşturulamadı.' });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Randevunuz Onaylandı!</CardTitle>
            <CardDescription>
              {userData?.displayName} ile olan randevunuz başarıyla oluşturuldu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarIcon className="w-4 h-4" />
                {format(parseISO(selectedSlot.date), 'd MMMM yyyy', { locale: tr })}
              </div>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {selectedSlot.slot.start} - {selectedSlot.slot.end}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-white shadow-lg">
            <AvatarFallback className="text-2xl">{userData?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-medium text-muted-foreground">{userData?.displayName}</h1>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{linkData?.title}</h2>
          <div className="flex items-center justify-center gap-4 mt-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {linkData?.durationMinutes} Dakika
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="grid gap-6">
            <h3 className="text-xl font-bold text-center">Bir Zaman Dilimi Seçin</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSlots.map((day) => (
                <Card key={day.date}>
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-sm font-semibold capitalize">
                      {format(parseISO(day.date), 'EEEE, d MMM', { locale: tr })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-2">
                    {day.slots.map((slot: any) => (
                      <Button 
                        key={slot.start} 
                        variant="outline" 
                        className="w-full justify-between"
                        onClick={() => {
                          setSelectedSlot({ date: day.date, slot });
                          setStep(2);
                        }}
                      >
                        {slot.start}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <Button variant="ghost" className="w-fit mb-4 -ml-2" onClick={() => setStep(1)}>
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Geri Dön
              </Button>
              <CardTitle>Bilgilerinizi Girin</CardTitle>
              <CardDescription>
                {format(parseISO(selectedSlot.date), 'd MMMM yyyy', { locale: tr })} saat {selectedSlot.slot.start} için randevu oluşturulacak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input 
                  id="name" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Zorunlu"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-posta (Opsiyonel)</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Not (Opsiyonel)</Label>
                <Textarea 
                  id="note" 
                  value={form.note} 
                  onChange={(e) => setForm({...form, note: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full py-6 text-lg" onClick={handleBook}>Randevuyu Onayla</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
