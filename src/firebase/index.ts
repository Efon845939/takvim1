
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// Vercel ve App Hosting uyumlu başlatma
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    
    // Eğer environment variable'lar varsa (Vercel) direkt onları kullan
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIza...") {
       firebaseApp = initializeApp(firebaseConfig);
    } else {
      try {
        // App Hosting ortamı için otomatik deneme
        firebaseApp = initializeApp();
      } catch (e) {
        // Fallback
        firebaseApp = initializeApp(firebaseConfig);
      }
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
