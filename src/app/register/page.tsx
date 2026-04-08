
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { CalendarCheck2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // RBAC: Grant teacher role for specific authorized emails
      const authorizedTeachers = [
        "proturkgamerefe@gmail.com",
        "sintiya.ugur@bahcesehir.k12.tr"
      ];
      const role = authorizedTeachers.includes(email.toLowerCase()) ? 'teacher' : 'student';

      // Initialize user document
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: name,
        role: role,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        region: 'TR',
        workingHours: [
          { dayOfWeek: 1, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          { dayOfWeek: 2, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          { dayOfWeek: 3, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          { dayOfWeek: 4, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          { dayOfWeek: 5, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          { dayOfWeek: 6, enabled: false, slots: [] },
          { dayOfWeek: 0, enabled: false, slots: [] },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: 'Başarılı', 
        description: `Hoş geldiniz, ${role === 'teacher' ? 'Hocam' : name}!` 
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.message || 'Kayıt olunamadı. Lütfen tekrar deneyin.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <CalendarCheck2 className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Kayıt Ol</CardTitle>
          <CardDescription>Akıllı takviminizi yönetmeye hemen başlayın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Ahmet Yılmaz" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="ornek@mail.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Giriş Yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
