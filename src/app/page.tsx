
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  setSeconds,
  getWeek,
  isBefore
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut, 
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Check,
  QrCode,
  Clock,
  Send,
  Sparkles,
  Search as SearchIcon,
  Monitor,
  Smartphone,
  Info,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
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
import { useTheme } from 'next-themes';
import { SettingsDialogContent } from '@/components/settings-dialog-content';
import { useIsMobile } from '@/hooks/use-mobile';

const translations = {
  tr: {
    create: 'Oluştur',
    today: 'Bugün',
    settings: 'Ayarlar',
    logout: 'Çıkış Yap',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    day: 'Gün',
    week: 'Hafta',
    month: 'Ay',
    schedule: 'Plan',
    event: 'Etkinlik',
    task: 'Görev',
    bookings: 'Randevular',
    loading: 'Veriler Yükleniyor...',
    qrCode: 'Görüşme QR Kodu',
    assistant: 'AI Takvim Asistanı',
    assistantThinking: 'Asistan düşünüyor...',
    askAssistant: 'Takviminiz hakkında bir şeyler sorun...',
    myCalendars: 'Takvimlerim',
    personal: 'Kişisel',
    family: 'Aile'
  },
  en: {
    create: 'Create',
    today: 'Today',
    settings: 'Settings',
    logout: 'Sign Out',
    login: 'Sign In',
    register: 'Sign Up',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    schedule: 'Agenda',
    event: 'Event',
    task: 'Task',
    bookings: 'Bookings',
    loading: 'Loading Data...',
    qrCode: 'Booking QR Code',
    assistant: 'AI Calendar Assistant',
    assistantThinking: 'Assistant is thinking...',
    askAssistant: 'Ask something about your calendar...',
    myCalendars: 'My Calendars',
    personal: 'Personal',
    family: 'Family'
  }
};

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isMobileDevice = useIsMobile();

  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [view, setView] = useState<'gün' | 'hafta' | 'ay' | 'plan'>('hafta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [uiMode, setUiMode] = useState<'pc' | 'mobile'>('pc'); 
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Event Form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: format(new Date(), "yyyy-MM-dd'T'09:00"),
    end: format(new Date(), "yyyy-MM-dd'T'10:00"),
    type: 'personal',
    color: '#3b82f6',
  });

  const [filters, setFilters] = useState({
    personal: true,
    booking: true,
    holiday: true,
    family: true,
  });

  // AI Helper State
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState<string>("");

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

  // --- INITIALIZATION ---
  useEffect(() => {
    setIsClient(true);
    const savedUiMode = typeof window !== 'undefined' ? localStorage.getItem('uiMode') as 'pc' | 'mobile' : null;
    if (savedUiMode) {
      setUiMode(savedUiMode);
    } else if (isMobileDevice) {
      setUiMode('mobile');
    }

    if (isMobileDevice) {
      setSidebarOpen(false);
    }
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [isMobileDevice]);

  useEffect(() => {
    if (userData?.view) {
      setView(userData.view);
    }
  }, [userData]);

  // AUTO SCROLL CHAT
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [aiMessages, currentlyTyping]);

  // LOCALIZATION HELPERS
  const lang = userData?.language === 'en' ? 'en' : 'tr';
  const t = (key: keyof typeof translations['tr']) => translations[lang][key] || key;
  const currentLocale = lang === 'en' ? enUS : tr;
  const timeFormatStr = userData?.timeFormat === '12' ? 'hh:mm a' : 'HH:mm';

  const isTeacher = ["proturkgamerefe@gmail.com", "sintiya.ugur@bahcesehir.k12.tr"].includes(user?.email || "");

  const combinedEvents = React.useMemo(() => {
    const userEvents = eventsData || [];
    const filtered = userEvents.filter(e => filters[e.type as keyof typeof filters] !== false);
    return [...filtered].sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
  }, [eventsData, filters]);

  const weekDays = React.useMemo(() => {
    if (view === 'gün') return [currentDate];
    
    if (uiMode === 'mobile' && view === 'hafta') {
      return Array.from({ length: 4 }, (_, i) => addDays(currentDate, i));
    }

    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    let days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    if (userData?.showWeekends === false) {
      days = days.filter(d => getDay(d) !== 0 && getDay(d) !== 6);
    }
    return days;
  }, [currentDate, userData?.showWeekends, view, uiMode]);

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
  const toggleUiMode = () => {
    const newMode = uiMode === 'pc' ? 'mobile' : 'pc';
    setUiMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiMode', newMode);
    }
    if (newMode === 'mobile') setSidebarOpen(false);
  };

  const handleDateSelect = (date: Date, hour: number) => {
    const start = setMinutes(setHours(date, hour), 0);
    const end = setMinutes(setHours(date, hour + 1), 0);
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start: format(start, "yyyy-MM-dd'T'HH:mm"),
      end: format(end, "yyyy-MM-dd'T'HH:mm"),
      type: 'personal',
      color: '#3b82f6',
    });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: format(parseISO(event.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(parseISO(event.end), "yyyy-MM-dd'T'HH:mm"),
      type: event.type,
      color: event.color,
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!user) return;
    try {
      const start = new Date(eventForm.start).toISOString();
      const end = new Date(eventForm.end).toISOString();
      const data = { ...eventForm, start, end, userId: user.uid, updatedAt: serverTimestamp() };
      if (selectedEvent) {
        await updateDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id), data);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'events'), { ...data, createdAt: serverTimestamp() });
      }
      setIsEventModalOpen(false);
      toast({ title: t('create') });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const handleAiSend = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput;
    setAiInput('');
    const newHistory = [...aiMessages, { role: 'user' as const, text: msg }];
    setAiMessages(newHistory);
    setIsAiLoading(true);
    try {
      const response = await calendarHelper({ 
        message: msg, 
        history: newHistory,
        userContext: `User: ${user?.displayName}, View: ${view}, Date: ${format(currentDate, 'yyyy-MM-dd')}` 
      });
      
      const reply = response.reply;
      let currentIdx = 0;
      setCurrentlyTyping("");
      
      const interval = setInterval(() => {
        setCurrentlyTyping(prev => {
          const nextChar = reply[currentIdx];
          if (nextChar === undefined) {
             clearInterval(interval);
             setAiMessages(prevMsgs => [...prevMsgs, { role: 'ai', text: reply }]);
             setCurrentlyTyping("");
             return "";
          }
          currentIdx++;
          return prev + nextChar;
        });
      }, 20);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'Bir hata oluştu.' }]);
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
    if (view === 'ay') {
      const nextMonth = dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
      setCurrentDate(nextMonth);
      setMiniCalendarMonth(nextMonth);
    } else {
      const amount = view === 'gün' ? 1 : (uiMode === 'mobile' ? 4 : 7);
      const fn = dir === 'next' ? addDaysFn : subDaysFn;
      setCurrentDate(prev => fn(prev, amount));
    }
  };

  const headerTitle = React.useMemo(() => {
    if (view === 'ay') return format(currentDate, 'MMMM yyyy', { locale: currentLocale });
    if (view === 'gün') return format(currentDate, 'd MMMM yyyy', { locale: currentLocale });
    return `${format(weekDays[0], 'd')} – ${format(weekDays[weekDays.length - 1], 'd MMMM yyyy', { locale: currentLocale })}`;
  }, [currentDate, weekDays, view, currentLocale]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-background text-foreground">{t('loading')}</div>;

  return (
    <div className={cn("h-screen w-full flex flex-col bg-background overflow-hidden text-foreground relative", uiMode === 'mobile' ? "mobile-ui" : "pc-ui")}>
      
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b flex items-center px-4 justify-between shrink-0 bg-background z-30">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mr-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span className="text-lg font-medium hidden sm:inline">Takvim</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('today')} className="px-3 py-1.5 border rounded-md text-sm font-medium hover:bg-accent transition-colors hidden sm:block">{t('today')}</button>
            <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-accent rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => navigate('next')} className="p-1.5 hover:bg-accent rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
            <h2 className="text-sm md:text-lg font-medium ml-2 capitalize truncate max-w-[120px] md:max-w-none">{headerTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsInfoOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors"><Sparkles className="w-5 h-5 text-primary" /></button>
          
          <Select value={view} onValueChange={(v: any) => { setView(v); updateUserSetting('view', v); }}>
            <SelectTrigger className="w-[80px] md:w-[100px] h-9 ml-2 bg-transparent font-medium text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gün">{t('day')}</SelectItem>
              <SelectItem value="hafta">{t('week')}</SelectItem>
              <SelectItem value="ay">{t('month')}</SelectItem>
              <SelectItem value="plan">{t('schedule')}</SelectItem>
            </SelectContent>
          </Select>

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex"><Link href="/login">{t('login')}</Link></Button>
              <Button size="sm" asChild><Link href="/register">{t('register')}</Link></Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ml-2 border">
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
                    <DropdownMenuItem onClick={() => setIsQrModalOpen(true)} className="cursor-pointer"><QrCode className="w-4 h-4 mr-2" /> {t('qrCode')}</DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer"><Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> {t('bookings')}</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> {t('settings')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-medium cursor-pointer" onClick={() => auth.signOut()}><LogOut className="w-4 h-4 mr-2" /> {t('logout')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <aside className={cn(
          "shrink-0 overflow-y-auto bg-background flex flex-col gap-6 z-40 transition-all duration-300 border-r p-4",
          (uiMode === 'mobile' || isMobileDevice) ? "fixed inset-y-0 left-0 top-[64px] w-[280px] shadow-2xl" : "w-[280px]",
          !sidebarOpen && "-translate-x-full absolute",
          sidebarOpen && (uiMode === 'pc' && !isMobileDevice) && "relative translate-x-0"
        )}>
          <div className="px-2">
            <button 
              onClick={toggleUiMode} 
              className="flex items-center gap-3 w-full p-2.5 rounded-xl border hover:bg-accent transition-colors text-sm font-medium"
            >
              {uiMode === 'pc' ? (
                <>
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  Mobil Görünüme Geç
                </>
              ) : (
                <>
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  Masaüstü Görünüme Geç
                </>
              )}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 bg-card border shadow-sm px-4 py-3 rounded-full hover:bg-accent transition-all font-medium text-[14px] w-full">
                <Plus className="w-6 h-6 text-primary" />
                <span>{t('create')}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={() => { setSelectedEvent(null); setIsEventModalOpen(true); }} className="cursor-pointer"><Plus className="w-4 h-4 mr-2" /> {t('event')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {userData?.worldClockEnabled && (
            <div className="px-1 border-b pb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-3">Dünya Saati</h3>
              <div className="space-y-3 px-2">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-medium">İstanbul</span>
                   <span className="text-xs font-mono">{format(new Date(), 'HH:mm')}</span>
                 </div>
                 {userData?.secondaryTzEnabled && (
                   <div className="flex justify-between items-center text-muted-foreground">
                     <span className="text-xs">{userData.secondaryTimezone?.split('/')[1] || 'New York'}</span>
                     <span className="text-xs font-mono">
                       {new Date().toLocaleTimeString('tr-TR', { 
                         timeZone: userData.secondaryTimezone || 'America/New_York', 
                         hour: '2-digit', 
                         minute: '2-digit',
                         hour12: false 
                       })}
                     </span>
                   </div>
                 )}
              </div>
            </div>
          )}

          <div className="px-1">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[14px] font-medium capitalize">{format(miniCalendarMonth, 'MMMM yyyy', { locale: currentLocale })}</h3>
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
                const isDaySelected = isSameDay(day, currentDate);
                return (
                  <div key={i} onClick={() => { setCurrentDate(day); setMiniCalendarMonth(day); if(isMobileDevice) setSidebarOpen(false); }}
                    className={cn("h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition-all m-auto text-[12px]",
                      !isSameMonth(day, miniCalendarMonth) && "text-muted-foreground/50",
                      isToday(day) && !isDaySelected && "text-primary font-bold",
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
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">{t('myCalendars')}</h3>
              <div className="space-y-1">
                {[
                  { id: 'personal', label: user?.displayName || t('personal'), color: '#3b82f6' }, 
                  { id: 'family', label: t('family'), color: '#8b5cf6' }, 
                  { id: 'booking', label: t('bookings'), color: '#10b981' },
                ].map(filter => (
                  <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md transition-colors">
                    <Checkbox checked={filters[filter.id as keyof typeof filters] !== false} onCheckedChange={(checked) => setFilters({...filters, [filter.id]: !!checked})} />
                    <span className="text-[13px] font-medium">{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {isClient && (view === 'hafta' || view === 'gün') && (
            <div className="flex shrink-0 border-b bg-background/50 sticky top-0 z-20">
              <div className="w-[48px] md:w-[64px] shrink-0 border-r flex flex-col items-center justify-end pb-2">
                <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  GMT{isClient ? format(new Date(), 'X') : ''}
                </span>
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                {weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-2 md:py-4 gap-1">
                      <span className={cn("text-[10px] font-bold tracking-widest uppercase", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>{format(day, 'eee', { locale: currentLocale })}</span>
                      <div className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors", isToday(day) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                        <span className="text-xl font-medium">{format(day, 'd')}</span>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative" ref={gridScrollRef}>
            {view === 'ay' ? (
              <div className="flex flex-col h-full min-h-[500px]">
                <div className="grid grid-cols-7 border-b border-l bg-background sticky top-0 z-10">
                  {['Pt', 'Sl', 'Çr', 'Pr', 'Cm', 'Ct', 'Pz'].map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-bold text-muted-foreground border-r uppercase">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 flex-1 border-l">
                  {monthDays.map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                    return (
                      <div key={i} className={cn("border-r border-b p-2 flex flex-col items-end min-h-[100px]", !isSameMonth(day, currentDate) && "opacity-30")} onClick={() => handleDateSelect(day, 9)}>
                        <div className={cn("text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{format(day, 'd')}</div>
                        <div className="w-full space-y-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event: any) => (
                            <div key={event.id} className="text-[10px] px-1 py-0.5 rounded text-white truncate font-medium" style={{ backgroundColor: event.color }}>{event.title}</div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex relative h-[1920px]">
                <div className="w-[48px] md:w-[64px] shrink-0 border-r">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-[80px] relative">
                      <span className="absolute -top-[7px] right-1 md:right-2 text-[10px] md:text-[11px] text-muted-foreground font-medium">{format(setMinutes(setHours(new Date(), hour), 0), timeFormatStr, { locale: currentLocale })}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative border-t grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((_, i) => <div key={i} className="h-[80px] border-b w-full opacity-50"></div>)}
                  </div>

                  {weekDays.map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day));
                    return (
                      <div key={i} className={cn("relative border-r cursor-pointer", isToday(day) && "bg-primary/5")} onClick={(e) => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top; handleDateSelect(day, Math.floor(y / 80)); }}}>
                        {isToday(day) && (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentTime.getHours()) * 80 + (currentTime.getMinutes() / 60) * 80}px` }}>
                            <div className="h-[2px] bg-destructive w-full relative"><div className="w-2 h-2 md:w-3 md:h-3 bg-destructive rounded-full absolute -top-[3px] md:-top-[5px] -left-[4px] md:-left-[6px]"></div></div>
                          </div>
                        )}
                        {dayEvents.map((event: any) => {
                          const start = parseISO(event.start); const end = parseISO(event.end);
                          const top = (start.getHours()) * 80 + (start.getMinutes() / 60) * 80;
                          const height = (differenceInMinutes(end, start) / 60) * 80;
                          return (
                            <div key={event.id} className={cn("absolute left-0.5 right-0.5 rounded-[4px] px-1 md:px-2 py-0.5 md:py-1 shadow-sm border text-[10px] md:text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden", userData?.dimPastEvents && isBefore(end, new Date()) && "opacity-50")}
                              style={{ top: `${top}px`, height: `${Math.max(height, 24)}px`, backgroundColor: event.color }}
                              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                            >
                              <div className="truncate">{event.title}</div>
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

      {uiMode === 'mobile' && (
        <button 
          onClick={() => { setSelectedEvent(null); setIsEventModalOpen(true); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition-transform active:scale-95"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* --- MODALS --- */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input placeholder="Başlık ekle" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input type="datetime-local" value={eventForm.start} onChange={(e) => setEventForm({...eventForm, start: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input type="datetime-local" value={eventForm.end} onChange={(e) => setEventForm({...eventForm, end: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              {selectedEvent && (
                <Button variant="destructive" onClick={async () => {
                  await deleteDoc(doc(db, 'users', user?.uid!, 'events', selectedEvent.id));
                  setIsEventModalOpen(false);
                  toast({title: 'Silindi'});
                }}>Sil</Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>İptal</Button>
                <Button onClick={handleSaveEvent}>Kaydet</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-full h-full p-0 m-0 border-none rounded-none bg-background text-foreground flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>{t('settings')}</DialogTitle></VisuallyHidden>
          <SettingsDialogContent 
            onClose={() => setIsSettingsOpen(false)} 
            user={user}
            userData={userData}
            theme={theme}
            setTheme={setTheme}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] p-0 flex flex-col overflow-hidden">
          <VisuallyHidden><DialogTitle>{t('assistant')}</DialogTitle></VisuallyHidden>
          <div className="p-4 border-b bg-accent/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('assistant')}</h2>
            </div>
            <button onClick={() => setIsInfoOpen(false)} className="p-1 hover:bg-accent rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
            {aiMessages.map((msg, i) => (
              <div key={i} className={cn("max-w-[85%] p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-primary text-primary-foreground ml-auto" : "bg-accent text-foreground mr-auto")}>
                {msg.text}
              </div>
            ))}
            {currentlyTyping && (
              <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-accent text-foreground mr-auto">
                {currentlyTyping}
              </div>
            )}
            {isAiLoading && !currentlyTyping && <div className="text-xs text-primary animate-pulse ml-4">{t('assistantThinking')}</div>}
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2 bg-accent rounded-full px-4 py-2 border">
              <input 
                className="flex-1 bg-transparent outline-none text-sm" 
                placeholder={t('askAssistant')}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
              />
              <button onClick={handleAiSend} className="p-1 text-primary hover:text-primary/80"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{t('qrCode')}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              {isClient && <QRCodeSVG value={`${originUrl}/book/${user?.uid}/default`} size={200} level="H" />}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );

  async function updateUserSetting(field: string, value: any) {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: value, updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  }
}
