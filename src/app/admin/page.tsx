
"use client"

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ShieldCheck, Phone } from 'lucide-react';

interface Appointment {
  id: string;
  studentName: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'), orderBy('startTime', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      setAppointments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const upcomingAppointments = appointments.filter(app => {
    if (!app.date) return false;
    try {
      return isAfter(parseISO(app.date), startOfDay(new Date())) || 
      app.date === format(new Date(), 'yyyy-MM-dd');
    } catch {
      return false;
    }
  });

  return (
    <main className="max-w-6xl mx-auto p-4 md:py-12 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Hoca Randevu Paneli
          </h1>
          <p className="text-muted-foreground">Öğrenci randevularını buradan takip edebilirsiniz.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            {upcomingAppointments.length} Bekleyen Görüşme
          </Badge>
        </div>
      </header>

      <section>
        <Card className="shadow-2xl border-none">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Aktif Randevu Listesi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Veriler yükleniyor...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground space-y-2">
                <Info className="w-12 h-12 mx-auto text-slate-300" />
                <p>Henüz planlanmış bir randevu bulunmuyor.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-[180px]">Tarih</TableHead>
                    <TableHead className="w-[120px]">Saat</TableHead>
                    <TableHead>Öğrenci Bilgisi</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Kayıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAppointments.map((app) => (
                    <TableRow key={app.id} className="hover:bg-primary/5 transition-colors border-b last:border-0">
                      <TableCell className="font-bold text-slate-700">
                        {app.date ? format(parseISO(app.date), 'd MMMM yyyy', { locale: tr }) : '...'}
                        <div className="text-[10px] text-muted-foreground md:hidden">
                           {app.date ? format(parseISO(app.date), 'EEEE', { locale: tr }) : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-white shadow-sm px-2">
                          {app.startTime} - {app.endTime}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {app.studentName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-mono">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          {app.phone || 'Girilmemiş'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground text-xs">
                        {app.createdAt ? format(app.createdAt.toDate(), 'HH:mm - d MMM', { locale: tr }) : '...'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
