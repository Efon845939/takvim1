"use client"

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ShieldCheck } from 'lucide-react';

interface Appointment {
  id: string;
  studentName: string;
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

  const upcomingAppointments = appointments.filter(app => 
    isAfter(parseISO(app.date), startOfDay(new Date())) || 
    app.date === format(new Date(), 'yyyy-MM-dd')
  );

  return (
    <main className="max-w-5xl mx-auto p-4 md:py-12 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Danışman Paneli
          </h1>
          <p className="text-muted-foreground">Sintia Hoca için Randevu Takibi</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {upcomingAppointments.length} Bekleyen Randevu
          </Badge>
        </div>
      </header>

      <section>
        <Card className="shadow-xl border-none">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Tüm Randevular
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Yükleniyor...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">Henüz randevu bulunmamaktadır.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px]">Tarih</TableHead>
                    <TableHead className="w-[120px]">Saat</TableHead>
                    <TableHead>Öğrenci Adı</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Oluşturulma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAppointments.map((app) => (
                    <TableRow key={app.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-medium">
                        {format(parseISO(app.date), 'd MMMM yyyy', { locale: tr })}
                        <div className="text-[10px] text-muted-foreground md:hidden">
                           {format(parseISO(app.date), 'EEEE', { locale: tr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-white">
                          {app.startTime} - {app.endTime}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {app.studentName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground text-xs">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {app.createdAt ? format(app.createdAt.toDate(), 'HH:mm - d MMM', { locale: tr }) : '...'}
                        </div>
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