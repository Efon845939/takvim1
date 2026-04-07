'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Shield, Hash } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) return <div className="p-8 text-center bg-[#202124] text-white h-screen">Yükleniyor...</div>;

  return (
    <main className="min-h-screen bg-[#202124] text-white">
      <div className="max-w-2xl mx-auto p-4 md:py-12 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="hover:bg-slate-800 text-white">
            <Link href="/"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">Profil Bilgileri</h1>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center gap-4 border-b border-slate-800">
            <Avatar className="h-16 w-16 border-2 border-blue-500 shadow-lg">
              <AvatarImage src={user?.photoURL || ''} />
              <AvatarFallback className="text-xl bg-blue-600 text-white">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user?.displayName || 'Kullanıcı'}</CardTitle>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-0.5">Hesap Durumu</p>
                <p className="text-sm font-medium">Aktif Kullanıcı</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-0.5">E-posta</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Hash className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-0.5">Kullanıcı ID</p>
                <p className="text-xs font-mono text-slate-400">{user?.uid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
