'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Settings2, 
  Globe, 
  Clock, 
  Monitor, 
  Palette, 
  Sun, 
  Moon, 
  Shield, 
  Plus,
  Zap,
  Info
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SettingsPlaceholder } from './settings-placeholders';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogContentProps {
  onClose: () => void;
  user: any;
  userData: any;
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

const TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'İstanbul (GMT+3)' },
  { value: 'Europe/London', label: 'Londra (GMT+0)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (GMT+1)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Toronto', label: 'Toronto (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
];

const translations = {
  tr: {
    settings: 'Ayarlar',
    genel: 'Genel',
    dilBolge: 'Dil ve bölge',
    saatDilimi: 'Saat dilimi',
    dunyaSaati: 'Dünya saati',
    etkinlikAyarlari: 'Etkinlik ayarları',
    bildirimAyarlari: 'Bildirim ayarları',
    gorunumSecenekleri: 'Görünüm seçenekleri',
    workspace: 'Google Workspace özellikleri',
    kisayollar: 'Klavye kısayolları',
    takvimEkle: 'Takvim ekle',
    takvimAbone: 'Takvime abone ol',
    yeniTakvim: 'Yeni takvim oluştur',
    ilgincTakvimler: 'İlginç takvimler',
    takvimAyarlari: 'Takvimlerimin ayarları',
    dil: 'Dil',
    ulke: 'Ülke',
    tarihBicimi: 'Tarih biçimi',
    saatBicimi: 'Saat biçimi',
    birincilSaatDilimi: 'Birincil saat dilimi',
    ikincilSaatDilimiGoster: 'İkincil saat dilimini göster',
    ikincilSaatDilimi: 'İkincil saat dilimi',
    dunyaSaatiniGoster: 'Dünya saatini göster',
    temaSecimi: 'Tema Seçimi',
    yogunluk: 'Yoğunluk',
    workspaceInfo: 'Workspace akıllı özellikleri, Gmail\'deki uçuş ve rezervasyon bilgilerini otomatik olarak takviminize ekler.',
    gmailEtkinlikleri: 'Gmail etkinliklerini otomatik göster',
    kisayollarEtkin: 'Klavye kısayollarını etkinleştir',
    acik: 'Açık',
    koyu: 'Koyu',
    otomatik: 'Otomatik',
    raat: 'Rahat',
    kompakt: 'Kompakt'
  },
  en: {
    settings: 'Settings',
    genel: 'General',
    dilBolge: 'Language and region',
    saatDilimi: 'Time zone',
    dunyaSaati: 'World clock',
    etkinlikAyarlari: 'Event settings',
    bildirimAyarlari: 'Notification settings',
    gorunumSecenekleri: 'Appearance options',
    workspace: 'Google Workspace features',
    kisayollar: 'Keyboard shortcuts',
    takvimEkle: 'Add calendar',
    takvimAbone: 'Subscribe to calendar',
    yeniTakvim: 'Create new calendar',
    ilgincTakvimler: 'Interesting calendars',
    takvimAyarlari: 'Settings for my calendars',
    dil: 'Language',
    ulke: 'Country',
    tarihBicimi: 'Date format',
    saatBicimi: 'Time format',
    birincilSaatDilimi: 'Primary time zone',
    ikincilSaatDilimiGoster: 'Show secondary time zone',
    ikincilSaatDilimi: 'Secondary time zone',
    dunyaSaatiniGoster: 'Show world clock',
    temaSecimi: 'Theme Selection',
    yogunluk: 'Density',
    workspaceInfo: 'Workspace smart features automatically add flight and booking information from Gmail to your calendar.',
    gmailEtkinlikleri: 'Automatically show Gmail events',
    kisayollarEtkin: 'Enable keyboard shortcuts',
    acik: 'Light',
    koyu: 'Dark',
    otomatik: 'Automatic',
    raat: 'Comfortable',
    kompakt: 'Compact'
  }
};

