'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut, 
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Check,
  Info,
  User as UserIcon
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
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewTitle, setViewTitle] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState('timeGridWeek');

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

  const eventsQuery = React.useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'events'));
  }, [db, user]);

  const { data: eventsData } = useCollection(eventsQuery as any);

  const calendarEvents = React.useMemo(() => {
    return eventsData
      ?.filter(event => filters[event.type as keyof typeof filters] !== false)
      .map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: event.color,
        extendedProps: { ...event }
      })) || [];
  }, [eventsData, filters]);

  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      setViewTitle(api.view.title);
    }
  }, [eventsData, activeView]);

  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start: selectInfo.startStr.slice(0, 16),
      end: selectInfo.endStr.slice(0, 16),
      type: 'personal',
      color: '#3b82f6'
    });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event.extendedProps;
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: event.start,
      end: event.end,
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
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push('/login')}>Giriş Yap</Button>
        ),
      });
      return;
    }

    try {
      const eventData = {
        ...eventForm,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (selectedEvent) {
        await updateDoc(doc(db, 'users', user.uid, 'events', selectedEvent.id), eventData);
        toast({ title: 'Başarılı', description: 'Güncellendi.' });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'events'), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Başarılı', description: 'Oluşturuldu.' });
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
      toast({ title: 'Silindi', description: 'Etkinlik kaldırıldı.' });
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Silme işlemi başarısız.' });
    }
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    if (direction === 'prev') api.prev();
    else if (direction === 'next') api.next();
    else api.today();
    setViewTitle(api.view.title);
    setCurrentDate(api.getDate());
  };

  const changeView = (view: string) => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    api.changeView(view);
    setActiveView(view);
    setViewTitle(api.view.title);
  };

  const goToDate = (date: Date) => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    api.gotoDate(date);
    setViewTitle(api.view.title);
    setCurrentDate(date);
  };

  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <CalendarIcon className="w-10 h-10 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-[#111827]">
      {/* Precision Header */}
      <header className="h-[64px] border-b flex items-center justify-between px-4 bg-white z-30 shrink-0">
        {/* LEFT ZONE */}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 mr-6 min-w-max">
            <CalendarIcon className="w-7 h-7 text-primary" />
            <span className="text-[18px] font-semibold tracking-tight text-[#111827]">Takvim</span>
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <Button variant="outline" size="sm" onClick={() => navigate('today')} className="h-9 rounded-md px-4 text-sm font-medium border-slate-200 hover:bg-slate-50">Bugün</Button>
            <div className="flex items-center ml-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('prev')} className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('next')} className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* CENTER ZONE */}
        <div className="flex-1 text-center">
          <h2 className="text-[18px] font-medium text-[#111827]">{viewTitle}</h2>
        </div>

        {/* RIGHT ZONE */}
        <div className="flex items-center gap-2">
          <Select value={activeView} onValueChange={changeView}>
            <SelectTrigger className="w-[100px] h-9 border-slate-200 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeGridDay">Gün</SelectItem>
              <SelectItem value="timeGridWeek">Hafta</SelectItem>
              <SelectItem value="dayGridMonth">Ay</SelectItem>
            </SelectContent>
          </Select>

          {!user ? (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-600">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild className="rounded-md px-4 font-semibold">
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ml-2 border border-slate-200 hover:shadow-sm">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 mt-2">
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold text-slate-800">{user.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/booking-links" className="cursor-pointer"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings" className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Ayarlar</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer" onClick={() => auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "w-[280px] border-r bg-white p-4 transition-all duration-300 flex flex-col gap-6 shrink-0",
            !sidebarOpen && "-ml-[280px]"
          )}
        >
          <Button 
            className="w-full h-12 rounded-full shadow-md hover:shadow-lg transition-all text-sm font-semibold gap-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            onClick={() => handleDateSelect({ startStr: new Date().toISOString(), endStr: new Date().toISOString() })}
          >
            <Plus className="w-6 h-6 text-primary" />
            Oluştur
          </Button>

          <div className="mini-calendar-container">
             <div className="text-center mb-4 text-[14px] font-semibold text-[#111827]">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
             </div>
             <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && goToDate(date)}
                className="p-0 border-none w-full"
                locale={tr}
                classNames={{
                  month: "space-y-4 w-full",
                  head_row: "flex justify-between",
                  head_cell: "text-[#6b7280] font-normal text-[11px] uppercase w-8 text-center",
                  row: "flex w-full justify-between mt-1",
                  cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal text-[#111827] hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center",
                  day_selected: "bg-primary text-white font-semibold hover:bg-primary/90",
                  day_today: "text-primary font-bold border border-primary",
                  day_outside: "text-[#6b7280] opacity-30",
                }}
                components={{
                  IconLeft: () => null,
                  IconRight: () => null,
                }}
                // Custom weekday labels for Pt Sa Ça Pe Cu Ct Pz
                formatters={{
                  formatWeekdayName: (date) => {
                    const days = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
                    return days[date.getDay()];
                  }
                }}
              />
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] px-1">Takvimlerim</h3>
            <div className="space-y-1">
              {[
                { id: 'personal', label: 'Kişisel', color: '#3b82f6' },
                { id: 'booking', label: 'Randevular', color: '#10b981' },
                { id: 'holiday', label: 'Tatiller', color: '#f59e0b' }
              ].map(filter => (
                <label key={filter.id} className="flex items-center gap-3 px-2 py-1.5 cursor-pointer group hover:bg-slate-50 rounded-md transition-colors">
                  <Checkbox 
                    checked={filters[filter.id as keyof typeof filters]} 
                    onCheckedChange={(checked) => setFilters({...filters, [filter.id]: checked})}
                    className="border-slate-300 data-[state=checked]:border-none h-4 w-4 rounded-sm"
                    style={{ backgroundColor: filters[filter.id as keyof typeof filters] ? filter.color : 'transparent' }}
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-[#111827]">{filter.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white relative">
          {!user && (
            <div className="h-[36px] bg-[#f0f4f8] border-b px-4 flex items-center gap-2 text-[13px] font-medium text-slate-600 shrink-0">
              <Info className="w-4 h-4 text-primary" />
              Misafir Modu: Planlarınızı kalıcı olarak kaydetmek için giriş yapın.
            </div>
          )}
          
          <div className="flex-1 relative">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={activeView}
              locale={trLocale}
              editable={!!user}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              events={calendarEvents}
              select={handleDateSelect}
              eventClick={handleEventClick}
              height="100%"
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              nowIndicator={true}
              allDaySlot={true}
              headerToolbar={false}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: false
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              dayHeaderContent={(args) => {
                const dayName = format(args.date, 'eee', { locale: tr }).toUpperCase();
                const dayNumber = format(args.date, 'd');
                return (
                  <div className="fc-col-header-cell-cushion">
                    <span className="day-name">{dayName}</span>
                    <span className="day-number">{dayNumber}</span>
                  </div>
                );
              }}
            />
          </div>
        </main>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-slate-800">{selectedEvent ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}</DialogTitle>
            {!user && (
              <DialogDescription className="text-amber-600 font-medium">
                Giriş yapmadığınız için planlarınız kaydedilmeyecektir.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium text-slate-600">Başlık</Label>
              <Input 
                id="title" 
                value={eventForm.title} 
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Örn: Haftalık Toplantı"
                className="h-10 focus-visible:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start" className="text-sm font-medium text-slate-600">Başlangıç</Label>
                <Input 
                  id="start" 
                  type="datetime-local" 
                  value={eventForm.start} 
                  onChange={(e) => setEventForm({...eventForm, start: e.target.value})}
                  className="h-10 focus-visible:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end" className="text-sm font-medium text-slate-600">Bitiş</Label>
                <Input 
                  id="end" 
                  type="datetime-local" 
                  value={eventForm.end} 
                  onChange={(e) => setEventForm({...eventForm, end: e.target.value})}
                  className="h-10 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-sm font-medium text-slate-600">Kategori</Label>
              <Select 
                value={eventForm.type} 
                onValueChange={(v) => {
                  const colors = { personal: '#3b82f6', meeting: '#8b5cf6', reminder: '#f59e0b', booking: '#10b981', holiday: '#f43f5e' };
                  setEventForm({...eventForm, type: v, color: colors[v as keyof typeof colors]});
                }}
              >
                <SelectTrigger id="type" className="h-10 focus:ring-primary">
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
              <Label htmlFor="description" className="text-sm font-medium text-slate-600">Notlar</Label>
              <Textarea 
                id="description" 
                value={eventForm.description} 
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Açıklama ekleyin..."
                className="focus-visible:ring-primary min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            {selectedEvent && user && (
              <Button variant="ghost" onClick={handleDeleteEvent} className="text-destructive hover:text-destructive hover:bg-destructive/5 sm:mr-auto">
                Sil
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)} className="rounded-md px-6">İptal</Button>
            <Button onClick={handleSaveEvent} className="rounded-md px-8 font-semibold">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}