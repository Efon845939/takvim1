
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
  orderBy
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
  isSameMonth
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
  MoreVertical
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
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'personal',
    color: '#3b82f6',
    guests: '',
    location: ''
  });

  const [filters, setFilters] = useState({
    personal: true,
    booking: true,
    holiday: true,
    family: true,
  });

  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedCountries, setSelectedCountries] = useState(['TR']);
  const [activeEventTab, setActiveTab] = useState('Etkinlik');

  // --- REFRESH CURRENT TIME & AUTO SCROLL ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    if (gridScrollRef.current && (view === 'hafta' || view === 'gün')) {
      gridScrollRef.current.scrollTop = 7 * 80;
    }
    return () => clearInterval(timer);
  }, [view]);

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
            allHolidays = [...allHolidays, ...data.map((h: any) => ({
              id: h.date + h.localName + code,
              title: `${h.localName} (${code})`,
              start: h.date,
              end: h.date,
              type: 'holiday',
              color: '#10b981'
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
  const userDocRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const isTeacher = userData?.role === 'teacher' || user?.email === 'proturkgamerefe@gmail.com';

  const combinedEvents = React.useMemo(() => {
    const userEvents = eventsData || [];
    const holidayEvents = filters.holiday ? holidays : [];
    return [...userEvents, ...holidayEvents];
  }, [eventsData, holidays, filters.holiday]);

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
      color: '#3b82f6',
      guests: '',
      location: ''
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
      color: event.color,
      guests: event.guests || '',
      location: event.location || ''
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

  const bookingLink = user ? `${window.location.origin}/book/${user.uid}/default` : '';

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-white font-sans">Yükleniyor...</div>;

  return (
    <div className="h-screen w-full flex flex-col bg-[#202124] overflow-hidden text-slate-200 font-sans">
      
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b border-slate-700 flex items-center px-4 justify-between shrink-0 bg-[#202124] z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <Menu className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 mr-4">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
            <span className="text-xl text-white font-medium tracking-tight">Takvim</span>
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
            <button 
              onClick={() => { setSelectedEvent(null); setIsEventModalOpen(true); }}
              className="flex items-center gap-3 bg-slate-800 border border-slate-600 shadow-sm px-4 py-3 rounded-full hover:bg-slate-700 transition-all font-medium text-[14px] text-white w-full"
            >
              <Plus className="w-6 h-6 text-blue-400" />
              <span>Oluştur</span>
            </button>

            {/* Mini Calendar */}
            <div className="px-1">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[14px] font-medium text-slate-200">{format(miniCalendarMonth, 'MMMM yyyy', { locale: tr })}</h3>
                <div className="flex gap-0.5">
                  <button onClick={() => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-4 h-4 text-slate-300" /></button>
                  <button onClick={() => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1))} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight className="w-4 h-4 text-slate-300" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-slate-500 font-medium uppercase tracking-tighter">
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
                  <button onClick={() => setIsCountryModalOpen(true)} className="p-1 hover:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-3.5 h-3.5 text-slate-400" /></button>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md transition-colors">
                    <Checkbox checked={filters.holiday} onCheckedChange={(checked) => setFilters({...filters, holiday: !!checked})} className="border-slate-600 data-[state=checked]:bg-emerald-500" />
                    <span className="text-[13px] font-medium text-slate-300">Bayramlar & Tatiller</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden bg-[#202124]">
          {/* Day Headers */}
          {view !== 'plan' && (
            <div className="flex pr-[15px] shrink-0">
              <div className="w-[64px] shrink-0 border-r border-transparent"></div>
              <div className={cn("flex-1 border-b border-slate-700", view === 'ay' ? "grid grid-cols-7" : view === 'gün' ? "block" : "grid grid-cols-7")}>
                {view === 'gün' ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-1 w-full">
                    <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(currentDate) ? 'text-blue-400' : 'text-slate-500')}>{format(currentDate, 'eeee', { locale: tr })}</span>
                    <div className={cn("w-[48px] h-[48px] flex items-center justify-center rounded-full", isToday(currentDate) ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800')}><span className="text-[24px] font-medium">{format(currentDate, 'd')}</span></div>
                  </div>
                ) : (
                  weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-4 gap-1 border-l border-transparent">
                      <span className={cn("text-[11px] font-bold tracking-widest uppercase", isToday(day) ? 'text-blue-400' : 'text-slate-500')}>{format(day, 'eee', { locale: tr })}</span>
                      <div className={cn("w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors", isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800')}><span className="text-[24px] font-medium">{format(day, 'd')}</span></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative bg-[#202124]" ref={gridScrollRef}>
            {view === 'ay' ? (
              <div className="grid grid-cols-7 h-full min-h-[600px] border-l border-slate-700">
                {monthDays.map((day, i) => {
                  const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day) && filters[e.type as keyof typeof filters]) || [];
                  return (
                    <div key={i} className={cn("border-r border-b border-slate-700 p-2 hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col items-end", !isSameMonth(day, currentDate) && "opacity-30")} onClick={() => handleDateSelect(day, 9)}>
                      <div className={cn("text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-blue-600 text-white" : "text-slate-400")}>{format(day, 'd')}</div>
                      <div className="w-full space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event: any) => (
                          <div key={event.id} className="text-[10px] px-1.5 py-0.5 rounded text-white truncate font-medium" style={{ backgroundColor: event.color }}>{event.title}</div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] text-slate-500 pl-1">+{dayEvents.length - 3} daha</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : view === 'plan' ? (
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-white">Program Akışı</h1>
                {combinedEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">Planlanmış bir etkinlik bulunmuyor.</div>
                ) : (
                  <div className="space-y-4">
                    {combinedEvents.map((event: any) => (
                      <div key={event.id} className="flex gap-4 p-4 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleEventClick(event)}>
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
                {/* Time Column */}
                <div className="w-[64px] shrink-0 border-r border-slate-700 bg-[#202124]">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-[80px] relative">
                      <span className="absolute -top-[7px] right-2 text-[11px] text-slate-500 font-medium">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className={cn("flex-1 relative border-t border-slate-700", view === 'hafta' ? "grid grid-cols-7" : "block")}>
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((_, i) => <div key={i} className="h-[80px] border-b border-slate-700 w-full"></div>)}
                  </div>

                  {(view === 'gün' ? [currentDate] : weekDays).map((day, i) => {
                    const dayEvents = combinedEvents.filter(e => isSameDay(parseISO(e.start), day) && filters[e.type as keyof typeof filters]) || [];
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
                            <div key={event.id} className="absolute left-1 right-1 rounded-[4px] px-2 py-1 shadow-md border text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden"
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

      {/* ========================================================= */}
      {/* EXACT GOOGLE CALENDAR EVENT CREATION MODAL CLONE          */}
      {/* ========================================================= */}
      <Dialog open={isEventModalOpen} onOpenChange={(val) => { setIsEventModalOpen(val); if(!val) document.body.style.pointerEvents = ""; }}>
        <DialogContent className="sm:max-w-[500px] bg-[#202124] border-slate-700 p-0 overflow-hidden shadow-2xl rounded-xl">
          <VisuallyHidden><DialogTitle>Etkinlik Oluştur</DialogTitle></VisuallyHidden>
          
          {/* Header Controls */}
          <div className="flex items-center justify-between p-2 bg-slate-800/20">
            <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><Menu className="w-4 h-4" /></button>
            <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-6 pt-2 space-y-6">
            {/* Title Input */}
            <input 
              type="text" 
              placeholder="Başlık ekle" 
              value={eventForm.title}
              onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              className="w-full bg-transparent text-[24px] text-white placeholder-slate-500 outline-none border-b-2 border-slate-700 focus:border-blue-400 pb-1 transition-colors"
              autoFocus
            />

            {/* Tabs */}
            <div className="flex gap-2">
              {['Etkinlik', 'Görev', 'Randevu programı'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    activeEventTab === tab ? "bg-blue-900/40 text-blue-300" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Form Rows */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <input type="datetime-local" value={eventForm.start} onChange={(e) => setEventForm({...eventForm, start: e.target.value})} className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none" />
                    <span className="text-slate-500">-</span>
                    <input type="datetime-local" value={eventForm.end} onChange={(e) => setEventForm({...eventForm, end: e.target.value})} className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none" />
                  </div>
                  <div className="text-xs text-blue-400 cursor-pointer hover:underline">Saat dilimi • Yinelenmez</div>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <Users className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" placeholder="Davetli ekle" value={eventForm.guests} onChange={(e) => setEventForm({...eventForm, guests: e.target.value})} className="bg-transparent text-sm text-slate-200 outline-none w-full border-b border-transparent focus:border-slate-700 pb-1" />
              </div>

              <div className="flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 p-2 -ml-2 rounded-lg transition-colors">
                <div className="bg-blue-600 rounded p-1.5"><Video className="w-4 h-4 text-white" /></div>
                <div className="text-sm text-blue-400 font-medium">Google Meet video konferans görüşmesi ekle</div>
              </div>

              <div className="flex items-center gap-4 group">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" placeholder="Konum ekle" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} className="bg-transparent text-sm text-slate-200 outline-none w-full border-b border-transparent focus:border-slate-700 pb-1" />
              </div>

              <div className="flex items-start gap-4 group">
                <AlignLeft className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                <textarea placeholder="Açıklama veya Google Drive eki ekle" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} className="bg-transparent text-sm text-slate-200 outline-none w-full min-h-[60px] resize-none" />
              </div>

              <div className="flex items-start gap-4 cursor-pointer hover:bg-slate-800/50 p-2 -ml-2 rounded-lg transition-colors">
                <CalendarIcon className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">{user?.displayName || 'Takvimim'}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="text-xs text-slate-500">Meşgul • Varsayılan görünürlük • 30 dakika önce bildir</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/10 border-t border-slate-700/50 flex items-center justify-between">
            <button className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800">Diğer seçenekler</button>
            <div className="flex gap-3">
              {selectedEvent && (
                <button onClick={async () => { await deleteDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id)); setIsEventModalOpen(false); toast({title: 'Silindi'}); }} className="text-sm font-medium text-red-400 hover:bg-red-900/20 px-4 py-2 rounded-md">Sil</button>
              )}
              <button onClick={handleSaveEvent} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full text-sm font-medium transition-all shadow-lg">Kaydet</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* THE PROPER SETTINGS MODAL (FULL SCREEN)                   */}
      {/* ========================================================= */}
      <Dialog open={isSettingsOpen} onOpenChange={(val) => { setIsSettingsOpen(val); if(!val) document.body.style.pointerEvents = ""; }}>
        <DialogContent className="max-w-full h-full p-0 m-0 border-none rounded-none bg-[#202124] text-white flex flex-col">
          <VisuallyHidden><DialogTitle>Ayarlar</DialogTitle></VisuallyHidden>
          
          <div className="h-16 border-b border-slate-700 flex items-center px-6 gap-6 shrink-0 bg-[#202124]">
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-300" /></button>
            <h2 className="text-xl font-medium">Ayarlar</h2>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-[280px] border-r border-slate-700 py-6 overflow-y-auto bg-[#292a2d]">
              <div className="px-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Genel</div>
              <button className="w-full text-left px-6 py-3 bg-blue-900/20 text-blue-400 font-medium border-l-4 border-blue-500">Dil ve bölge</button>
              <button className="w-full text-left px-6 py-3 hover:bg-slate-800 text-slate-400">Saat dilimi</button>
              <button className="w-full text-left px-6 py-3 hover:bg-slate-800 text-slate-400">Etkinlik ayarları</button>
              <div className="px-6 mt-8 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Görünüm</div>
              <button className="w-full text-left px-6 py-3 hover:bg-slate-800 text-slate-400">Tema</button>
              <button className="w-full text-left px-6 py-3 hover:bg-slate-800 text-slate-400">Yoğunluk</button>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 p-12 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-12">
                <section>
                  <h3 className="text-2xl font-normal mb-8">Dil ve bölge</h3>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8 items-center">
                      <Label className="text-slate-400">Dil</Label>
                      <Select defaultValue="tr">
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          <SelectItem value="tr">Türkçe</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-8 items-center">
                      <Label className="text-slate-400">Saat Biçimi</Label>
                      <Select defaultValue="24">
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          <SelectItem value="24">13:00 (24 Saat)</SelectItem>
                          <SelectItem value="12">1:00 PM (12 Saat)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-2xl font-normal mb-8">Görünüm</h3>
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">Karanlık Mod</span>
                      <span className="text-sm text-slate-500">Göz yorgunluğunu azaltmak için karanlık temayı kullanın.</span>
                    </div>
                    <Checkbox defaultChecked className="w-6 h-6 border-slate-600 data-[state=checked]:bg-blue-500" />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={(val) => { setIsSearchOpen(val); if(!val) document.body.style.pointerEvents = ""; }}>
        <DialogContent className="sm:max-w-[600px] bg-[#202124] border-slate-700 text-white">
          <VisuallyHidden><DialogTitle>Etkinlik Ara</DialogTitle></VisuallyHidden>
          <div className="flex items-center gap-4 p-2">
            <Search className="w-5 h-5 text-slate-500" />
            <input className="flex-1 bg-transparent outline-none text-lg" placeholder="Etkinlik ara..." autoFocus />
            <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={(val) => { setIsQrModalOpen(val); if(!val) document.body.style.pointerEvents = ""; }}>
        <DialogContent className="sm:max-w-[400px] bg-[#202124] border-slate-700 text-white">
          <VisuallyHidden><DialogTitle>Randevu QR Kodu</DialogTitle></VisuallyHidden>
          <DialogHeader><DialogTitle className="text-center">Randevu QR Kodu</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-blue-500/20">
              <QRCodeSVG value={bookingLink} size={220} level="H" includeMargin={true} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">Bu QR kodu öğrencilerinize taratarak randevu almalarını sağlayabilirsiniz.</p>
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                <input readOnly value={bookingLink} className="bg-transparent text-xs text-blue-400 flex-1 outline-none truncate" />
                <button onClick={() => { navigator.clipboard.writeText(bookingLink); toast({title:'Kopyalandı'}); }} className="p-1.5 hover:bg-slate-700 rounded"><LinkIcon className="w-4 h-4" /></button>
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-full py-6" asChild>
              <Link href={bookingLink} target="_blank"><ExternalLink className="w-4 h-4 mr-2" /> Sayfayı Görüntüle</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Country Holiday Modal */}
      <Dialog open={isCountryModalOpen} onOpenChange={(val) => { setIsCountryModalOpen(val); if(!val) document.body.style.pointerEvents = ""; }}>
        <DialogContent className="sm:max-w-[400px] bg-[#202124] border-slate-700 text-white">
          <VisuallyHidden><DialogTitle>Ülke Bayramı Ekle</DialogTitle></VisuallyHidden>
          <DialogHeader><DialogTitle>Ülke Bayramı Ekle</DialogTitle><DialogDescription className="text-slate-500">Eklemek istediğiniz ülkenin 2 harfli kodunu girin (Örn: US, DE, FR).</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Ülke Kodu (ISO)</Label>
              <Input id="countryCode" placeholder="US" className="bg-slate-800 border-slate-700 text-white" onKeyDown={(e) => {
                if(e.key === 'Enter') {
                  const code = (e.target as HTMLInputElement).value.toUpperCase();
                  if(code && !selectedCountries.includes(code)) {
                    setSelectedCountries([...selectedCountries, code]);
                    setIsCountryModalOpen(false);
                    toast({title: 'Ülke eklendi', description: `${code} tatilleri yükleniyor...`});
                  }
                }
              }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCountries.map(code => (
                <div key={code} className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded flex items-center gap-2 text-xs">
                  {code}
                  <button onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== code))}><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
