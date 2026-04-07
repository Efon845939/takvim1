'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useAuth } from '@/firebase';
import { 
  collection, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  isSameDay,
  addWeeks,
  subWeeks,
  parseISO,
  differenceInMinutes,
  startOfDay,
  setHours,
  setMinutes
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
  Info,
  Search,
  HelpCircle
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

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
  });

  // Update current time every minute for the red line
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const eventsQuery = React.useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'events'));
  }, [db, user]);

  const { data: eventsData } = useCollection(eventsQuery as any);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00 to 23:00

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
      toast({
        title: 'Giriş Gerekli',
        description: 'Planlarınızı kaydetmek için lütfen giriş yapın.',
      });
      return;
    }

    try {
      const start = new Date(eventForm.start).toISOString();
      const end = new Date(eventForm.end).toISOString();
      const eventData = {
        ...eventForm,
        start,
        end,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (selectedEvent) {
        await updateDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id), eventData);
        toast({ title: 'Başarılı', description: 'Plan güncellendi.' });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'events'), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Başarılı', description: 'Plan oluşturuldu.' });
      }
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız.' });
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || !selectedEvent) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id));
      toast({ title: 'Silindi', description: 'Plan kaldırıldı.' });
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Silme işlemi başarısız.' });
    }
  };

  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'prev') setCurrentDate(subWeeks(currentDate, 1));
    else if (dir === 'next') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(new Date());
  };

  // Mini Calendar Logic
  const miniCalendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startDay = getDay(start) === 0 ? 6 : getDay(start) - 1; // Adjust to Mon start
    const calendarStart = addDays(start, -startDay);
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));
  }, [currentDate]);

  if (isUserLoading) {
    return <div className="h-screen flex items-center justify-center bg-white">Yükleniyor...</div>;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden text-slate-800 font-sans">
      {/* --- HEADER --- */}
      <header className="h-[64px] border-b border-slate-200 flex items-center px-4 justify-between shrink-0 bg-white z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">{format(new Date(), 'd')}</span>
            </div>
            <span className="text-xl text-slate-600 font-medium tracking-wide">Takvim</span>
          </div>
          
          <div className="flex items-center gap-4 ml-8">
            <button 
              onClick={() => navigate('today')}
              className="px-4 py-2 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Bugün
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button onClick={() => navigate('next')} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <h2 className="text-[22px] text-slate-700 font-normal ml-2">
              {format(weekDays[0], 'd')} – {format(weekDays[6], 'd MMMM yyyy', { locale: tr })}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><Search className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><HelpCircle className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><Settings className="w-5 h-5" /></button>
          
          <div className="h-9 px-3 border border-slate-300 rounded text-sm font-medium flex items-center hover:bg-slate-50 cursor-pointer ml-2">
            Hafta
          </div>

          {!user ? (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ml-2 border border-slate-200">
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
                <DropdownMenuItem asChild><Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings"><Settings className="w-4 h-4 mr-2" /> Ayarlar</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* --- INFO BAR --- */}
      {!user && (
        <div className="h-[36px] bg-[#f0f4f8] border-b px-4 flex items-center gap-2 text-[13px] font-medium text-slate-600 shrink-0">
          <Info className="w-4 h-4 text-primary" />
          Misafir Modu: Planlarınızı kalıcı olarak kaydetmek için giriş yapın.
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-[280px] border-r border-slate-100 p-4 shrink-0 overflow-y-auto bg-white">
            <Button 
              className="w-full h-12 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium gap-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 mb-6"
              onClick={() => handleDateSelect(new Date(), new Date().getHours())}
            >
              <Plus className="w-5 h-5 text-primary" />
              Oluştur
            </Button>

            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-semibold">{format(currentDate, 'MMMM yyyy', { locale: tr })}</h3>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate(subWeeks(currentDate, 4))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentDate(addWeeks(currentDate, 4))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2 text-slate-500 font-medium">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {miniCalendarDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isDayToday = isToday(day);
                  return (
                    <div 
                      key={i} 
                      onClick={() => setCurrentDate(day)}
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition-colors m-auto",
                        !isCurrentMonth && "text-slate-300",
                        isCurrentMonth && !isDayToday && "hover:bg-slate-100",
                        isDayToday && "bg-blue-600 text-white font-bold"
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">Takvimlerim</h3>
              <div className="space-y-1">
                {[
                  { id: 'personal', label: 'Kişisel', color: '#3b82f6' },
                  { id: 'booking', label: 'Randevular', color: '#10b981' },
                  { id: 'holiday', label: 'Tatiller', color: '#f59e0b' }
                ].map(filter => (
                  <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded-md">
                    <Checkbox 
                      checked={filters[filter.id as keyof typeof filters]} 
                      onCheckedChange={(checked) => setFilters({...filters, [filter.id]: checked})}
                      className="border-slate-300 data-[state=checked]:border-none"
                      style={{ backgroundColor: filters[filter.id as keyof typeof filters] ? filter.color : 'transparent' }}
                    />
                    <span className="text-sm font-medium text-slate-700">{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Calendar Grid */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Day Headers */}
          <div className="flex pr-[15px] shrink-0">
            <div className="w-[64px] shrink-0 border-r border-transparent"></div>
            <div className="flex-1 grid grid-cols-7 border-b border-slate-200">
              {weekDays.map((day, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-3 gap-1">
                  <span className={cn(
                    "text-[11px] font-medium tracking-wide uppercase",
                    isToday(day) ? 'text-blue-600' : 'text-slate-500'
                  )}>
                    {format(day, 'eee', { locale: tr })}
                  </span>
                  <div className={cn(
                    "w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors",
                    isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  )}>
                    <span className="text-[26px] font-semibold leading-none">{format(day, 'd')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto relative flex">
            {/* Time Column */}
            <div className="w-[64px] shrink-0 relative bg-white z-10 border-r border-slate-100">
              {hours.map((hour, i) => (
                <div key={i} className="h-[80px] relative">
                  <span className="absolute -top-[7px] right-2 text-[12px] text-slate-500 bg-white px-1">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 relative">
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((_, i) => (
                  <div key={i} className="h-[80px] border-b border-slate-200 w-full"></div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, i) => {
                const dayEvents = eventsData?.filter(e => 
                  isSameDay(parseISO(e.start), day) && 
                  filters[e.type as keyof typeof filters]
                ) || [];

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "relative border-r border-[#f1f5f9] min-h-[1360px] cursor-pointer hover:bg-slate-50/50 transition-colors",
                      isToday(day) && "bg-blue-50/20"
                    )}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const hour = Math.floor(y / 80) + 7;
                        handleDateSelect(day, hour);
                      }
                    }}
                  >
                    {/* Current Time Line */}
                    {isToday(day) && currentTime.getHours() >= 7 && currentTime.getHours() < 24 && (
                      <div 
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ 
                          top: `${(currentTime.getHours() - 7) * 80 + (currentTime.getMinutes() / 60) * 80}px` 
                        }}
                      >
                        <div className="h-[2px] bg-red-500 w-full relative">
                          <div className="w-3 h-3 bg-red-500 rounded-full absolute -top-[5px] -left-[6px]"></div>
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {dayEvents.map((event: any) => {
                      const start = parseISO(event.start);
                      const end = parseISO(event.end);
                      const top = (start.getHours() - 7) * 80 + (start.getMinutes() / 60) * 80;
                      const height = (differenceInMinutes(end, start) / 60) * 80;

                      return (
                        <div 
                          key={event.id}
                          className="absolute left-1 right-1 rounded-[4px] px-2 py-1 shadow-sm border text-[11px] font-semibold text-white transition-all hover:brightness-110 z-10 overflow-hidden"
                          style={{ 
                            top: `${top}px`, 
                            height: `${Math.max(height, 24)}px`,
                            backgroundColor: event.color,
                            borderColor: 'rgba(0,0,0,0.1)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="truncate">{event.title}</div>
                          {height > 40 && (
                            <div className="opacity-90">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedEvent ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}</DialogTitle>
            {!user && <DialogDescription className="text-amber-600 font-medium">Lütfen kaydetmek için giriş yapın.</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">Başlık</Label>
              <Input 
                id="title" 
                value={eventForm.title} 
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Örn: Haftalık Toplantı"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start" className="text-sm font-medium">Başlangıç</Label>
                <Input 
                  id="start" 
                  type="datetime-local" 
                  value={eventForm.start} 
                  onChange={(e) => setEventForm({...eventForm, start: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end" className="text-sm font-medium">Bitiş</Label>
                <Input 
                  id="end" 
                  type="datetime-local" 
                  value={eventForm.end} 
                  onChange={(e) => setEventForm({...eventForm, end: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-sm font-medium">Kategori</Label>
              <Select 
                value={eventForm.type} 
                onValueChange={(v) => {
                  const colors = { personal: '#3b82f6', meeting: '#8b5cf6', reminder: '#f59e0b', booking: '#10b981', holiday: '#f43f5e' };
                  setEventForm({...eventForm, type: v, color: colors[v as keyof typeof colors]});
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Kişisel</SelectItem>
                  <SelectItem value="meeting">Toplantı</SelectItem>
                  <SelectItem value="reminder">Hatırlatıcı</SelectItem>
                  <SelectItem value="booking">Randevu</SelectItem>
                  <SelectItem value="holiday">Tatil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">Notlar</Label>
              <Textarea 
                id="description" 
                value={eventForm.description} 
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Açıklama ekleyin..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {selectedEvent && user && (
              <Button variant="ghost" onClick={handleDeleteEvent} className="text-destructive sm:mr-auto">Sil</Button>
            )}
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveEvent}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
