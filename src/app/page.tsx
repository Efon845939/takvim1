
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
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
  UserPlus
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
import { useAuth } from '@/firebase';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'personal',
    color: '#3b82f6'
  });

  const eventsQuery = React.useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'events'));
  }, [db, user]);

  const { data: eventsData } = useCollection(eventsQuery as any);

  const calendarEvents = eventsData?.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: event.color,
    extendedProps: { ...event }
  })) || [];

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
        description: 'Planlarınızı kaydetmek ve yönetmek için lütfen hesap oluşturun veya giriş yapın.',
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
        toast({ title: 'Başarılı', description: 'Etkinlik güncellendi.' });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'events'), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Başarılı', description: 'Etkinlik oluşturuldu.' });
      }
      setIsEventModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız oldu.' });
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

  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <CalendarIcon className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block text-slate-800">Randevu Hoca</h1>
          </div>
          {user && (
            <nav className="hidden md:flex items-center gap-1 ml-8">
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/">Takvim</Link>
              </Button>
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/booking-links">Paylaşım Linkleri</Link>
              </Button>
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/settings">Ayarlar</Link>
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Giriş Yap
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Kayıt Ol
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Button variant="default" size="sm" className="hidden sm:flex" onClick={() => handleDateSelect({ startStr: new Date().toISOString(), endStr: new Date().toISOString() })}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Plan
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full border">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-semibold leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Ayarlar</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/booking-links">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <span>Randevu Linkleri</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => auth.signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6 bg-[#f8fafc]">
        <div className="h-full bg-white rounded-xl border shadow-sm overflow-hidden p-4 relative">
          {!user && (
            <div className="absolute inset-x-0 top-0 z-[5] p-4 flex justify-center">
              <div className="bg-primary/90 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
                Planlarınızı kaydetmek için lütfen giriş yapın
              </div>
            </div>
          )}
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
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
          />
        </div>
      </main>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}</DialogTitle>
            <DialogDescription>
              {!user 
                ? 'Misafir modunda plan oluşturabilirsiniz, ancak kaydetmek için giriş yapmalısınız.' 
                : 'Takviminize yeni bir giriş yapın veya mevcut olanı güncelleyin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık</Label>
              <Input 
                id="title" 
                value={eventForm.title} 
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Örn: Proje Toplantısı"
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
              <Label htmlFor="type">Tür</Label>
              <Select value={eventForm.type} onValueChange={(v) => setEventForm({...eventForm, type: v})}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Kişisel</SelectItem>
                  <SelectItem value="meeting">Toplantı</SelectItem>
                  <SelectItem value="reminder">Hatırlatıcı</SelectItem>
                  <SelectItem value="booking">Randevu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea 
                id="description" 
                value={eventForm.description} 
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Ek detaylar ekleyin..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedEvent && user && (
              <Button variant="destructive" onClick={handleDeleteEvent} className="sm:mr-auto">
                Sil
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveEvent}>
              {!user ? 'Giriş Yap ve Kaydet' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
