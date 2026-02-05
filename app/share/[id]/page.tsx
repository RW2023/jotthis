import Link from 'next/link';
import Image from 'next/image';
import { Tag, Calendar, Sparkles } from 'lucide-react';

interface SharedNote {
  id: string;
  title: string;
  transcript: string;
  tags: string[];
  createdAt: string;
}

import { adminDb } from '@/lib/firebase-admin';

async function getSharedNote(id: string, token: string): Promise<SharedNote | null> {
  try {
    // Direct server-side DB query - no internal API fetch needed!
    const notesRef = adminDb.collectionGroup('transcriptions');
    const snapshot = await notesRef
      .where('shareToken', '==', token)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs.find(d => d.id === id);
    if (!doc) return null;

    const data = doc.data();

    // Verify isShared
    if (!data.isShared) return null;

    return {
      id: doc.id,
      title: data.title,
      transcript: data.transcript,
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  } catch (e) {
    console.error("Database error in getSharedNote", e);
    return null;
  }
}

export default async function SharedNotePage({
  params,
  searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ token: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p>No access token provided.</p>
        </div>
      </div>
    );
  }

  // We need to fetch via absolute URL for server components
  // But wait, calling our own API route from server component adds latency and complexity with URLs.
  // Ideally we would use the controller logic directly, but we can't easily given the admin-helpers structure.
  // Let's stick to fetch for now.
  // Note: Localhost fetch might fail if NEXT_PUBLIC_APP_URL is not set.
  // I will assume localhost:3000 default.

  const note = await getSharedNote(id, token);

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
          <p>This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans">
      <div className="max-w-3xl mx-auto pt-10">
        {/* Header / Branding */}
        <div className="flex items-center gap-3 mb-10 opacity-70">
          <Image src="/icon-192.png" alt="JotThis Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
          <span className="text-xl font-bold tracking-tight">JotThis</span>
        </div>

        {/* Note Content */}
        <div className="glass p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-slate-900/50">
          <h1 className="text-4xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              {new Date(note.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {note.tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-cyan-950/30 text-cyan-400 border border-cyan-900/50 text-sm flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <div className="flex items-center gap-2 text-slate-200 font-medium mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Transcript
            </div>
            <p className="text-lg leading-relaxed text-slate-300 whitespace-pre-wrap">
              {note.transcript}
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-slate-500 text-sm">
          Shared via <Link href="/" className="text-cyan-400 hover:underline">JotThis</Link>
        </div>
      </div>
    </div>
  );
}
