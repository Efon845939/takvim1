
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
  where,
  orderBy
} from 'firebase/firestore';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  getDay,
  isSameDay,
  addWeeks,
  subWeeks,
  parseISO,
  differenceInMinutes,
  startOfDay,
  setHours,
  setMinutes,
  addMonths,
  subMonths,
  addDays as addDaysFn,
  subDays as subDaysFn,
  isSameMonth,
  endOfDay
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
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
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
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'personal',
    color: '#3b82f6'
  });

  const [filters, setFilters] = useState({
    personal: true,
    booking: true,
    holiday: true,
    family: true,
  });

  const [holidays, setHolidays] = useState<any[]>([]);

  // --- REFRESH CURRENT TIME & AUTO SCROLL ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
    if (gridScrollRef.current && (view === 'hafta' || view === 'gün')) {
      // Scroll to 07:00 (7 * 80px per hour)
      gridScrollRef.current.scrollTop = 7 * 80;
    }
    
    return () => clearInterval(timer);
  }, [view]);

  // --- FETCH HOLIDAYS ---
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = currentDate.getFullYear();
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/TR`);
        const data = await response.json();
        setHolidays(data.map((h: any) => ({
          id: h.date + h.localName,
          title: h.localName,
          start: h.date,
          end: h.date,
          type: 'holiday',
          color: '#f59e0b'
        })));
      } catch (error) {
        console.error('Holidays API failed:', error);
      }
    };
    fetchHolidays();
  }, [currentDate]);

  // --- MEMOIZED QUERIES ---
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'events'), orderBy('start', 'asc'));
  }, [db, user]);

  const { data: eventsData } = useCollection(eventsQuery);
  
  const userDocRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  const isTeacher = userData?.role === 'teacher' || user?.email === 'proturkgamerefe@gmail.com';

  const combinedEvents = React.useMemo(() => {
    const userEvents = eventsData || [];
    const holidayEvents = filters.holiday ? holidays : [];
    return [...userEvents, ...holidayEvents];
  }, [eventsData, holidays, filters.holiday]);

  // --- VIEW LOGIC ---
  const weekDays = React.useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

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
    setEventForm({
      title: '',
      description: '',
      start: format(start, "yyyy-MM-dd'T'HH:mm"),
      end: format(end, "yyyy-MM-dd'T'HH:mm"),
      type: 'personal',
      color: '#3b82f6'
    });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    if (event.type === 'holiday') return;
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: format(parseISO(event.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(parseISO(event.end), "yyyy-MM-dd'T'HH:mm"),
      type: event.type,
      color: event.color
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!user) {
      toast({ title: 'Giriş Gerekli', description: 'Planlarınızı kaydetmek için lütfen giriş yapın.' });
      return;
    }
    try {
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
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    }
  };

  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      setCurrentDate(new Date());
      setMiniCalendarMonth(new Date());
      return;
    }
    const amount = view === 'ay' ? 1 : view === 'hafta' ? 7 : 1;
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
    return `${format(weekDays[0], 'd MMMM')} – ${format(weekDays[6], 'd MMMM yyyy', { locale: tr })}`;
  }, [currentDate, weekDays, view]);

  const bookingLink = user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${user.uid}/default` : '';

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-white font-sans">Yükleniyor...</div>;

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-100 font-sans">
      
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0 bg-white dark:bg-slate-900 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-2 mr-4">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            <span className="text-xl text-slate-700 dark:text-slate-200 font-medium tracking-tight">Takvim</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('today')}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-4"
            >
              Bugün
            </button>
            <div className="flex items-center gap-0.5 ml-2">
              <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <h2 className="text-[20px] text-slate-700 dark:text-slate-200 font-normal ml-4 min-w-[200px]">
              {headerTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => setIsInfoOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
            <Settings className="w-5 h-5" />
          </button>
          
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[100px] h-9 ml-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium text-sm">
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
              <Button variant="ghost" size="sm" asChild className="text-sm font-medium">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild className="text-sm font-medium">
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ml-4 border border-slate-200 dark:border-slate-700">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary/5 text-primary">
                    {user.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {isTeacher && (
                  <>
                    <DropdownMenuItem onClick={() => setIsQrModalOpen(true)}>
                      <QrCode className="w-4 h-4 mr-2" /> Randevu QR & Link
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Ayarlar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-medium" onClick={() => auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-[280px] border-r border-slate-100 dark:border-slate-800 p-4 shrink-0 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="w-full h-[48px] rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Plus className="w-6 h-6 text-blue-600" />
                  <span className="text-[14px]">Oluştur</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem onClick={() => handleDateSelect(currentDate, new Date().getHours())}>
                  <CalendarIcon className="w-4 h-4 mr-2" /> Etkinlik
                </DropdownMenuItem>
                {isTeacher && (
                  <DropdownMenuItem onClick={() => router.push('/booking-links')}>
                    <Clock className="w-4 h-4 mr-2" /> Randevu Programı
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mini Calendar */}
            <div className="px-1">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[14px] font-medium text-slate-700 dark:text-slate-300">
                  {format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}
                </h3>
                <div className="flex gap-0.5">
                  <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-slate-500 font-medium">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="w-8">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {miniCalendarDays.map((day, i) => {
                  const isCurMonth = isSameMonth(day, miniCalendarMonth);
                  const isDayToday = isToday(day);
                  const isDaySelected = isSameDay(day, currentDate);
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setCurrentDate(day);
                        setMiniCalendarMonth(day);
                      }}
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition-all m-auto text-[12px]",
                        !isCurMonth && "text-slate-300 dark:text-slate-700",
                        isCurMonth && !isDayToday && !isDaySelected && "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
                        isDayToday && !isDaySelected && "text-blue-600 font-bold",
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
                  {[
                    { id: 'personal', label: 'Kişisel', color: '#3b82f6' },
                    { id: 'family', label: 'Aile', color: '#8b5cf6' },
                    { id: 'booking', label: 'Randevular', color: '#10b981' }
                  ].map(filter => (
                    <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors group">
                      <Checkbox 
                        checked={filters[filter.id as keyof typeof filters]} 
                        onCheckedChange={(checked) => setFilters({...filters, [filter.id]: !!checked})}
                        className="border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{filter.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">Diğer Takvimler</h3>
                <div className="space-y-1">
                  {[
                    { id: 'holiday', label: 'Bayramlar', color: '#f59e0b' }
                  ].map(filter => (
                    <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors">
                      <Checkbox 
                        checked={filters[filter.id as keyof typeof filters]} 
                        onCheckedChange={(checked) => setFilters({...filters, [filter.id]: !!checked})}
                        className="border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{filter.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Calendar Grid Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
          {!user && (
            <div className="bg-blue-50 dark:bg-blue-900/30 py-1 px-4 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
              Misafir Modu: Planlarınızı kalıcı olarak kaydetmek için giriş yapın.
            </div>
          )}
          
          {/* Day Headers */}
          {view !== 'plan' && (
            <div className="flex pr-[15px] shrink-0">
              <div className="w-[64px] shrink-0 border-r border-transparent"></div>
              <div className={cn(
                "flex-1 border-b border-slate-200 dark:border-slate-800",
                view === 'ay' ? "grid grid-cols-7" : view === 'gün' ? "block" : "grid grid-cols-7"
              )}>
                {view === 'gün' ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-1 w-full">
                    <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(currentDate) ? 'text-blue-600' : 'text-slate-500')}>
                      {format(currentDate, 'eeee', { locale: tr })}
                    </span>
                    <div className={cn("w-[48px] h-[48px] flex items-center justify-center rounded-full", isToday(currentDate) ? 'bg-blue-600 text-white' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')}>
                      <span className="text-[24px] font-medium">{format(currentDate, 'd')}</span>
                    </div>
                  </div>
                ) : (
                  weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-4 gap-1 border-l border-transparent">
                      <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(day) ? 'text-blue-600' : 'text-slate-500')}>
                        {format(day, 'eee', { locale: tr })}
                      </span>
                      <div className={cn("w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors", isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')}>
                        <span className="text-[24px] font-medium">{format(day, 'd')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto relative bg-white dark:bg-slate-950" ref={gridScrollRef}>
            {view === 'ay' ? (
              <div className="grid grid-cols-7 h-full min-h-[600px] border-l border-slate-200 dark:border-slate-800">
                {monthDays.map((day, i) => {
                  const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day) && filters[e.type as keyof typeof filters]) || [];
                  return (
                    <div key={i} className={cn(
                      "border-r border-b border-slate-200 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer flex flex-col items-end",
                      !isSameMonth(day, currentDate) && "bg-slate-50/50 dark:bg-slate-900/50"
                    )}
                    onClick={() => handleDateSelect(day, 9)}
                    >
                      <div className={cn(
                        "text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                        isToday(day) ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="w-full space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event: any) => (
                          <div key={event.id} className="text-[10px] px-1.5 py-0.5 rounded text-white truncate font-medium" style={{ backgroundColor: event.color }}>
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] text-slate-400 pl-1">+{dayEvents.length - 3} daha</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : view === 'plan' ? (
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold">Program Akışı</h1>
                {combinedEvents.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Planlanmış bir etkinlik bulunmuyor.</div>
                ) : (
                  <div className="space-y-4">
                    {combinedEvents.map((event: any) => (
                      <div key={event.id} className="flex gap-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => handleEventClick(event)}>
                        <div className="w-1 bg-blue-500 rounded-full" style={{ backgroundColor: event.color }} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(event.start), 'd MMMM yyyy HH:mm', { locale: tr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex relative h-[1920px]">
                {/* Time Column */}
                <div className="w-[64px] shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-[80px] relative">
                      <span className="absolute -top-[7px] right-2 text-[11px] text-slate-500 font-medium">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className={cn("flex-1 relative border-t border-slate-100 dark:border-slate-800", view === 'hafta' ? "grid grid-cols-7" : "block")}>
                  {/* Horizontal Lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((_, i) => (
                      <div key={i} className="h-[80px] border-b border-slate-100 dark:border-slate-800 w-full"></div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {(view === 'gün' ? [currentDate] : weekDays).map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day) && filters[e.type as keyof typeof filters]) || [];
                    return (
                      <div key={i} className={cn("relative border-r border-[#f1f5f9] dark:border-slate-800 cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors", isToday(day) && "bg-blue-50/20 dark:bg-blue-900/10")}
                        onClick={(e) => {
                          if (e.target === e.currentTarget) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const hour = Math.floor(y / 80);
                            handleDateSelect(day, hour);
                          }
                        }}
                      >
                        {/* Current Time Line */}
                        {isToday(day) && (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentTime.getHours()) * 80 + (currentTime.getMinutes() / 60) * 80}px` }}>
                            <div className="h-[2px] bg-red-500 w-full relative">
                              <div className="w-3 h-3 bg-red-500 rounded-full absolute -top-[5px] -left-[6px] shadow-sm"></div>
                            </div>
                          </div>
                        )}

                        {/* Events */}
                        {dayEvents.map((event: any) => {
                          const start = parseISO(event.start);
                          const end = parseISO(event.end);
                          const top = (start.getHours()) * 80 + (start.getMinutes() / 60) * 80;
                          const height = (differenceInMinutes(end, start) / 60) * 80;
                          return (
                            <div key={event.id} className="absolute left-1 right-1 rounded-[4px] px-2 py-1 shadow-sm border text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden"
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

      {/* --- MODALS --- */}

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <VisuallyHidden><DialogTitle>Etkinlik Düzenle</DialogTitle></VisuallyHidden>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedEvent ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}</DialogTitle>
            {!user && <DialogDescription className="text-amber-600 font-medium">Lütfen kaydetmek için giriş yapın.</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık</Label>
              <Input id="title" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} placeholder="Örn: Haftalık Toplantı" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Başlangıç</Label>
                <Input id="start" type="datetime-local" value={eventForm.start} onChange={(e) => setEventForm({...eventForm, start: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Bitiş</Label>
                <Input id="end" type="datetime-local" value={eventForm.end} onChange={(e) => setEventForm({...eventForm, end: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Kategori</Label>
              <Select value={eventForm.type} onValueChange={(v) => {
                const colors = { personal: '#3b82f6', meeting: '#8b5cf6', family: '#f59e0b', booking: '#10b981' };
                setEventForm({...eventForm, type: v, color: (colors as any)[v] || '#3b82f6'});
              }}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Kişisel</SelectItem>
                  <SelectItem value="meeting">Toplantı</SelectItem>
                  <SelectItem value="family">Aile</SelectItem>
                  <SelectItem value="booking">Randevu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Notlar</Label>
              <Textarea id="description" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} placeholder="Açıklama ekleyin..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {selectedEvent && user && (
              <Button variant="ghost" onClick={async () => {
                await deleteDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id));
                setIsEventModalOpen(false);
                toast({ title: 'Silindi' });
              }} className="text-destructive sm:mr-auto">Sil</Button>
            )}
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveEvent}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[100vw] h-[100vh] p-0 m-0 border-none rounded-none bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white overflow-hidden flex flex-col">
          <VisuallyHidden><DialogTitle>Ayarlar</DialogTitle></VisuallyHidden>
          <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">Ayarlar</h2>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-[300px] border-r border-slate-200 dark:border-slate-700 p-4 shrink-0 overflow-y-auto hidden md:block">
              <nav className="space-y-1">
                {['Genel', 'Görünüm', 'Bildirimler'].map((cat, i) => (
                  <div key={i} className="py-2 px-4 text-[14px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    {cat}
                  </div>
                ))}
              </nav>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-3xl space-y-12">
                <section>
                  <h3 className="text-2xl mb-6 font-semibold">Dil ve Bölge</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8 items-center">
                      <Label className="text-slate-600 dark:text-slate-300">Dil</Label>
                      <Select defaultValue="tr">
                        <SelectTrigger className="bg-slate-50 dark:bg-[#2d2d2d] border-slate-200 dark:border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tr">Türkçe</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-2xl mb-6 font-semibold">Görünüm</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Karanlık Mod</span>
                      <Checkbox 
                        onCheckedChange={(checked) => {
                          if (checked) document.documentElement.classList.add('dark');
                          else document.documentElement.classList.remove('dark');
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </main>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[600px] top-[20%] translate-y-0 p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900">
          <VisuallyHidden><DialogTitle>Arama</DialogTitle></VisuallyHidden>
          <div className="flex items-center px-4 h-14 border-b dark:border-slate-800">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input className="flex-1 outline-none bg-transparent text-[15px] placeholder:text-slate-400" placeholder="Etkinlik, kişi veya tarih arayın" autoFocus />
          </div>
          <div className="p-4 min-h-[200px] flex items-center justify-center text-slate-400 text-sm italic">
            Arama sonuçları burada görünecek...
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900">
          <VisuallyHidden><DialogTitle>Randevu Linki</DialogTitle></VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Randevu Linki & QR</DialogTitle>
            <DialogDescription>Öğrencileriniz bu link üzerinden randevu alabilir.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="p-4 bg-white rounded-xl shadow-inner border">
              <QRCodeSVG value={bookingLink} size={200} />
            </div>
            <div className="w-full space-y-2">
              <Label>Randevu Linki</Label>
              <div className="flex gap-2">
                <Input value={bookingLink} readOnly className="bg-slate-50 dark:bg-slate-800 border-none" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(bookingLink);
                  toast({ title: 'Kopyalandı' });
                }}>
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link href={`/book/${user?.uid}/default`} target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" /> Sayfayı Görüntüle
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Modal */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900">
          <VisuallyHidden><DialogTitle>Yardım</DialogTitle></VisuallyHidden>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Yardım & İpuçları
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-[14px] text-slate-600 dark:text-slate-400">
            <p><strong>Randevu Alma:</strong> Takvimde boş bir saate tıklayarak veya "Oluştur" butonunu kullanarak yeni bir plan ekleyebilirsiniz.</p>
            <p><strong>Öğretmen Modu:</strong> Öğretmen olarak, profil menüsünden QR kodunuzu alıp öğrencilerinizle paylaşarak randevu toplayabilirsiniz.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
