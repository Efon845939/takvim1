
"use client"

import React from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) return <div className="p-8 text-center">Yükleniyor...</div>;

  return (
    <main className="max-w-2xl mx-auto p-4 md:py-12 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Profil Bilgileri</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.photoURL || ''} />
            <AvatarFallback className="text-xl bg-primary text-white">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user?.displayName || 'Kullanıcı'}</CardTitle>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Hesap Durumu</p>
              <p className="text-sm font-medium">Aktif Kullanıcı</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">E-posta</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
