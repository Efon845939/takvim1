'use client';

import React from 'react';
import { Settings2, Hammer, Info } from 'lucide-react';

interface SettingsPlaceholderProps {
  tabId: string;
}

export function SettingsPlaceholder({ tabId }: SettingsPlaceholderProps) {
  const titles: Record<string, string> = {
    'etkinlik-ayarlari': 'Etkinlik Ayarları',
    'bildirim-ayarlari': 'Bildirim Ayarları',
    'takvim-abone': 'Takvime Abone Ol',
    'yeni-takvim': 'Yeni Takvim Oluştur',
    'ilginc-takvimler': 'İlginç Takvimler',
    'user-calendar': 'Kişisel Takvim Ayarları',
    'family-calendar': 'Aile Takvimi Ayarları',
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-300">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Hammer className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold mb-2">{titles[tabId] || 'Hazırlanıyor'}</h3>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        Bu bölüm şu an geliştirme aşamasındadır. Google Calendar standartlarına uygun detaylı kontroller yakında burada olacak.
      </p>
      <div className="mt-8 flex items-center gap-2 text-xs font-medium text-muted-foreground/60 bg-muted/30 px-4 py-2 rounded-full border">
        <Info className="w-3.5 h-3.5" />
        V10.2 Roadmap: Özelleştirilmiş bildirim motoru ve entegre takvim paylaşımı.
      </div>
    </div>
  );
}
