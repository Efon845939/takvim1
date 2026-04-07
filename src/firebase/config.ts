/**
 * Firebase configuration utility.
 * Uses environment variables with fallbacks for local development.
 * The '!' operator ensures TypeScript that these values will be provided.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDJVLhfyhqgJdh8pI1rJLchf_N2JR-OuYQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-5539002199-2f568.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5539002199-2f568",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-5539002199-2f568.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "483558643376",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:483558643376:web:aacf8ea2e0afd1b6a64d75"
};
