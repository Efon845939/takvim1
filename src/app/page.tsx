
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
  Mail
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

const COUNTRY_LIST = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'ABD' },
  { code: 'DE', name: 'Almanya' },
  { code: 'GB', name: 'Birleşik Krallık' },
  { code: 'FR', name: 'Fransa' },
  { code: 'ES', name: 'İspanya' },
  { code: 'IT', name: 'İtalya' },
  { code: 'SA', name: 'Suudi Arabistan' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' }
];

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [view, setView] = useState<'gün' | 'hafta' | 'ay' | 'plan'>('hafta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);
  
  // Settings UI States
  const [hideWeekends, setHideWeekends] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [settingsSection, setSettingsSection] = useState('dil-bolge');
  const [isGenelOpen, setIsGenelOpen] = useState(true);

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

  // Appointment Schedule Form
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    duration: '30',
    schedule: [
      { dayOfWeek: 1, enabled: false, slots: [] },
      { dayOfWeek: 2, enabled: true, slots: [{ start: '08:45', end: '11:50' }] },
      { dayOfWeek: 3, enabled: true, slots: [{ start: '08:45', end: '09:25' }, { start: '10:25', end: '10:55' }, { start: '11:05', end: '11:35' }] },
      { dayOfWeek: 4, enabled: true, slots: [{ start: '12:00', end: '12:30' }] },
      { dayOfWeek: 5, enabled: true, slots: [{ start: '08:45', end: '11:50' }] },
      { dayOfWeek: 6, enabled: false, slots: [] },
      { dayOfWeek: 0, enabled: false, slots: [] },
    ]
  });

  const [filters, setFilters] = useState({
    personal: true,
    booking: true,
    holiday: true,
    family: true,
  });

  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedCountries, setSelectedCountries] = useState(['TR']);
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
        setHolidays(allHolidays);
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

  const teacherEmails = ['proturkgamerefe@gmail.com', 'sintiya.ugur@bahcesehir.k12.tr'];
  const userEmail = user?.email?.toLowerCase();
  const isTeacher = userData?.role === 'teacher' || (userEmail ? teacherEmails.includes(userEmail) : false);

  const combinedEvents = React.useMemo(() => {
    const userEvents = eventsData || [];
    const holidayEvents = filters.holiday ? holidays : [];
    const typedEvents = userEvents.filter(e => filters[e.type as keyof typeof filters]);
    const combined = [...typedEvents, ...holidayEvents];
    
    return combined
      .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
      .map((e, idx) => ({ 
        ...e, 
        uniqueId: e.id || `h-${e.start}-${idx}`
      }));
  }, [eventsData, holidays, filters]);

  const weekDays = React.useMemo(() => {
    if (view === 'gün') return [currentDate];
    
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    let days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    if (hideWeekends) {
      days = days.filter(d => getDay(d) !== 0 && getDay(d) !== 6);
    }
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
          title: appointmentForm.title || 'Görüşme Randevusu',
          durationMinutes: parseInt(appointmentForm.duration),
          workingHours: appointmentForm.schedule,
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
    <div className="h-screen w-full flex flex-col bg-[#202124] overflow-hidden text-slate-200 font-sans select-none">
      
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b border-slate-700 flex items-center px-4 justify-between shrink-0 bg-[#202124] z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <Menu className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 mr-4">
            <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-md" />
            <span className="text-xl text-white font-medium tracking-tight">Takvimer</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('today')} className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors ml-4">
              Bugün
            </button>
            <div className="flex items-center gap-0.5 ml-2">
              <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-slate-300" /></button>
              <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-slate-300" /></button>
            </div>
            <h2 className="text-[20px] text-white font-normal ml-4 min-w-[200px]">{headerTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300"><Search className="w-5 h-5" /></button>
          <button onClick={() => setIsInfoOpen(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300"><HelpCircle className="w-5 h-5" /></button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300"><Settings className="w-5 h-5" /></button>
          
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[100px] h-9 ml-2 bg-transparent border-slate-600 font-medium text-sm text-white">
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
              <Button variant="ghost" size="sm" asChild className="text-sm font-medium text-white hover:bg-slate-800"><Link href="/login">Giriş Yap</Link></Button>
              <Button size="sm" asChild className="text-sm font-medium bg-blue-600 hover:bg-blue-700"><Link href="/register">Kayıt Ol</Link></Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ml-4 border border-slate-600">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-slate-800 text-white">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#202124] border-slate-700 text-white">
                <div className="px-3 py-3 border-b border-slate-700">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                {isTeacher && (
                  <>
                    <DropdownMenuItem onClick={() => setIsQrModalOpen(true)} className="hover:bg-slate-800 cursor-pointer"><QrCode className="w-4 h-4 mr-2" /> Randevu QR & Link</DropdownMenuItem>
                    <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer"><Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="hover:bg-slate-800 cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Ayarlar</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-red-400 font-medium hover:bg-slate-800 cursor-pointer" onClick={() => auth.signOut()}><LogOut className="w-4 h-4 mr-2" /> Çıkış Yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-[280px] border-r border-slate-700 p-4 shrink-0 overflow-y-auto bg-[#202124] flex flex-col gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-slate-800 border border-slate-600 shadow-sm px-4 py-3 rounded-full hover:bg-slate-700 transition-all font-medium text-[14px] text-white w-full">
                  <Plus className="w-6 h-6 text-blue-400" />
                  <span>Oluştur</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#202124] border-slate-700 text-white">
                <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Etkinlik'); setIsEventModalOpen(true); }} className="hover:bg-slate-800 cursor-pointer"><Plus className="w-4 h-4 mr-2" /> Etkinlik</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Görev'); setIsEventModalOpen(true); }} className="hover:bg-slate-800 cursor-pointer"><Check className="w-4 h-4 mr-2" /> Görev</DropdownMenuItem>
                {isTeacher && (
                  <DropdownMenuItem onClick={() => { setSelectedEvent(null); setActiveTab('Randevu programı'); setIsEventModalOpen(true); }} className="hover:bg-slate-800 cursor-pointer text-blue-400 font-semibold"><Clock className="w-4 h-4 mr-2" /> Randevu programı</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mini Calendar */}
            <div className="px-1">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[14px] font-medium text-slate-200">{format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}</h3>
                <div className="flex gap-0.5">
                  <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-4 h-4 text-slate-300" /></button>
                  <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight className="w-4 h-4 text-slate-300" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-slate-500 font-medium uppercase">
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
                        !isCurMonth && "text-slate-600",
                        isCurMonth && !isDayToday && !isDaySelected && "hover:bg-slate-800 text-slate-300",
                        isDayToday && !isDaySelected && "text-blue-400 font-bold",
                        isDaySelected && "bg-blue-600 text-white font-bold"
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
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">Takvimlerim</h3>
                <div className="space-y-1">
                  {[{ id: 'personal', label: 'Kişisel', color: '#3b82f6' }, { id: 'family', label: 'Aile', color: '#8b5cf6' }, { id: 'booking', label: 'Randevular', color: '#10b981' }].map(filter => (
                    <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md transition-colors">
                      <Checkbox checked={filters[filter.id as keyof typeof filters]} onCheckedChange={(checked) => setFilters({...filters, [filter.id]: !!checked})} className="border-slate-600 data-[state=checked]:bg-blue-500" />
                      <span className="text-[13px] font-medium text-slate-300">{filter.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between px-2 mb-2 group">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Diğer Takvimler</h3>
                  <button onClick={() => setIsCountryModalOpen(true)} className="p-1 hover:bg-slate-800 rounded-full transition-opacity opacity-0 group-hover:opacity-100"><Plus className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="space-y-1">
                  {selectedCountries.map(code => (
                    <label key={code} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md transition-colors">
                      <Checkbox checked={filters.holiday} onCheckedChange={(checked) => setFilters({...filters, holiday: !!checked})} className="border-slate-600 data-[state=checked]:bg-emerald-500" />
                      <span className="text-[13px] font-medium text-slate-300">{COUNTRY_LIST.find(c => c.code === code)?.name || code} Bayramları</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden bg-[#202124]">
          {view !== 'plan' && (
            <div className="flex pr-[15px] shrink-0 border-b border-slate-700">
              <div className="w-[64px] shrink-0"></div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                {weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-4 gap-1">
                      <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(day) ? 'text-blue-400' : 'text-slate-500')}>{format(day, 'eee', { locale: tr })}</span>
                      <div className={cn("w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors", isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800')}><span className="text-[24px] font-medium">{format(day, 'd')}</span></div>
                    </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative bg-[#202124]" ref={gridScrollRef}>
            {view === 'ay' ? (
              <div className="grid grid-cols-7 h-full min-h-[600px] border-l border-slate-700">
                {monthDays.map((day, i) => {
                  const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                  return (
                    <div key={`month-day-${i}`} className={cn("border-r border-b border-slate-700 p-2 hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col items-end", !isSameMonth(day, currentDate) && "opacity-30")} onClick={() => handleDateSelect(day, 9)}>
                      <div className={cn("text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-blue-600 text-white" : "text-slate-400")}>{format(day, 'd')}</div>
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
                <h1 className="text-2xl font-bold text-white border-b border-slate-700 pb-4">Program Akışı</h1>
                {combinedEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">Planlanmış bir etkinlik bulunmuyor.</div>
                ) : (
                  <div className="space-y-4">
                    {combinedEvents.map((event: any) => (
                      <div key={event.uniqueId} className="flex gap-4 p-4 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleEventClick(event)}>
                        <div className="w-1 rounded-full" style={{ backgroundColor: event.color }} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{event.title}</h4>
                          <p className="text-sm text-slate-400">{format(parseISO(event.start), 'd MMMM yyyy HH:mm', { locale: tr })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex relative h-[1920px]">
                <div className="w-[64px] shrink-0 border-r border-slate-700 bg-[#202124]">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-[80px] relative">
                      <span className="absolute -top-[7px] right-2 text-[11px] text-slate-500 font-medium">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative border-t border-slate-700 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((_, i) => <div key={i} className="h-[80px] border-b border-slate-700 w-full"></div>)}
                  </div>

                  {weekDays.map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                    return (
                      <div key={i} className={cn("relative border-r border-slate-800 cursor-pointer hover:bg-slate-800/20 transition-colors", isToday(day) && "bg-blue-900/10")} onClick={(e) => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; handleDateSelect(day, Math.floor(y / 80)); }}}>
                        {isToday(day) && (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentTime.getHours()) * 80 + (currentTime.getMinutes() / 60) * 80}px` }}>
                            <div className="h-[2px] bg-red-500 w-full relative"><div className="w-3 h-3 bg-red-500 rounded-full absolute -top-[5px] -left-[6px] shadow-sm"></div></div>
                          </div>
                        )}
                        {dayEvents.map((event: any) => {
                          const start = parseISO(event.start); const end = parseISO(event.end);
                          const top = (start.getHours()) * 80 + (start.getMinutes() / 60) * 80;
                          const height = (differenceInMinutes(end, start) / 60) * 80;
                          return (
                            <div key={event.uniqueId} className="absolute left-1 right-1 rounded-[4px] px-2 py-1 shadow-md border text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden"
                              style={{ top: `${top}px`, height: `${Math.max(height, 24)}px`, backgroundColor: event.color, borderColor: 'rgba(0,0,0,0.2)' }}
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

      {/* --- INFO / AI HELPER MODAL --- */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] bg-[#202124] border-slate-700 p-0 flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>Takvim Asistanı ve Yardım</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">AI Takvim Asistanı</h2>
            </div>
            <button onClick={() => setIsInfoOpen(false)} className="p-1 hover:bg-slate-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.length === 0 && (
              <div className="space-y-6">
                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700 space-y-2">
                  <h3 className="font-medium text-blue-400 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Hızlı İpuçları</h3>
                  <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                    <li>Takvimde boş bir yere tıklayarak hızlıca etkinlik ekleyebilirsiniz.</li>
                    <li>QR kodunuzu paylaşarak başkalarından randevu alabilirsiniz.</li>
                  </ul>
                </div>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={cn("max-w-[85%] p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-blue-600 text-white ml-auto" : "bg-slate-800 text-slate-200 mr-auto")}>
                {msg.text}
              </div>
            ))}
            {isAiLoading && <div className="text-xs text-blue-400 animate-pulse ml-4">Asistan düşünüyor...</div>}
          </div>
          <div className="p-4 border-t border-slate-700 bg-[#202124]">
            <div className="flex gap-2 bg-slate-800 rounded-full px-4 py-2 border border-slate-700">
              <input 
                className="flex-1 bg-transparent outline-none text-sm text-white" 
                placeholder="Takvimi nasıl kullanırım?..." 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
              />
              <button onClick={handleAiSend} className="p-1 text-blue-400 hover:text-blue-300"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- EVENT MODAL --- */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-[#202124] border-slate-700 p-0 overflow-hidden shadow-2xl rounded-xl">
          <VisuallyHidden><DialogTitle>Etkinlik Düzenle</DialogTitle></VisuallyHidden>
          <div className="flex items-center justify-between p-2 bg-slate-800/20">
            <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 ml-auto"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 pt-2 space-y-6">
            <input 
              type="text" 
              placeholder="Başlık ekle" 
              value={activeEventTab === 'Randevu programı' ? appointmentForm.title : eventForm.title}
              onChange={(e) => activeEventTab === 'Randevu programı' 
                ? setAppointmentForm({...appointmentForm, title: e.target.value})
                : setEventForm({...eventForm, title: e.target.value})}
              className="w-full bg-transparent text-[24px] text-white placeholder-slate-500 outline-none border-b-2 border-slate-700 focus:border-blue-400 pb-1 transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              {['Etkinlik', 'Görev', 'Randevu programı'].map(tab => {
                if (tab === 'Randevu programı' && !isTeacher) return null;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", activeEventTab === tab ? "bg-blue-900/40 text-blue-300" : "text-slate-400 hover:bg-slate-800")}>{tab}</button>
                );
              })}
            </div>

            {activeEventTab === 'Randevu programı' ? (
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-slate-400 mt-1" />
                  <div className="flex-1 space-y-4">
                    <Label className="text-slate-400 text-xs">Randevu süresi</Label>
                    <Select value={appointmentForm.duration} onValueChange={(v) => setAppointmentForm({...appointmentForm, duration: v})}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 dak</SelectItem>
                        <SelectItem value="30">30 dak</SelectItem>
                        <SelectItem value="45">45 dak</SelectItem>
                        <SelectItem value="60">1 saat</SelectItem>
                        <SelectItem value="90">1.5 saat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                   <Label className="text-slate-400 text-xs uppercase font-bold px-2">Genel müsaitlik durumu</Label>
                   {appointmentForm.schedule.map((day, idx) => {
                     const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                     return (
                       <div key={day.dayOfWeek} className="flex items-center gap-3 px-2 py-1 hover:bg-slate-800/20 rounded-md group">
                         <Checkbox checked={day.enabled} onCheckedChange={(v) => {
                           const newSched = [...appointmentForm.schedule];
                           newSched[idx].enabled = !!v;
                           if (v && day.slots.length === 0) newSched[idx].slots = [{start:'09:00', end:'17:00'}];
                           setAppointmentForm({...appointmentForm, schedule: newSched});
                         }} />
                         <span className="w-8 text-sm text-slate-300">{dayNames[day.dayOfWeek]}</span>
                         {day.enabled ? (
                           <div className="flex flex-col gap-2 flex-1">
                             {day.slots.map((slot, sIdx) => (
                               <div key={sIdx} className="flex items-center gap-2">
                                 <Input 
                                   type="time"
                                   className="w-24 h-8 bg-slate-800 border-slate-700 text-xs text-white" 
                                   value={slot.start} 
                                   onChange={(e) => {
                                     const newSched = [...appointmentForm.schedule];
                                     newSched[idx].slots[sIdx].start = e.target.value;
                                     setAppointmentForm({...appointmentForm, schedule: newSched});
                                   }}
                                 />
                                 <span className="text-slate-500">-</span>
                                 <Input 
                                   type="time"
                                   className="w-24 h-8 bg-slate-800 border-slate-700 text-xs text-white" 
                                   value={slot.end} 
                                   onChange={(e) => {
                                     const newSched = [...appointmentForm.schedule];
                                     newSched[idx].slots[sIdx].end = e.target.value;
                                     setAppointmentForm({...appointmentForm, schedule: newSched});
                                   }}
                                 />
                                 <button onClick={() => {
                                   const newSched = [...appointmentForm.schedule];
                                   newSched[idx].slots.splice(sIdx, 1);
                                   if (newSched[idx].slots.length === 0) newSched[idx].enabled = false;
                                   setAppointmentForm({...appointmentForm, schedule: newSched});
                                 }} className="p-1 text-slate-500 hover:text-red-400"><MinusCircle className="w-4 h-4" /></button>
                               </div>
                             ))}
                             <button onClick={() => {
                               const newSched = [...appointmentForm.schedule];
                               newSched[idx].slots.push({start: '09:00', end: '17:00'});
                               setAppointmentForm({...appointmentForm, schedule: newSched});
                             }} className="text-[10px] text-blue-400 font-bold hover:underline w-fit">+ Slot ekle</button>
                           </div>
                         ) : (
                           <span className="text-slate-500 text-sm italic">Müsait değil</span>
                         )}
                       </div>
                     );
                   })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <input type="datetime-local" value={eventForm.start} onChange={(e) => setEventForm({...eventForm, start: e.target.value})} className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none" />
                      <span className="text-slate-500">-</span>
                      <input type="datetime-local" value={eventForm.end} onChange={(e) => setEventForm({...eventForm, end: e.target.value})} className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <Users className="w-5 h-5 text-slate-400 shrink-0" />
                  <input type="text" placeholder="Davetli ekle" value={eventForm.guests} onChange={(e) => setEventForm({...eventForm, guests: e.target.value})} className="bg-transparent text-sm text-slate-200 outline-none w-full border-b border-transparent focus:border-slate-700 pb-1" />
                </div>
                <div className="flex items-start gap-4 group">
                  <AlignLeft className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                  <textarea placeholder="Açıklama ekle" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} className="bg-transparent text-sm text-slate-200 outline-none w-full min-h-[60px] resize-none" />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-800/10 border-t border-slate-700/50 flex items-center justify-end gap-3">
            {selectedEvent && (
              <button onClick={async () => {
                await deleteDoc(doc(db, 'users', user?.uid!, 'events', selectedEvent.id));
                setIsEventModalOpen(false);
                toast({title:'Silindi'});
              }} className="text-sm font-medium text-red-400 hover:bg-red-900/20 px-4 py-2 rounded-md">Sil</button>
            )}
            <button onClick={handleSaveEvent} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full text-sm font-medium transition-all shadow-lg">Kaydet</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SETTINGS MODAL --- */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-full h-full p-0 m-0 border-none rounded-none bg-[#202124] text-white flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>Ayarlar</DialogTitle></VisuallyHidden>
          <div className="h-16 border-b border-slate-700 flex items-center px-6 gap-6 shrink-0 bg-[#202124]">
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-300" /></button>
            <h2 className="text-xl font-medium">Ayarlar</h2>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <aside className="w-[300px] border-r border-slate-700 py-6 overflow-y-auto bg-[#292a2d]">
              <div className="space-y-1">
                <button onClick={() => setIsGenelOpen(!isGenelOpen)} className="w-full flex items-center justify-between px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                  <span className="flex items-center gap-3">Genel</span>
                  {isGenelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isGenelOpen && (
                  <div className="bg-slate-800/20">
                    {[
                      { id: 'dil-bolge', label: 'Dil ve bölge' },
                      { id: 'saat-dilimi', label: 'Saat dilimi' },
                      { id: 'dunya-saati', label: 'Dünya saati' },
                      { id: 'etkinlik-ayarlari', label: 'Etkinlik ayarları' },
                      { id: 'bildirim-ayarlari', label: 'Bildirim ayarları' },
                      { id: 'gorunum', label: 'Görünüm seçenekleri' },
                      { id: 'workspace', label: 'Google Workspace akıllı özellikleri' },
                      { id: 'kisayollar', label: 'Klavye kısayolları' }
                    ].map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => setSettingsSection(item.id)} 
                        className={cn(
                          "w-full text-left pl-12 pr-6 py-2.5 text-[13px] hover:bg-slate-800 transition-colors border-l-4 relative group",
                          settingsSection === item.id ? "text-blue-400 border-blue-500 bg-blue-500/5" : "text-slate-400 border-transparent"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setSettingsSection('takvim-ekle')} className={cn("w-full text-left px-6 py-3 hover:bg-slate-800 transition-colors", settingsSection === 'takvim-ekle' ? "bg-slate-800 text-blue-400" : "text-slate-300")}>Takvim Ekle</button>
              </div>
            </aside>
            <main className="flex-1 p-12 overflow-y-auto bg-[#202124]">
              <div className="max-w-2xl mx-auto space-y-12">
                {settingsSection === 'dil-bolge' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Dil ve bölge</h3>
                    <div className="grid grid-cols-2 gap-8 items-center border-b border-slate-800 pb-6">
                      <Label className="text-slate-400">Dil</Label>
                      <Select defaultValue="tr">
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-8 items-center border-b border-slate-800 pb-6">
                      <Label className="text-slate-400">Ülke</Label>
                      <Select defaultValue="TR">
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{COUNTRY_LIST.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </section>
                )}
                {settingsSection === 'bildirim-ayarlari' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Bildirim ayarları</h3>
                    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                      <div>
                        <div className="font-medium">Masaüstü Bildirimleri</div>
                        <div className="text-sm text-slate-500">Tarayıcı üzerinden önemli uyarılar alın.</div>
                      </div>
                      <Switch checked={notificationsEnabled} onCheckedChange={(v) => {
                        if (v) Notification.requestPermission();
                        setNotificationsEnabled(v);
                      }} />
                    </div>
                  </section>
                )}
                {settingsSection === 'gorunum' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Görünüm seçenekleri</h3>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                        <div>
                          <div className="font-medium">Hafta sonlarını göster</div>
                          <div className="text-sm text-slate-500">Takvimde Cumartesi ve Pazar'ı göster.</div>
                        </div>
                        <Switch checked={!hideWeekends} onCheckedChange={(v) => setHideWeekends(!v)} />
                      </div>
                    </div>
                  </section>
                )}
                {settingsSection === 'takvim-ekle' && (
                  <section className="space-y-8">
                    <h3 className="text-2xl font-normal">Takvim Ekle</h3>
                    <div className="bg-slate-800/30 p-8 rounded-xl border border-dashed border-slate-600 text-center space-y-4">
                      <p className="text-slate-400">İlgi alanlarınıza göre yeni bayram takvimleri ekleyin.</p>
                      <Button onClick={() => setIsCountryModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">Ülke Bayramı Ekle</Button>
                    </div>
                    {selectedCountries.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-slate-400 uppercase text-xs font-bold">Ekli Takvimler</Label>
                        <div className="space-y-1">
                          {selectedCountries.map(code => (
                            <div key={code} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                              <span>{COUNTRY_LIST.find(c => c.code === code)?.name || code} Bayramları</span>
                              <button onClick={() => setSelectedCountries(prev => prev.filter(c => c !== code))} className="text-red-400 hover:underline text-xs">Kaldır</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </main>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- QR MODAL --- */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#202124] border-slate-700 text-white p-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>Randevu QR Kodu</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <h2 className="font-semibold">Randevu QR Kodu</h2>
            <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-slate-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col items-center gap-6 py-10 px-6">
            <div className="p-4 bg-white rounded-2xl shadow-2xl">
              <QRCodeSVG value={`${window.location.origin}/book/${user?.uid}/default`} size={220} level="H" includeMargin={true} />
            </div>
            <div className="text-center space-y-3 w-full">
              <p className="text-sm text-slate-400">Öğrencileriniz için randevu linki.</p>
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 w-full">
                <input readOnly value={`${window.location.origin}/book/${user?.uid}/default`} className="bg-transparent text-xs text-blue-400 flex-1 outline-none truncate" />
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${user?.uid}/default`); toast({title:'Kopyalandı'}); }} className="p-1.5 hover:bg-slate-700 rounded transition-colors"><LinkIcon className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SEARCHABLE COUNTRY HOLIDAY MODAL --- */}
      <Dialog open={isCountryModalOpen} onOpenChange={setIsCountryModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#202124] border-slate-700 text-white p-0">
          <VisuallyHidden><DialogTitle>Takvim Ekle</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <h2 className="font-semibold">Ülke Takvimi Ekle</h2>
            <button onClick={() => setIsCountryModalOpen(false)} className="p-1 hover:bg-slate-700 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Ülke ara (Örn: USA, Almanya...)" 
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
              {filteredCountries.map(c => (
                <button 
                  key={c.code}
                  onClick={() => {
                    if (!selectedCountries.includes(c.code)) {
                      setSelectedCountries([...selectedCountries, c.code]);
                      toast({ title: `${c.name} takvimi eklendi` });
                    }
                    setIsCountryModalOpen(false);
                    setCountrySearch('');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-md transition-colors text-sm"
                >
                  <span>{c.name}</span>
                  <span className="text-slate-500 font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
