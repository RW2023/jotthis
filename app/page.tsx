'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Clock, Loader2, LogOut } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAuth } from '@/components/AuthProvider';
import { VoiceNote } from '@/types';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import AuthModal from '@/components/AuthModal';
import { loadUserNotes, saveVoiceNote, deleteVoiceNote, uploadAudio, updateNoteInsights } from '@/lib/firebase-helpers';

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { status, duration, startRecording, stopRecording, error } = useVoiceRecorder();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);


  // Load notes when user signs in
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    const loadNotes = async () => {
      setNotesLoading(true);
      try {
        const userNotes = await loadUserNotes(user.uid);
        setNotes(userNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setNotesLoading(false);
      }
    };

    loadNotes();
  }, [user]);

  // Show auth modal when user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, user]);

  const handleRecord = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (status === 'recording') {
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        try {
          // First, upload audio to Firebase Storage (client-side with auth context)
          const audioUrl = await uploadAudio(user.uid, audioBlob);

          // Then send to transcription API
          const formData = new FormData();
          formData.append('audio', audioBlob);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
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
    } else {
      await startRecording();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      await deleteVoiceNote(user.uid, noteId, note.audioUrl);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 pt-8 pb-6 max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            JotThis
          </h1>
        </div>
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
                  <motion.div
                    animate={
                      status === 'recording'
                        ? {
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5],
                        }
                        : {}
                    }
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 rounded-full bg-red-500 blur-xl"
                  />
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
        </motion.div>

        {/* Notes List or Detail View */}
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <NoteDetail
              key="detail"
              note={selectedNote}
              onBack={() => setSelectedNote(null)}
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
            <NotesList
              key="list"
              notes={notes}
              onSelectNote={setSelectedNote}
                onDeleteNote={handleDeleteNote}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}
