
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
  LogIn,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Menu,
  Check
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
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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
  }, [eventsData]);

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

  // Calendar Navigation
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
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Professional Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 bg-white z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 mr-4">
            <CalendarIcon className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold text-slate-700 hidden sm:inline-block tracking-tight">Takvim</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('today')} className="text-sm font-medium">Bugün</Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => navigate('prev')} className="h-8 w-8 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('next')} className="h-8 w-8 rounded-full">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <h2 className="text-xl font-medium text-slate-700 ml-2">{viewTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={activeView} onValueChange={changeView}>
            <SelectTrigger className="w-32 h-9 bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeGridDay">Gün</SelectItem>
              <SelectItem value="timeGridWeek">Hafta</SelectItem>
              <SelectItem value="dayGridMonth">Ay</SelectItem>
            </SelectContent>
          </Select>

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Giriş</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Kaydol</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer border hover:opacity-80 transition-opacity">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                    {user.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/booking-links"><LinkIcon className="w-4 h-4 mr-2" /> Paylaşım Linkleri</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings"><Settings className="w-4 h-4 mr-2" /> Ayarlar</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => auth.signOut()}>
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
            className="w-full h-12 rounded-full shadow-md hover:shadow-lg transition-all text-sm font-semibold gap-3"
            onClick={() => handleDateSelect({ startStr: new Date().toISOString(), endStr: new Date().toISOString() })}
          >
            <Plus className="w-6 h-6" />
            Oluştur
          </Button>

          <div className="px-2">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && goToDate(date)}
              className="rounded-md border-none scale-95 origin-top-left"
              locale={tr}
            />
          </div>

          <div className="space-y-4 px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Takvimlerim</h3>
            <div className="space-y-3">
              {[
                { id: 'personal', label: 'Kişisel', color: '#3b82f6' },
                { id: 'booking', label: 'Randevular', color: '#10b981' },
                { id: 'holiday', label: 'Tatiller', color: '#f59e0b' }
              ].map(filter => (
                <label key={filter.id} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox 
                    checked={filters[filter.id as keyof typeof filters]} 
                    onCheckedChange={(checked) => setFilters({...filters, [filter.id]: checked})}
                    className="border-slate-300 data-[state=checked]:border-none"
                    style={{ backgroundColor: filters[filter.id as keyof typeof filters] ? filter.color : 'transparent' }}
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{filter.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white relative">
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
            headerToolbar={false} /* Handled by custom header */
          />
          
          {!user && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce">
                Misafir Modu: Kaydetmek için Giriş Yapın
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}</DialogTitle>
            <DialogDescription>
              {!user && 'Giriş yapmadığınız için planlarınız kalıcı olarak kaydedilmeyecektir.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık</Label>
              <Input 
                id="title" 
                value={eventForm.title} 
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Etkinlik adı..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Başlangıç</Label>
                <Input 
                  id="start" 
                  type="datetime-local" 
                  value={eventForm.start} 
                  onChange={(e) => setEventForm({...eventForm, start: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Bitiş</Label>
                <Input 
                  id="end" 
                  type="datetime-local" 
                  value={eventForm.end} 
                  onChange={(e) => setEventForm({...eventForm, end: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Kategori</Label>
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
              <Label htmlFor="description">Notlar</Label>
              <Textarea 
                id="description" 
                value={eventForm.description} 
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Açıklama..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedEvent && user && (
              <Button variant="ghost" onClick={handleDeleteEvent} className="text-destructive hover:text-destructive hover:bg-destructive/10 sm:mr-auto">
                Sil
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveEvent} className="px-8 font-semibold">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
