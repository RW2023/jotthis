'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Clock, Loader2 } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { VoiceNote } from '@/types';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';

export default function Home() {
  const { status, duration, startRecording, stopRecording, error } = useVoiceRecorder();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecord = async () => {
    if (status === 'recording') {
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        // Send to transcription API
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            const newNote: VoiceNote = {
              id: `note-${Date.now()}`,
              userId: 'demo-user',
              title: data.title,
              transcript: data.transcript,
              tags: data.tags,
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
        className="flex items-center justify-center gap-3 pt-8 pb-6"
      >
        <Sparkles className="w-8 h-8 text-cyan-400" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          JotThis
        </h1>
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
              onUpdate={updatedNote => {
                setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
                setSelectedNote(updatedNote);
              }}
            />
          ) : (
            <NotesList
              key="list"
              notes={notes}
              onSelectNote={setSelectedNote}
              onDeleteNote={id => setNotes(prev => prev.filter(n => n.id !== id))}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
