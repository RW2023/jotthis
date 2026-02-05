'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, LogOut, Settings, Clock, Tag } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAuth } from '@/components/AuthProvider';
import { VoiceNote } from '@/types';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import AuthModal from '@/components/AuthModal';
import SettingsModal from '@/components/SettingsModal';
import AudioWaveform from '@/components/AudioWaveform';
import SearchInput from '@/components/SearchInput';
import { loadUserNotes, saveVoiceNote, softDeleteVoiceNote, permanentlyDeleteVoiceNote, restoreVoiceNote, archiveVoiceNote, uploadAudio, updateNoteInsights } from '@/lib/firebase-helpers';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const { status, duration, volume, startRecording, stopRecording, error } = useVoiceRecorder();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'trash'>('active');
  const [hasAutoShownAuthModal, setHasAutoShownAuthModal] = useState(() => {
    // Check sessionStorage to persist across redirects
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hasAutoShownAuthModal') === 'true';
    }
    return false;
  });


  // Load notes when user signs in
  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false); // Set loading to false even if no user
      return;
    }

    // Clear the auto-shown flag when user signs in so modal shows on next sign-out
    sessionStorage.removeItem('hasAutoShownAuthModal');
    setHasAutoShownAuthModal(false);

    const loadNotes = async () => {
      setLoading(true);
      try {
        const userNotes = await loadUserNotes(user.uid);
        setNotes(userNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [user]);

  // Auto-show auth modal when user is not logged in (only once on initial load)
  useEffect(() => {
    if (!authLoading && !user && !hasAutoShownAuthModal) {
      setShowAuthModal(true);
      setHasAutoShownAuthModal(true);
      sessionStorage.setItem('hasAutoShownAuthModal', 'true');
    }
  }, [authLoading, user, hasAutoShownAuthModal]);

  const handleRecord = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (status === 'idle') {
      const apiKey = localStorage.getItem('openai_api_key');
      // Admin Access Key check would happen on server, but for UX we check if *some* key exists 
      // or if they are just trying to record (which might not strictly need key until transcription)
      // Actually transcription happens immediately after stop, so we should warn.
      if (!apiKey) {
        toast('Please add your OpenAI API Key in Settings to transcribe audio.', {
          icon: '🔑',
          style: {
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
          },
        });
        // We allow recording but warn they might fail transcription if they don't add it by stop time
      }
      await startRecording();
    } else { // status === 'recording'
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        try {
          // First, upload audio to Firebase Storage (client-side with auth context)
          const audioUrl = await uploadAudio(user.uid, audioBlob);

          // Then send to transcription API
          const formData = new FormData();
          formData.append('audio', audioBlob);

          // Get custom API key from localStorage if available
          const apiKey = localStorage.getItem('openai_api_key');
          const headers: Record<string, string> = {};
          if (apiKey) {
            headers['x-openai-key'] = apiKey;
          }

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers,
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            // Save to Firestore with the audio URL
            const noteId = await saveVoiceNote(user.uid, {
              userId: user.uid,
              title: data.title,
              transcript: data.transcript,
              tags: data.tags,
              audioUrl, // Use the client-side uploaded URL
            });

            const newNote: VoiceNote = {
              id: noteId,
              userId: user.uid,
              title: data.title,
              transcript: data.transcript,
              tags: data.tags,
              audioUrl,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            setNotes(prev => [newNote, ...prev]);
            setSelectedNote(newNote);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  const handleSoftDelete = async (noteId: string) => {
    if (!user) return;
    try {
      await softDeleteVoiceNote(user.uid, noteId);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isDeleted: true, deletedAt: new Date() } : n));
      if (selectedNote?.id === noteId) setSelectedNote(null);
      toast.success('Note moved to trash');
    } catch (error) {
      console.error('Error moving note to trash:', error);
      toast.error('Failed to move note to trash');
    }
  };

  const handlePermanentDelete = async (noteId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to permanently delete this note? This cannot be undone.')) return;

    const note = notes.find(n => n.id === noteId);
    try {
      await permanentlyDeleteVoiceNote(user.uid, noteId, note?.audioUrl);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) setSelectedNote(null);
      toast.success('Note permanently deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleRestore = async (noteId: string) => {
    if (!user) return;
    try {
      await restoreVoiceNote(user.uid, noteId);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isDeleted: false, isArchived: false, deletedAt: undefined } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isDeleted: false, isArchived: false } : null);
      toast.success('Note restored');
    } catch (error) {
      console.error('Error restoring note:', error);
      toast.error('Failed to restore note');
    }
  };

  const handleArchive = async (noteId: string, isArchived: boolean) => {
    if (!user) return;
    try {
      await archiveVoiceNote(user.uid, noteId, isArchived);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isArchived } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isArchived } : null);
      toast.success(isArchived ? 'Note archived' : 'Note unarchived');
    } catch (error) {
      console.error('Error updating archive status:', error);
      toast.error('Failed to update archive status');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
      <Toaster position="top-center" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 pt-8 pb-6 max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20">
            <Image
              src="/icon-512.png"
              alt="JotThis Logo"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            JotThis
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn btn-ghost btn-circle btn-sm"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </button>

          <Link
            href="/tags"
            className="btn btn-ghost btn-circle btn-sm"
            title="Tags"
          >
            <Tag className="w-5 h-5 text-slate-400" />
          </Link>



          {user && (
            <button
              onClick={() => signOut()}
              className="btn btn-ghost btn-sm gap-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </motion.div>

      <div className="container mx-auto px-4 pb-8">
        {/* Recording Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 mb-8"
        >
          {/* Record Button */}
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: status === 'recording' ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRecord}
              disabled={isProcessing}
              className={`btn btn-lg btn-circle glass glass-hover w-28 h-28 relative group ${status === 'recording' ? 'btn-error' : 'btn-primary'
                }`}
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              ) : (
                <>
                    {status === 'recording' && (
                      <div className="absolute inset-0 flex items-center justify-center p-2 z-0">
                        <AudioWaveform volume={volume} />
                      </div>
                    )}
                  <Mic
                    className={`w-10 h-10 relative z-10 ${status === 'recording' ? 'text-red-400' : 'text-cyan-400'
                      }`}
                  />
                </>
              )}
            </motion.button>

            <AnimatePresence>
              {status === 'recording' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-400"
                >
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-lg">{formatDuration(duration)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm text-slate-400">
              {status === 'recording' ? 'Tap to stop recording' : 'Tap to record'}
            </p>

            {error && (
              <div className="alert alert-error max-w-md">
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* View Toggles */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setViewMode('active')}
              className={`btn btn-sm ${viewMode === 'active' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`btn btn-sm ${viewMode === 'archived' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
            >
              Archive
            </button>
            <button
              onClick={() => setViewMode('trash')}
              className={`btn btn-sm ${viewMode === 'trash' ? 'btn-error' : 'btn-ghost text-slate-400'}`}
            >
              Trash
            </button>
          </div>
        </motion.div>

        {/* Notes List or Detail View */}
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <NoteDetail
              key="detail"
              note={selectedNote}
              onBack={() => setSelectedNote(null)}
              onDelete={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
              onArchive={(id, val) => handleArchive(id, val)}
              onRestore={handleRestore}
              isTrash={viewMode === 'trash'}
              onUpdate={async updatedNote => {
                // Update local state
                setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
                setSelectedNote(updatedNote);

                // Persist insights to Firestore if they changed
                if (user && updatedNote.insights) {
                  try {
                    // Check each insight type and persist to Firestore
                    if (updatedNote.insights.actionItems && updatedNote.insights.actionItems.length > 0) {
                      await updateNoteInsights(user.uid, updatedNote.id, 'actionItems', updatedNote.insights.actionItems);
                    }
                    if (updatedNote.insights.contentIdeas && updatedNote.insights.contentIdeas.length > 0) {
                      await updateNoteInsights(user.uid, updatedNote.id, 'contentIdeas', updatedNote.insights.contentIdeas);
                    }
                    if (updatedNote.insights.researchPointers && updatedNote.insights.researchPointers.length > 0) {
                      await updateNoteInsights(user.uid, updatedNote.id, 'research', updatedNote.insights.researchPointers);
                    }
                  } catch (error) {
                    console.error('Failed to save insights to Firestore:', error);
                  }
                }
              }}
            />
          ) : (
              <div className="space-y-6">
                {/* Sticky Search Header */}
                {notes.length > 0 && (
                  <div className="sticky top-4 z-20 mx-auto max-w-md">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl -m-4 rounded-b-2xl z-[-1] mask-gradient" />
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      className="shadow-lg"
                    />
                  </div>
                )}

                <NotesList
                  key="list"
                  notes={notes.filter(note => {
                    // Filter by view mode
                    if (viewMode === 'trash') {
                      if (!note.isDeleted) return false;
                    } else if (viewMode === 'archived') {
                      if (note.isDeleted || !note.isArchived) return false;
                    } else {
                      // Active
                      if (note.isDeleted || note.isArchived) return false;
                    }

                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      note.title?.toLowerCase().includes(q) ||
                      note.transcript?.toLowerCase().includes(q) ||
                      note.tags?.some(tag => tag.toLowerCase().includes(q))
                    );
                  })}
                  onSelectNote={setSelectedNote}
                  onDeleteNote={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
                  onArchiveNote={(id, val) => handleArchive(id, val)}
                  onRestoreNote={handleRestore}
                  viewMode={viewMode}
            />
              </div>
          )}
        </AnimatePresence>
      </div>

      {/* Auth Modal */}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </main>
  );
}
