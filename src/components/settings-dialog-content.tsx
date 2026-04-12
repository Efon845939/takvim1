'use client';

import React, { useState, useEffect } from 'react';
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
  Bell, 
  Keyboard, 
  Plus,
  Mail,
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
import { Input } from '@/components/ui/input';
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

export function SettingsDialogContent({ onClose, user, userData, theme, setTheme }: SettingsDialogContentProps) {
  const [activeTab, setActiveTab] = useState('dil-bolge');
  const db = useFirestore();
  const { toast } = useToast();

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
    { id: 'genel', label: 'Genel', icon: Settings2, type: 'header' },
    { id: 'dil-bolge', label: 'Dil ve bölge', parent: 'genel' },
    { id: 'saat-dilimi', label: 'Saat dilimi', parent: 'genel' },
    { id: 'dunya-saati', label: 'Dünya saati', parent: 'genel' },
    { id: 'etkinlik-ayarlari', label: 'Etkinlik ayarları', parent: 'genel' },
    { id: 'bildirim-ayarlari', label: 'Bildirim ayarları', parent: 'genel' },
    { id: 'gorunum-secenekleri', label: 'Görünüm seçenekleri', parent: 'genel' },
    { id: 'workspace', label: 'Google Workspace özellikleri', parent: 'genel' },
    { id: 'kisayollar', label: 'Klavye kısayolları', parent: 'genel' },
    { id: 'takvim-ekle', label: 'Takvim ekle', icon: Plus, type: 'header' },
    { id: 'takvim-abone', label: 'Takvime abone ol', parent: 'takvim-ekle' },
    { id: 'yeni-takvim', label: 'Yeni takvim oluştur', parent: 'takvim-ekle' },
    { id: 'ilginc-takvimler', label: 'İlginç takvimler', parent: 'takvim-ekle' },
    { id: 'takvim-ayarlari', label: 'Takvimlerimin ayarları', type: 'header' },
    { id: 'user-calendar', label: user?.displayName || 'Kişisel', parent: 'takvim-ayarlari' },
    { id: 'family-calendar', label: 'Aile', parent: 'takvim-ayarlari' },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6 gap-6 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-medium">Ayarlar</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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

        {/* Content */}
        <main className="flex-1 p-12 overflow-y-auto bg-background custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-500">
            {activeTab === 'dil-bolge' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">Dil ve bölge</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>Dil</Label>
                    <Select defaultValue={userData?.language || "tr"} onValueChange={(v) => updateUserSetting('language', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>Ülke</Label>
                    <Select defaultValue={userData?.region || "TR"} onValueChange={(v) => updateUserSetting('region', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TR">Türkiye</SelectItem>
                        <SelectItem value="US">Amerika Birleşik Devletleri</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>Tarih biçimi</Label>
                    <Select defaultValue={userData?.dateFormat || "dmy"} onValueChange={(v) => updateUserSetting('dateFormat', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="dmy">31/12/2026</SelectItem><SelectItem value="mdy">12/31/2026</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>Saat biçimi</Label>
                    <Select defaultValue={userData?.timeFormat || "24"} onValueChange={(v) => updateUserSetting('timeFormat', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="24">13:00</SelectItem><SelectItem value="12">01:00 PM</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'saat-dilimi' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">Saat dilimi</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                    <Label>Birincil saat dilimi</Label>
                    <Select defaultValue={userData?.timezone || 'Europe/Istanbul'} onValueChange={(v) => updateUserSetting('timezone', v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b pb-6">
                    <div className="space-y-0.5">
                      <Label>İkincil saat dilimini göster</Label>
                      <p className="text-xs text-muted-foreground">İkincil bir saat dilimi ekleyerek planlamalarınızı yönetin.</p>
                    </div>
                    <Switch 
                      checked={userData?.secondaryTzEnabled || false} 
                      onCheckedChange={(checked) => updateUserSetting('secondaryTzEnabled', checked)} 
                    />
                  </div>
                  {(userData?.secondaryTzEnabled) && (
                    <div className="grid grid-cols-2 gap-8 items-center border-b pb-6 animate-in slide-in-from-top-2 duration-300">
                      <Label>İkincil saat dilimi</Label>
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
                <h3 className="text-2xl font-normal">Dünya saati</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-6">
                    <Label>Dünya saatini göster</Label>
                    <Switch 
                      checked={userData?.worldClockEnabled || false} 
                      onCheckedChange={(checked) => updateUserSetting('worldClockEnabled', checked)} 
                    />
                  </div>
                  {userData?.worldClockEnabled && (
                    <div className="p-6 bg-muted/30 rounded-xl border space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">İstanbul</span>
                        <WorldClock timezone="Europe/Istanbul" />
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-sm">New York</span>
                        <WorldClock timezone="America/New_York" />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'gorunum-secenekleri' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">Görünüm seçenekleri</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Palette className="w-5 h-5 text-primary" />
                      <Label>Tema Seçimi</Label>
                    </div>
                    <Select value={theme} onValueChange={(v) => {
                      setTheme(v);
                      updateUserSetting('theme', v);
                    }}>
                      <SelectTrigger className="w-[140px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Açık</div></SelectItem>
                        <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> Koyu</div></SelectItem>
                        <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Otomatik</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary" />
                      <Label>Yoğunluk</Label>
                    </div>
                    <Select defaultValue={userData?.density || "comfortable"} onValueChange={(v) => updateUserSetting('density', v)}>
                      <SelectTrigger className="w-[140px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comfortable">Rahat</SelectItem>
                        <SelectItem value="compact">Kompakt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'workspace' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">Google Workspace akıllı özellikleri</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <Info className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Workspace akıllı özellikleri, Gmail'deki uçuş ve rezervasyon bilgilerini otomatik olarak takviminize ekler.
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-b pb-6">
                    <Label>Gmail etkinliklerini otomatik göster</Label>
                    <Switch 
                      checked={userData?.gmailEventsEnabled !== false} 
                      onCheckedChange={(checked) => updateUserSetting('gmailEventsEnabled', checked)} 
                    />
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'kisayollar' && (
              <section className="space-y-8">
                <h3 className="text-2xl font-normal">Klavye kısayolları</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-6">
                    <Label>Klavye kısayollarını etkinleştir</Label>
                    <Switch 
                      checked={userData?.shortcutsEnabled !== false} 
                      onCheckedChange={(checked) => updateUserSetting('shortcutsEnabled', checked)} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                      <span className="text-sm">Etkinlik Oluştur</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">C</kbd>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                      <span className="text-sm">Bugüne Git</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">T</kbd>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                      <span className="text-sm">Arama</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">/</kbd>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                      <span className="text-sm">Kısayol Listesi</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">?</kbd>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Placeholder for other tabs */}
            {!['dil-bolge', 'saat-dilimi', 'dunya-saati', 'gorunum-secenekleri', 'workspace', 'kisayollar'].includes(activeTab) && (
              <SettingsPlaceholder tabId={activeTab} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function WorldClock({ timezone }: { timezone: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-lg font-mono font-medium">
      {time.toLocaleTimeString('tr-TR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}
