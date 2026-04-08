
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useAuth, useDoc, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isToday, 
  startOfMonth, 
  getDay,
  isSameDay,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
  addMonths,
  subMonths,
  addDays as addDaysFn,
  subDays as subDaysFn,
  isSameMonth,
  startOfToday
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut, 
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  HelpCircle,
  X,
  Check,
  Globe,
  QrCode,
  ExternalLink,
  ArrowLeft,
  Clock,
  Users,
  Video,
  MapPin,
  AlignLeft,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Sparkles,
  Search as SearchIcon,
  Trash2,
  Bell,
  MinusCircle,
  Keyboard,
  Zap,
  Mail,
  Copy,
  Info,
  CalendarCheck2,
  Download,
  Upload,
  User,
  Star,
  Settings2,
  Monitor,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { QRCodeSVG } from 'qrcode.react';
import { calendarHelper } from '@/ai/flows/calendar-helper';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTheme } from 'next-themes';

const COUNTRY_LIST = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'ABD' },
  { code: 'GB', name: 'Birleşik Krallık' },
  { code: 'DE', name: 'Almanya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'ES', name: 'İspanya' },
  { code: 'IT', name: 'İtalya' }
];

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [view, setView] = useState<'gün' | 'hafta' | 'ay' | 'plan'>('hafta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);
  
  // Settings UI States (Google Clone Logic)
  const [settingsTab, setSettingsTab] = useState('dil-bolge');
  const [openSettingsSections, setOpenSettingsSections] = useState({
    genel: true,
    takvimEkle: true,
    takvimlerim: true,
    digerTakvimler: true
  });

  const [hideWeekends, setHideWeekends] = useState(false);
  
  // Event Form
  const [activeEventTab, setActiveTab] = useState('Etkinlik');
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: format(new Date(), "yyyy-MM-dd'T'09:00"),
    end: format(new Date(), "yyyy-MM-dd'T'10:00"),
    type: 'personal',
    color: '#3b82f6',
    guests: '',
    location: '',
    reminder: '30',
    visibility: 'default'
  });

  // Appointment Schedule Form (V9 Precise UI)
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    duration: '30',
    repeatType: 'everyWeek',
    schedule: [
      { dayOfWeek: 1, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      { dayOfWeek: 2, enabled: true, slots: [{ start: '08:45', end: '11:50' }, { start: '12:00', end: '12:35' }, { start: '14:05', end: '15:25' }] },
      { dayOfWeek: 3, enabled: true, slots: [{ start: '08:45', end: '09:25' }, { start: '10:25', end: '10:55' }, { start: '11:05', end: '11:35' }] },
      { dayOfWeek: 4, enabled: true, slots: [{ start: '12:00', end: '12:30' }] },
      { dayOfWeek: 5, enabled: true, slots: [{ start: '08:45', end: '11:50' }] },
      { dayOfWeek: 6, enabled: false, slots: [] },
      { dayOfWeek: 0, enabled: false, slots: [] },
    ],
    timezone: 'Europe/Istanbul',
    planningWindow: { startInDays: 60, minLeadTimeInHours: 4 },
    bookedSettings: { bufferBefore: 0, bufferAfter: 0, maxPerDay: 0 }
  });

  const [filters, setFilters] = useState({
    personal: true,
    booking: true,
    holiday: true,
    family: true,
  });

  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedCountries, setSelectedCountries] = useState(['TR', 'US', 'GB']);
  const [countrySearch, setCountrySearch] = useState('');

  // AI Helper State
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- REFRESH CURRENT TIME ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- FETCH HOLIDAYS ---
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = currentDate.getFullYear();
        let allHolidays: any[] = [];
        for (const code of selectedCountries) {
          const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`);
          if (response.ok) {
            const data = await response.json();
            allHolidays = [...allHolidays, ...data.map((h: any, idx: number) => ({
              id: `holiday-${code}-${h.date}-${h.name || h.localName}-${idx}`,
              title: `${h.localName} (${code})`,
              start: h.date,
              end: h.date,
              type: 'holiday',
              color: '#10b981',
              country: code
            }))];
          }
        }
        setHolidays(allHolidays.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()));
      } catch (error) {
        console.error('Holidays API failed:', error);
      }
    };
    fetchHolidays();
  }, [currentDate, selectedCountries]);

  // --- MEMOIZED QUERIES ---
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'events'), orderBy('start', 'asc'));
  }, [db, user?.uid]);

  const { data: eventsData } = useCollection(eventsQuery);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: userData } = useDoc(userDocRef);

  const isTeacher = ["proturkgamerefe@gmail.com", "sintiya.ugur@bahcesehir.k12.tr"].includes(user?.email || "");

  const combinedEvents = React.useMemo(() => {
    const userEvents = eventsData || [];
    const holidayEvents = filters.holiday ? holidays : [];
    const typedEvents = userEvents.filter(e => filters[e.type as keyof typeof filters]);
    const combined = [...typedEvents, ...holidayEvents];
    return combined.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
      .map((e, idx) => ({ ...e, uniqueId: e.id || `h-${e.start}-${idx}` }));
  }, [eventsData, holidays, filters]);

  const weekDays = React.useMemo(() => {
    if (view === 'gün') return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    let days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    if (hideWeekends) days = days.filter(d => getDay(d) !== 0 && getDay(d) !== 6);
    return days;
  }, [currentDate, hideWeekends, view]);

  const monthDays = React.useMemo(() => {
    const start = startOfMonth(currentDate);
    const startDay = getDay(start) === 0 ? 6 : getDay(start) - 1;
    const calendarStart = addDays(start, -startDay);
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));
  }, [currentDate]);

  const miniCalendarDays = React.useMemo(() => {
    const start = startOfMonth(miniCalendarMonth);
    const startDay = getDay(start) === 0 ? 6 : getDay(start) - 1;
    const calendarStart = addDays(start, -startDay);
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));
  }, [miniCalendarMonth]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // --- ACTIONS ---
  const handleDateSelect = (date: Date, hour: number) => {
    const start = setMinutes(setHours(date, hour), 0);
    const end = setMinutes(setHours(date, hour + 1), 0);
    setSelectedEvent(null);
    setActiveTab('Etkinlik');
    setEventForm({
      title: '',
      description: '',
      start: format(start, "yyyy-MM-dd'T'HH:mm"),
      end: format(end, "yyyy-MM-dd'T'HH:mm"),
      type: 'personal',
      color: '#3b82f6',
      guests: '',
      location: '',
      reminder: '30',
      visibility: 'default'
    });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    if (event.type === 'holiday') return;
    setSelectedEvent(event);
    setActiveTab('Etkinlik');
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: format(parseISO(event.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(parseISO(event.end), "yyyy-MM-dd'T'HH:mm"),
      type: event.type,
      color: event.color,
      guests: event.guests || '',
      location: event.location || '',
      reminder: event.reminder || '30',
      visibility: event.visibility || 'default'
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!user) return;
    try {
      if (activeEventTab === 'Randevu programı') {
        await addDoc(collection(db, 'users', user.uid, 'bookingLinks'), {
          ...appointmentForm,
          title: appointmentForm.title || 'Görüşme Randevusu',
          durationMinutes: parseInt(appointmentForm.duration),
          active: true,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Randevu programı oluşturuldu' });
      } else {
        const start = new Date(eventForm.start).toISOString();
        const end = new Date(eventForm.end).toISOString();
        const eventData = { ...eventForm, start, end, userId: user.uid, updatedAt: serverTimestamp() };
        if (selectedEvent) {
          await updateDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id), eventData);
          toast({ title: 'Güncellendi' });
        } else {
          await addDoc(collection(db, 'users', user.uid, 'events'), { ...eventData, createdAt: serverTimestamp() });
          toast({ title: 'Oluşturuldu' });
        }
      }
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    }
  };

  const handleAiSend = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiLoading(true);
    try {
      const response = await calendarHelper({ message: msg });
      setAiMessages(prev => [...prev, { role: 'ai', text: response.reply }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'Üzgünüm, şu an yardımcı olamıyorum.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      const today = new Date();
      setCurrentDate(today);
      setMiniCalendarMonth(today);
      return;
    }
    const amount = view === 'ay' ? 1 : view === 'hafta' ? (hideWeekends ? 5 : 7) : 1;
    const fn = dir === 'next' ? addDaysFn : subDaysFn;
    if (view === 'ay') {
      const nextMonth = dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
      setCurrentDate(nextMonth);
      setMiniCalendarMonth(nextMonth);
    } else {
      setCurrentDate(prev => fn(prev, amount));
    }
  };

  const headerTitle = React.useMemo(() => {
    if (view === 'ay') return format(currentDate, 'MMMM yyyy', { locale: tr });
    if (view === 'gün') return format(currentDate, 'd MMMM yyyy', { locale: tr });
    return `${format(weekDays[0], 'd')} – ${format(weekDays[weekDays.length - 1], 'd MMMM yyyy', { locale: tr })}`;
  }, [currentDate, weekDays, view]);

  const filteredCountries = COUNTRY_LIST.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-[#202124] text-white">Yükleniyor...</div>;

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden text-foreground font-sans select-none">
      
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b flex items-center px-4 justify-between shrink-0 bg-background z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mr-4">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span className="text-xl font-medium tracking-tight">Takvim</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('today')} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors ml-4">Bugün</button>
            <div className="flex items-center gap-0.5 ml-2">
              <button onClick={() => navigate('prev')} className="p-2 hover:bg-accent rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => navigate('next')} className="p-2 hover:bg-accent rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <h2 className="text-[20px] font-normal ml-4 min-w-[200px]">{headerTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors"><Search className="w-5 h-5" /></button>
          <button onClick={() => setIsInfoOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors"><HelpCircle className="w-5 h-5" /></button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors"><Settings className="w-5 h-5" /></button>
          
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[100px] h-9 ml-2 bg-transparent font-medium text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gün">Gün</SelectItem>
              <SelectItem value="hafta">Hafta</SelectItem>
              <SelectItem value="ay">Ay</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
            </SelectContent>
          </Select>

          {!user ? (
            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm" asChild className="text-sm font-medium"><Link href="/login">Giriş Yap</Link></Button>
              <Button size="sm" asChild className="text-sm font-medium"><Link href="/register">Kayıt Ol</Link></Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ml-4 border">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-3 border-b">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                {isTeacher && (
                  <>
                    <DropdownMenuItem onClick={() => setIsQrModalOpen(true)} className="cursor-pointer"><QrCode className="w-4 h-4 mr-2" /> Randevu QR & Link</DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer"><Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Ayarlar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-medium cursor-pointer" onClick={() => auth.signOut()}><LogOut className="w-4 h-4 mr-2" /> Çıkış Yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-[280px] border-r p-4 shrink-0 overflow-y-auto bg-background flex flex-col gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-card border shadow-sm px-4 py-3 rounded-full hover:bg-accent transition-all font-medium text-[14px] w-full">
                  <Plus className="w-6 h-6 text-primary" />
                  <span>Oluştur</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Etkinlik'); setIsEventModalOpen(true); }} className="cursor-pointer"><Plus className="w-4 h-4 mr-2" /> Etkinlik</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Görev'); setIsEventModalOpen(true); }} className="cursor-pointer"><Check className="w-4 h-4 mr-2" /> Görev</DropdownMenuItem>
                {isTeacher && (
                  <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Randevu programı'); setIsEventModalOpen(true); }} className="cursor-pointer text-primary font-semibold"><Clock className="w-4 h-4 mr-2" /> Randevu programı</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="px-1">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[14px] font-medium">{format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}</h3>
                <div className="flex gap-0.5">
                  <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-accent rounded-full transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-accent rounded-full transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-muted-foreground font-medium uppercase">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="w-8">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {miniCalendarDays.map((day, i) => {
                  const isCurMonth = isSameMonth(day, miniCalendarMonth);
                  const isDayToday = isToday(day);
                  const isDaySelected = isSameDay(day, currentDate);
                  return (
                    <div key={i} onClick={() => { setCurrentDate(day); setMiniCalendarMonth(day); }}
                      className={cn("h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition-all m-auto text-[12px]",
                        !isCurMonth && "text-muted-foreground/50",
                        isCurMonth && !isDayToday && !isDaySelected && "hover:bg-accent",
                        isDayToday && !isDaySelected && "text-primary font-bold",
                        isDaySelected && "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">Takvimlerim</h3>
                <div className="space-y-1">
                  {[{ id: 'personal', label: 'Kişisel', color: '#3b82f6' }, { id: 'family', label: 'Aile', color: '#8b5cf6' }, { id: 'booking', label: 'Randevular', color: '#10b981' }].map(filter => (
                    <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md transition-colors">
                      <Checkbox checked={filters[filter.id as keyof typeof filters]} onCheckedChange={(checked) => setFilters({...filters, [filter.id]: !!checked})} />
                      <span className="text-[13px] font-medium">{filter.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between px-2 mb-2 group">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Diğer Takvimler</h3>
                  <button onClick={() => setIsCountryModalOpen(true)} className="p-1 hover:bg-accent rounded-full transition-opacity opacity-0 group-hover:opacity-100"><Plus className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-1">
                  {selectedCountries.map(code => (
                    <label key={code} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md transition-colors">
                      <Checkbox checked={filters.holiday} onCheckedChange={(checked) => setFilters({...filters, holiday: !!checked})} />
                      <span className="text-[13px] font-medium">{COUNTRY_LIST.find(c => c.code === code)?.name || code} Tatilleri</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {view !== 'plan' && (
            <div className="flex pr-[15px] shrink-0 border-b">
              <div className="w-[64px] shrink-0"></div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                {weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-4 gap-1">
                      <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>{format(day, 'eee', { locale: tr })}</span>
                      <div className={cn("w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors", isToday(day) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}><span className="text-[24px] font-medium">{format(day, 'd')}</span></div>
                    </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative" ref={gridScrollRef}>
            {view === 'ay' ? (
              <div className="grid grid-cols-7 h-full min-h-[600px] border-l">
                {monthDays.map((day, i) => {
                  const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                  return (
                    <div key={`month-day-${i}`} className={cn("border-r border-b p-2 hover:bg-accent/50 transition-colors cursor-pointer flex flex-col items-end", !isSameMonth(day, currentDate) && "opacity-30")} onClick={() => handleDateSelect(day, 9)}>
                      <div className={cn("text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{format(day, 'd')}</div>
                      <div className="w-full space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event: any) => (
                          <div key={event.uniqueId} className="text-[10px] px-1.5 py-0.5 rounded text-white truncate font-medium" style={{ backgroundColor: event.color }}>{event.title}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : view === 'plan' ? (
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold border-b pb-4">Program Akışı</h1>
                {combinedEvents.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Planlanmış bir etkinlik bulunmuyor.</div>
                ) : (
                  <div className="space-y-4">
                    {combinedEvents.map((event: any) => (
                      <div key={event.uniqueId} className="flex gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => handleEventClick(event)}>
                        <div className="w-1 rounded-full" style={{ backgroundColor: event.color }} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">{format(parseISO(event.start), 'd MMMM yyyy HH:mm', { locale: tr })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex relative h-[1920px]">
                <div className="w-[64px] shrink-0 border-r">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-[80px] relative">
                      <span className="absolute -top-[7px] right-2 text-[11px] text-muted-foreground font-medium">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative border-t grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((_, i) => <div key={i} className="h-[80px] border-b w-full"></div>)}
                  </div>

                  {weekDays.map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                    return (
                      <div key={i} className={cn("relative border-r cursor-pointer hover:bg-accent/20 transition-colors", isToday(day) && "bg-primary/5")} onClick={(e) => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; handleDateSelect(day, Math.floor(y / 80)); }}}>
                        {isToday(day) && (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentTime.getHours()) * 80 + (currentTime.getMinutes() / 60) * 80}px` }}>
                            <div className="h-[2px] bg-destructive w-full relative"><div className="w-3 h-3 bg-destructive rounded-full absolute -top-[5px] -left-[6px] shadow-sm"></div></div>
                          </div>
                        )}
                        {dayEvents.map((event: any) => {
                          const start = parseISO(event.start); const end = parseISO(event.end);
                          const top = (start.getHours()) * 80 + (start.getMinutes() / 60) * 80;
                          const height = (differenceInMinutes(end, start) / 60) * 80;
                          return (
                            <div key={event.uniqueId} className="absolute left-1 right-1 rounded-[4px] px-2 py-1 shadow-md border text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden"
                              style={{ top: `${top}px`, height: `${Math.max(height, 24)}px`, backgroundColor: event.color, borderColor: 'rgba(0,0,0,0.1)' }}
                              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                            >
                              <div className="truncate">{event.title}</div>
                              {height > 36 && <div className="opacity-80 text-[10px]">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- SETTINGS MODAL (FULL GOOGLE CLONE) --- */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-full h-full p-0 m-0 border-none rounded-none bg-background text-foreground flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>Ayarlar</DialogTitle></VisuallyHidden>
          <div className="h-16 border-b flex items-center px-6 gap-6 shrink-0">
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
            <h2 className="text-xl font-medium">Ayarlar</h2>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <aside className="w-[300px] border-r py-6 overflow-y-auto bg-card custom-scrollbar">
              <div className="space-y-1">
                <button onClick={() => setOpenSettingsSections(prev => ({...prev, genel: !prev.genel}))} className="w-full flex items-center justify-between px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
                  <span>Genel</span>
                  {openSettingsSections.genel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSettingsSections.genel && (
                  <div className="space-y-1">
                    {[
                      { id: 'dil-bolge', label: 'Dil ve bölge' },
                      { id: 'saat-dilimi', label: 'Saat dilimi' },
                      { id: 'dunya-saati', label: 'Dünya saati' },
                      { id: 'etkinlik-ayarlari', label: 'Etkinlik ayarları' },
                      { id: 'bildirim-ayarlari', label: 'Bildirim ayarları' },
                      { id: 'gorunum-secenekleri', label: 'Görünüm seçenekleri' },
                      { id: 'workspace', label: 'Google Workspace akıllı özellikleri' },
                      { id: 'kisayollar', label: 'Klavye kısayolları' }
                    ].map((item) => (
                      <button key={item.id} onClick={() => setSettingsTab(item.id)} className={cn("w-full text-left px-10 py-2.5 text-sm font-medium transition-all border-l-4", settingsTab === item.id ? "bg-primary/10 text-primary border-primary" : "text-foreground/70 border-transparent hover:bg-accent")}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                
                <button onClick={() => setOpenSettingsSections(prev => ({...prev, takvimEkle: !prev.takvimEkle}))} className="w-full flex items-center justify-between px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
                  <span>Takvim ekle</span>
                  {openSettingsSections.takvimEkle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSettingsSections.takvimEkle && (
                  <div className="space-y-1">
                    {[
                      { id: 'abone-ol', label: 'Takvime abone ol' },
                      { id: 'yeni-takvim', label: 'Yeni takvim oluştur' },
                      { id: 'ilginc-takvimler', label: 'İlginç takvimlere göz at' },
                      { id: 'url-ile', label: 'URL ile' },
                      { id: 'ice-disa-aktar', label: 'İçe ve dışa aktar' }
                    ].map(item => (
                      <button key={item.id} onClick={() => setSettingsTab(item.id)} className={cn("w-full text-left px-10 py-2.5 text-sm font-medium transition-all border-l-4", settingsTab === item.id ? "bg-primary/10 text-primary border-primary" : "text-foreground/70 border-transparent hover:bg-accent")}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Takvimlerimin ayarları</div>
                <div className="space-y-1">
                  <button className="w-full text-left px-10 py-2.5 text-sm font-medium hover:bg-accent truncate">{user?.displayName || 'Kullanıcı'}</button>
                  <button className="w-full text-left px-10 py-2.5 text-sm font-medium hover:bg-accent">Aile</button>
                </div>
              </div>
            </aside>
            
            <main className="flex-1 p-12 overflow-y-auto bg-background custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-500">
                {settingsTab === 'dil-bolge' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Dil ve bölge</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Dil</Label>
                        <Select defaultValue="tr">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Ülke</Label>
                        <Select defaultValue="TR">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>{COUNTRY_LIST.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Tarih biçimi</Label>
                        <Select defaultValue="dmy">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="dmy">31/12/2026</SelectItem><SelectItem value="mdy">12/31/2026</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Saat biçimi</Label>
                        <Select defaultValue="24">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="24">13:00</SelectItem><SelectItem value="12">01:00 PM</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'saat-dilimi' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Saat dilimi</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Birincil saat dilimi</Label>
                        <div className="text-sm font-medium">İstanbul (GMT+3)</div>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b pb-6">
                        <div className="space-y-0.5">
                          <Label>İkincil saat dilimini göster</Label>
                          <p className="text-xs text-muted-foreground">İkincil bir saat dilimi ekleyerek planlamalarınızı yönetin.</p>
                        </div>
                        <Switch id="second-tz" />
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'gorunum-secenekleri' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Görünüm seçenekleri</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Palette className="w-5 h-5 text-primary" />
                          <Label>Tema Seçimi</Label>
                        </div>
                        <Select value={theme} onValueChange={(v) => setTheme(v)}>
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

                      <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border">
                        <Label>Hafta sonlarını göster</Label>
                        <Switch checked={!hideWeekends} onCheckedChange={(v) => setHideWeekends(!v)} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 items-center p-4 border-b">
                        <Label>Haftanın ilk günü</Label>
                        <Select defaultValue="Pazartesi">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Pazar">Pazar</SelectItem><SelectItem value="Pazartesi">Pazartesi</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-4 border-b">
                        <Label>Geçmiş etkinliklerin parlaklığını azalt</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'etkinlik-ayarlari' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Etkinlik ayarları</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-8 items-center border-b pb-6">
                        <Label>Varsayılan süre</Label>
                        <Select defaultValue="60">
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 dakika</SelectItem>
                            <SelectItem value="30">30 dakika</SelectItem>
                            <SelectItem value="60">60 dakika</SelectItem>
                            <SelectItem value="90">90 dakika</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b pb-6">
                        <div className="space-y-0.5">
                          <Label>Hızlı toplantılar</Label>
                          <p className="text-xs text-muted-foreground">Toplantıları biraz erken bitirerek ara verin.</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'ilginc-takvimler' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">İlginç takvimlere göz at</h3>
                    <div className="relative mb-6">
                      <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Ülke ara..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="pl-9 bg-background" />
                    </div>
                    <div className="grid gap-2">
                      {filteredCountries.map(c => (
                        <div key={c.code} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-border group">
                          <span className="text-sm font-medium">{c.name} Bayramları</span>
                          <Checkbox checked={selectedCountries.includes(c.code)} onCheckedChange={(v) => {
                            if (v) setSelectedCountries([...selectedCountries, c.code]);
                            else setSelectedCountries(selectedCountries.filter(x => x !== c.code));
                          }} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </main>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- INFO / AI HELPER MODAL --- */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] p-0 flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>Takvim Asistanı ve Yardım</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b bg-accent/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">AI Takvim Asistanı</h2>
            </div>
            <button onClick={() => setIsInfoOpen(false)} className="p-1 hover:bg-accent rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.length === 0 && (
              <div className="space-y-6">
                <div className="bg-accent/30 p-4 rounded-lg border space-y-2">
                  <h3 className="font-medium text-primary flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Hızlı İpuçları</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                    <li>Takvimde boş bir yere tıklayarak hızlıca etkinlik ekleyebilirsiniz.</li>
                    <li>QR kodunuzu paylaşarak başkalarından randevu alabilirsiniz.</li>
                    <li>Ayarlardan hafta sonlarını gizleyerek daha net bir görünüm elde edebilirsiniz.</li>
                  </ul>
                </div>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={cn("max-w-[85%] p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-primary text-primary-foreground ml-auto" : "bg-accent text-foreground mr-auto")}>
                {msg.text}
              </div>
            ))}
            {isAiLoading && <div className="text-xs text-primary animate-pulse ml-4">Asistan düşünüyor...</div>}
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2 bg-accent rounded-full px-4 py-2 border">
              <input 
                className="flex-1 bg-transparent outline-none text-sm" 
                placeholder="Takvimi nasıl kullanırım?..." 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
              />
              <button onClick={handleAiSend} className="p-1 text-primary hover:text-primary/80"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- EVENT MODAL / APPOINTMENT SIDEBAR --- */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className={cn(
          "bg-background p-0 overflow-hidden shadow-2xl rounded-xl transition-all",
          activeEventTab === 'Randevu programı' ? "sm:max-w-[450px] fixed left-0 top-0 h-full rounded-none border-r" : "sm:max-w-[550px]"
        )}>
          <VisuallyHidden><DialogTitle>Etkinlik Düzenle</DialogTitle></VisuallyHidden>
          
          <div className="flex items-center justify-between p-2 bg-accent/20">
            <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground ml-auto"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-6 pt-2 space-y-6 flex flex-col h-full overflow-hidden">
            <input 
              type="text" 
              placeholder="Başlık ekle" 
              value={activeEventTab === 'Randevu programı' ? appointmentForm.title : eventForm.title}
              onChange={(e) => activeEventTab === 'Randevu programı' ? setAppointmentForm({...appointmentForm, title: e.target.value}) : setEventForm({...eventForm, title: e.target.value})}
              className="w-full bg-transparent text-[24px] placeholder-muted-foreground outline-none border-b-2 focus:border-primary pb-1 transition-colors"
              autoFocus
            />
            
            <div className="flex gap-2">
              {['Etkinlik', 'Görev', 'Randevu programı'].map(tab => {
                if (tab === 'Randevu programı' && !isTeacher) return null;
                return <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", activeEventTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>{tab}</button>;
              })}
            </div>

            {activeEventTab === 'Randevu programı' ? (
              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 pb-20">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-muted-foreground mt-1" />
                  <div className="flex-1 space-y-4">
                    <Label className="text-muted-foreground text-xs uppercase font-bold">Randevu süresi</Label>
                    <Select value={appointmentForm.duration} onValueChange={(v) => setAppointmentForm({...appointmentForm, duration: v})}>
                      <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 dakika</SelectItem>
                        <SelectItem value="30">30 dakika</SelectItem>
                        <SelectItem value="45">45 dakika</SelectItem>
                        <SelectItem value="60">1 saat</SelectItem>
                        <SelectItem value="90">1.5 saat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                     <Label className="text-muted-foreground text-xs uppercase font-bold">Genel müsaitlik durumu</Label>
                     <button className="text-[10px] text-primary hover:underline">Her hafta tekrarla</button>
                   </div>
                   
                   {appointmentForm.schedule.map((day, idx) => {
                     const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
                     return (
                       <div key={day.dayOfWeek} className="flex flex-col gap-2 p-3 bg-accent/40 rounded-lg border">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={day.enabled} onCheckedChange={(v) => {
                                const newSched = [...appointmentForm.schedule];
                                newSched[idx].enabled = !!v;
                                if (v && day.slots.length === 0) newSched[idx].slots = [{start:'09:00', end:'17:00'}];
                                setAppointmentForm({...appointmentForm, schedule: newSched});
                              }} />
                              <span className="w-8 text-sm font-semibold">{dayNames[idx]}</span>
                            </div>
                            {!day.enabled && <span className="text-xs text-muted-foreground italic">Müsait değil</span>}
                         </div>
                         {day.enabled && (
                           <div className="space-y-2 mt-1">
                             {day.slots.map((slot: any, sIdx: number) => (
                               <div key={sIdx} className="flex items-center gap-2 group">
                                 <Input type="time" className="h-8 bg-background text-xs" value={slot.start} onChange={(e) => { const newSched = [...appointmentForm.schedule]; newSched[idx].slots[sIdx].start = e.target.value; setAppointmentForm({...appointmentForm, schedule: newSched}); }} />
                                 <span className="text-muted-foreground">-</span>
                                 <Input type="time" className="h-8 bg-background text-xs" value={slot.end} onChange={(e) => { const newSched = [...appointmentForm.schedule]; newSched[idx].slots[sIdx].end = e.target.value; setAppointmentForm({...appointmentForm, schedule: newSched}); }} />
                                 <button onClick={() => { const newSched = [...appointmentForm.schedule]; newSched[idx].slots.splice(sIdx, 1); if (newSched[idx].slots.length === 0) newSched[idx].enabled = false; setAppointmentForm({...appointmentForm, schedule: newSched}); }} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><MinusCircle className="w-4 h-4" /></button>
                               </div>
                             ))}
                             <button onClick={() => { const newSched = [...appointmentForm.schedule]; newSched[idx].slots.push({start: '09:00', end: '17:00'}); setAppointmentForm({...appointmentForm, schedule: newSched}); }} className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"><Plus className="w-3 h-3" /> Ekle</button>
                           </div>
                         )}
                       </div>
                     );
                   })}
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="window">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">Planlama zaman aralığı</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Maks. Gün Öncesi</Label>
                            <Input type="number" value={appointmentForm.planningWindow.startInDays} onChange={(e) => setAppointmentForm({...appointmentForm, planningWindow: {...appointmentForm.planningWindow, startInDays: parseInt(e.target.value)}})} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Min. Saat Önce</Label>
                            <Input type="number" value={appointmentForm.planningWindow.minLeadTimeInHours} onChange={(e) => setAppointmentForm({...appointmentForm, planningWindow: {...appointmentForm.planningWindow, minLeadTimeInHours: parseInt(e.target.value)}})} className="h-9" />
                          </div>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="settings">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">Alınmış randevu ayarları</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                       <div className="flex items-center justify-between gap-4">
                          <Label className="text-xs text-muted-foreground">Öncesinde tampon (dk)</Label>
                          <Input type="number" value={appointmentForm.bookedSettings.bufferBefore} onChange={(e) => setAppointmentForm({...appointmentForm, bookedSettings: {...appointmentForm.bookedSettings, bufferBefore: parseInt(e.target.value)}})} className="h-9 w-20" />
                       </div>
                       <div className="flex items-center justify-between gap-4">
                          <Label className="text-xs text-muted-foreground">Sonrasında tampon (dk)</Label>
                          <Input type="number" value={appointmentForm.bookedSettings.bufferAfter} onChange={(e) => setAppointmentForm({...appointmentForm, bookedSettings: {...appointmentForm.bookedSettings, bufferAfter: parseInt(e.target.value)}})} className="h-9 w-20" />
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <input type="datetime-local" value={eventForm.start} onChange={(e) => setEventForm({...eventForm, start: e.target.value})} className="bg-accent/50 border rounded px-2 py-1 text-sm outline-none" />
                      <span className="text-muted-foreground">-</span>
                      <input type="datetime-local" value={eventForm.end} onChange={(e) => setEventForm({...eventForm, end: e.target.value})} className="bg-accent/50 border rounded px-2 py-1 text-sm outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input type="text" placeholder="Davetli ekle" value={eventForm.guests} onChange={(e) => setEventForm({...eventForm, guests: e.target.value})} className="bg-transparent text-sm outline-none w-full border-b border-transparent focus:border-border pb-1" />
                </div>
                <div className="flex items-start gap-4 group">
                  <AlignLeft className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  <textarea placeholder="Açıklama ekle" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} className="bg-transparent text-sm outline-none w-full min-h-[60px] resize-none" />
                </div>
              </div>
            )}
          </div>

          <div className={cn("p-4 border-t flex items-center justify-end gap-3", activeEventTab === 'Randevu programı' ? "fixed bottom-0 left-0 w-full bg-background z-10" : "bg-accent/10")}>
            {selectedEvent && <button onClick={async () => { await deleteDoc(doc(db, 'users', user?.uid!, 'events', selectedEvent.id)); setIsEventModalOpen(false); toast({title:'Silindi'}); }} className="text-sm font-medium text-destructive hover:bg-destructive/10 px-4 py-2 rounded-md">Sil</button>}
            <button onClick={handleSaveEvent} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2 rounded-full text-sm font-medium transition-all shadow-lg">{activeEventTab === 'Randevu programı' ? 'Sonraki' : 'Kaydet'}</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- QR MODAL --- */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>Randevu QR Kodu</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b bg-accent/50 flex items-center justify-between">
            <h2 className="font-semibold">Randevu QR Kodu</h2>
            <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-accent rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col items-center gap-6 py-10 px-6">
            <div className="p-4 bg-white rounded-2xl shadow-2xl">
              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${user?.uid}/default`} size={220} level="H" includeMargin={true} />
            </div>
            <div className="text-center space-y-3 w-full">
              <p className="text-sm text-muted-foreground">Öğrencileriniz için randevu linki.</p>
              <div className="flex items-center gap-2 bg-accent p-2 rounded-lg border w-full">
                <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${user?.uid}/default`} className="bg-transparent text-xs text-primary flex-1 outline-none truncate" />
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${user?.uid}/default`); toast({title:'Kopyalandı'}); }} className="p-1.5 hover:bg-accent rounded transition-colors"><LinkIcon className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SEARCHABLE COUNTRY HOLIDAY MODAL --- */}
      <Dialog open={isCountryModalOpen} onOpenChange={setIsCountryModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0">
          <VisuallyHidden><DialogTitle>Takvim Ekle</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b bg-accent/50 flex items-center justify-between">
            <h2 className="font-semibold">Ülke Takvimi Ekle</h2>
            <button onClick={() => setIsCountryModalOpen(false)} className="p-1 hover:bg-accent rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Ülke ara (Örn: USA, Almanya...)" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
              {filteredCountries.map(c => (
                <button key={c.code} onClick={() => { if (!selectedCountries.includes(c.code)) { setSelectedCountries([...selectedCountries, c.code]); toast({ title: `${c.name} takvimi eklendi` }); } setIsCountryModalOpen(false); setCountrySearch(''); }} className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent rounded-md transition-colors text-sm">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
