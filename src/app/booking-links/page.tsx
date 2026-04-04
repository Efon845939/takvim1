
'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, Plus, Copy, Trash2, ExternalLink, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function BookingLinksPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    duration: '30',
    mode: 'manual',
    timeFrame: 'thisWeek'
  });

  const linksQuery = React.useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'bookingLinks'));
  }, [db, user]);

  const { data: linksData, isLoading } = useCollection(linksQuery as any);

  const handleCreate = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'bookingLinks'), {
        ...form,
        userId: user.uid,
        durationMinutes: parseInt(form.duration),
        active: true,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      toast({ title: 'Başarılı', description: 'Randevu linki oluşturuldu.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bookingLinks', id));
      toast({ title: 'Silindi', description: 'Randevu linki kaldırıldı.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Silme işlemi başarısız.' });
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/book/${user?.uid}/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Kopyalandı', description: 'Link panoya kopyalandı.' });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Randevu Linklerim</h1>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Link Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Randevu Linki</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Link Başlığı</Label>
                  <Input 
                    id="title" 
                    placeholder="Örn: 30 Dakikalık Ön Görüşme" 
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Süre (Dakika)</Label>
                  <Select value={form.duration} onValueChange={(v) => setForm({...form, duration: v})}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Dakika</SelectItem>
                      <SelectItem value="30">30 Dakika</SelectItem>
                      <SelectItem value="45">45 Dakika</SelectItem>
                      <SelectItem value="60">60 Dakika</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mode">Randevu Modu</Label>
                  <Select value={form.mode} onValueChange={(v) => setForm({...form, mode: v})}>
                    <SelectTrigger id="mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Seçimli (Kullanıcı seçer)</SelectItem>
                      <SelectItem value="autoSoonest">En Yakın Zamana Otomatik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                <Button onClick={handleCreate}>Oluştur</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Yükleniyor...</div>
        ) : linksData?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz bir randevu linki oluşturmadınız.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {linksData?.map((link) => (
              <Card key={link.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{link.title}</CardTitle>
                  <CardDescription>{link.durationMinutes} Dakika • {link.mode === 'manual' ? 'Seçimli' : 'Otomatik'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-muted/50 p-4 rounded-lg flex justify-center mb-4">
                    <QRCodeSVG 
                      value={`${window.location.origin}/book/${user?.uid}/${link.id}`} 
                      size={120}
                      level="L"
                    />
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(link.id)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Kopyala
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/book/${user?.uid}/${link.id}`} target="_blank">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Görüntüle
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" className="col-span-2 mt-2" onClick={() => handleDelete(link.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sil
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
