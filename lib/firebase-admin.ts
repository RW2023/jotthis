import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : null;

if (!getApps().length && serviceAccount) {
  try {
    initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (e) {
      console.error('[AdminInit] Failed to initialize with cert:', e);
  }
} else if (!getApps().length) {
    // Fallback if no service account key is present (will likely fail for admin tasks but prevents build errors)
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Admin features will not work.");
    try {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    } catch (e) {
        console.error("Failed to initialize firebase-admin even without cert", e);
    }
}

export const adminDb = getFirestore();
