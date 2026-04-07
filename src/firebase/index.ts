
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * Initializes Firebase services safely for both client and server (Prerendering).
 * Ensures only one instance exists.
 */
export function initializeFirebase() {
  let app: FirebaseApp;

  if (!getApps().length) {
    // Robust check for Vercel build time where env might be partially available
    if (!firebaseConfig.apiKey) {
      console.warn("Firebase API Key is missing. Check your environment variables.");
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app)
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
