'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';

export default function FirebaseTestPage() {
  const [status, setStatus] = useState({
    auth: false,
    firestore: false,
    storage: false,
  });

  useEffect(() => {
    // Test Firebase connections
    try {
      setStatus({
        auth: !!auth,
        firestore: !!db,
        storage: !!storage,
      });
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Connection Test</h1>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Service Status</h2>
            
            <div className="space-y-3">
              <StatusItem 
                name="Authentication" 
                enabled={status.auth}
              />
              <StatusItem 
                name="Firestore Database" 
                enabled={status.firestore}
              />
              <StatusItem 
                name="Storage" 
                enabled={status.storage}
              />
            </div>

            <div className="divider"></div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>If all services show ✓ Initialized, Firebase is connected! If services are not enabled in Firebase Console, you'll need to enable them first.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
      <span className="font-medium">{name}</span>
      <div className="flex items-center gap-2">
        {enabled ? (
          <>
            <span className="text-success text-sm">✓ Initialized</span>
            <div className="badge badge-success badge-sm"></div>
          </>
        ) : (
          <>
            <span className="text-error text-sm">✗ Not Connected</span>
            <div className="badge badge-error badge-sm"></div>
          </>
        )}
      </div>
    </div>
  );
}
