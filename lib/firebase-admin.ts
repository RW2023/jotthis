import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (e) {
  console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
}

if (!getApps().length && serviceAccount) {
  try {
    initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e) {
      console.error('[AdminInit] Failed to initialize with cert:', e);
  }
} else if (!getApps().length) {
    // Fallback if no service account key is present (will likely fail for admin tasks but prevents build errors)
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Admin features will not work.");
    try {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-bucket',
        });
    } catch (e) {
        console.error("Failed to initialize firebase-admin even without cert", e);
    }
}

export const adminDb = getFirestore();
export const adminStorage = getStorage();
export const adminAuth = getAuth();
