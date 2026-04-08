
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';

const DAYS = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  { id: 6, name: 'Cumartesi' },
  { id: 0, name: 'Pazar' },
];

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = React.useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData, isLoading } = useDoc(userDocRef as any);
  const { setTheme } = useTheme();

  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [timezone, setTimezone] = useState('');
  const [themePreference, setThemePreference] = useState<'auto' | 'light' | 'dark'>('auto');

  useEffect(() => {
    if (userData) {
      setWorkingHours(userData.workingHours || []);
      setTimezone(userData.timezone || '');
      setThemePreference(userData.theme || 'auto');
    }
  }, [userData]);

  const handleUpdateWorkingHours = (dayOfWeek: number, field: string, value: any) => {
    setWorkingHours(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        if (field === 'slots') {
          return { ...day, slots: [{ ...day.slots[0], ...value }] };
        }
        return { ...day, [field]: value };
      }
      return day;
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        workingHours,
        timezone,
        theme: themePreference,
        updatedAt: serverTimestamp(),
      });
      setTheme(themePreference);
      toast({ title: 'Başarılı', description: 'Ayarlar güncellendi.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ayarlar kaydedilemedi.' });
    }
  };

  if (isLoading || !userData) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
        </div>

        <div className="grid gap-8">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Genel Bilgiler
              </CardTitle>
              <CardDescription>Bölgesel ve profil ayarlarınızı yönetin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="timezone">Zaman Dilimi</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Zaman dilimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Istanbul">İstanbul (GMT+3)</SelectItem>
                    <SelectItem value="Europe/London">Londra (GMT+0)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Görünüm
              </CardTitle>
              <CardDescription>Tema tercihlerinizi ayarlayın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="theme">Tema</Label>
                <Select value={themePreference} onValueChange={setThemePreference}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Tema seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Otomatik</SelectItem>
                    <SelectItem value="light">Açık</SelectItem>
                    <SelectItem value="dark">Koyu</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-500">
                  Otomatik seçildiğinde tarayıcı ayarlarınıza göre açık veya koyu moda geçiş yapılır.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Çalışma Saatleri
              </CardTitle>
              <CardDescription>Müsait olduğunuz gün ve saatleri belirleyin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {DAYS.map((day) => {
                const dayConfig = workingHours.find(wh => wh.dayOfWeek === day.id);
                if (!dayConfig) return null;

                return (
                  <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <Switch 
                        checked={dayConfig.enabled} 
                        onCheckedChange={(checked) => handleUpdateWorkingHours(day.id, 'enabled', checked)}
                      />
                      <span className="font-semibold">{day.name}</span>
                    </div>
                    
                    {dayConfig.enabled ? (
                      <div className="flex items-center gap-4 flex-1 justify-end">
                        <Input 
                          type="time" 
                          className="w-32"
                          value={dayConfig.slots[0]?.start || '09:00'}
                          onChange={(e) => handleUpdateWorkingHours(day.id, 'slots', { start: e.target.value })}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input 
                          type="time" 
                          className="w-32"
                          value={dayConfig.slots[0]?.end || '17:00'}
                          onChange={(e) => handleUpdateWorkingHours(day.id, 'slots', { end: e.target.value })}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Müsait Değil</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" className="px-12" onClick={handleSave}>Kaydet</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