export function SettingsDialogContent({ onClose, user, userData, theme, setTheme }: SettingsDialogContentProps) {
  const [activeTab, setActiveTab] = useState('dil-bolge');
  const db = useFirestore();
  const { toast } = useToast();

  const lang = userData?.language === 'en' ? 'en' : 'tr';
  const t = (key: keyof typeof translations['tr']) => translations[lang][key] || key;

  const updateUserSetting = async (field: string, value: any) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Settings update error:', error);
      toast({ variant: 'destructive', title: 'Hata', description: 'Ayarlar kaydedilemedi.' });
    }
  };

  const navItems = [
    { id: 'genel', label: t('genel'), icon: Settings2, type: 'header' },
    { id: 'dil-bolge', label: t('dilBolge'), parent: 'genel' },
    { id: 'saat-dilimi', label: t('saatDilimi'), parent: 'genel' },
    { id: 'dunya-saati', label: t('dunyaSaati'), parent: 'genel' },
    { id: 'etkinlik-ayarlari', label: t('etkinlikAyarlari'), parent: 'genel' },
    { id: 'bildirim-ayarlari', label: t('bildirimAyarlari'), parent: 'genel' },
    { id: 'gorunum-secenekleri', label: t('gorunumSecenekleri'), parent: 'genel' },
    { id: 'workspace', label: t('workspace'), parent: 'genel' },
    { id: 'kisayollar', label: t('kisayollar'), parent: 'genel' },
    { id: 'takvim-ekle', label: t('takvimEkle'), icon: Plus, type: 'header' },
    { id: 'takvim-abone', label: t('takvimAbone'), parent: 'takvim-ekle' },
    { id: 'yeni-takvim', label: t('yeniTakvim'), parent: 'takvim-ekle' },
    { id: 'ilginc-takvimler', label: t('ilgincTakvimler'), parent: 'takvim-ekle' },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="h-16 border-b flex items-center px-6 gap-6 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-medium">{t('settings')}</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[300px] border-r py-6 overflow-y-auto bg-muted/20 custom-scrollbar shrink-0">
          <div className="space-y-1">
            {navItems.map((item) => (
              <div key={item.id}>
                {item.type === 'header' ? (
                  <div className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveTab(item.id)} 
                    className={cn(
                      "w-full text-left px-10 py-2.5 text-sm font-medium transition-all border-l-4", 
                      activeTab === item.id 
                        ? "bg-primary/10 text-primary border-primary" 
                        : "text-foreground/70 border-transparent hover:bg-accent"
                    )}
                  >
                    {item.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto bg-background custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-500">
            {activeTab === 'dil-bolge' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">{t('dilBolge')}</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>{t('dil')}</Label>
                    <Select defaultValue={userData?.language || "tr"} onValueChange={(v) => updateUserSetting('language', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>{t('ulke')}</Label>
                    <Select defaultValue={userData?.region || "TR"} onValueChange={(v) => updateUserSetting('region', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="TR">Türkiye</SelectItem><SelectItem value="US">USA</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'saat-dilimi' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">{t('saatDilimi')}</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>{t('birincilSaatDilimi')}</Label>
                    <Select defaultValue={userData?.timezone || 'Europe/Istanbul'} onValueChange={(v) => updateUserSetting('timezone', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b pb-6">
                    <Label>{t('ikincilSaatDilimiGoster')}</Label>
                    <Switch checked={userData?.secondaryTzEnabled || false} onCheckedChange={(v) => updateUserSetting('secondaryTzEnabled', v)} />
                  </div>
                  {userData?.secondaryTzEnabled && (
                    <div className="grid grid-cols-2 gap-8 items-center border-b pb-6 animate-in slide-in-from-top-2">
                      <Label>{t('ikincilSaatDilimi')}</Label>
                      <Select defaultValue={userData?.secondaryTimezone || "America/New_York"} onValueChange={(v) => updateUserSetting('secondaryTimezone', v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'dunya-saati' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">{t('dunyaSaati')}</h3>
                <div className="flex items-center justify-between border-b pb-6">
                  <Label>{t('dunyaSaatiniGoster')}</Label>
                  <Switch checked={userData?.worldClockEnabled || false} onCheckedChange={(v) => updateUserSetting('worldClockEnabled', v)} />
                </div>
              </section>
            )}

            {activeTab === 'gorunum-secenekleri' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">{t('gorunumSecenekleri')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <Label>Hafta sonlarını göster</Label>
                    <Switch checked={userData?.showWeekends !== false} onCheckedChange={(v) => updateUserSetting('showWeekends', v)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <Label>Hafta numaralarını göster</Label>
                    <Switch checked={userData?.showWeekNumbers || false} onCheckedChange={(v) => updateUserSetting('showWeekNumbers', v)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <Label>Geçmiş etkinliklerin parlaklığını azalt</Label>
                    <Switch checked={userData?.dimPastEvents || false} onCheckedChange={(v) => updateUserSetting('dimPastEvents', v)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <Label>{t('temaSecimi')}</Label>
                    <Select value={theme} onValueChange={(v) => { setTheme(v); updateUserSetting('theme', v); }}>
                      <SelectTrigger className="w-[140px] bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Açık</SelectItem>
                        <SelectItem value="dark">Koyu</SelectItem>
                        <SelectItem value="system">Sistem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {!['dil-bolge', 'saat-dilimi', 'dunya-saati', 'gorunum-secenekleri'].includes(activeTab) && (
              <SettingsPlaceholder tabId={activeTab} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
