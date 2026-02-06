'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, LogOut, Settings, Clock, Tag, Heart, CheckSquare, Square, Trash2, Archive, X, Lock, Unlock, ArrowDownUp } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAuth } from '@/components/AuthProvider';
import { useNotes } from '@/components/NotesProvider';
import { VoiceNote, NoteCategory } from '@/types';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import AuthModal from '@/components/AuthModal';
import SettingsModal from '@/components/SettingsModal';
import { TriageCenter } from '@/components/TriageCenter';
import AudioWaveform from '@/components/AudioWaveform';
import SearchInput from '@/components/SearchInput';
import {
  // loadUserNotes, // Removed as it's handled in context
  saveVoiceNote,
  softDeleteVoiceNote,
  permanentlyDeleteVoiceNote,
  restoreVoiceNote,
  archiveVoiceNote,
  uploadAudio,
  updateNoteInsights,
  toggleFavoriteVoiceNote,
  updateVoiceNote,
  toggleLockVoiceNote,
  bulkUpdateVoiceNotes,
  toggleTriageStatus
} from '@/lib/firebase-helpers';

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
  const { notes, setNotes, loading } = useNotes();
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'trash' | 'favorites'>('active');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [hasAutoShownAuthModal, setHasAutoShownAuthModal] = useState(false);

  // Multiselect State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [triageFilter, setTriageFilter] = useState<{ type: 'priority' | 'action', value: string } | null>(null);


  // Notes are loaded via NotesProvider
  useEffect(() => {
    if (user) {
      setHasAutoShownAuthModal(false);
    }
  }, [user]);

  // Handle Deep Linking / Command Palette Navigation
  useEffect(() => {
    const noteId = searchParams.get('noteId');
    if (noteId && notes.length > 0) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setSelectedNote(note);
      }
    }
  }, [searchParams, notes]);


  // Clear selection when changing view modes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  }, [viewMode]);

  const handleRecord = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (status === 'idle') {
      const apiKey = localStorage.getItem('openai_api_key');
      // Admin Access Key check would happen on server
      if (!apiKey) {
        toast('Please add your OpenAI API Key in Settings to transcribe audio.', {
          icon: '🔑',
          style: {
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
          },
        });
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
              originalTranscript: data.originalTranscript,
              smartCategory: (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase() : 'Uncategorized') as NoteCategory,
              triage: data.triage,
              tags: data.tags,
              audioUrl, // Use the client-side uploaded URL
            });

            const newNote: VoiceNote = {
              id: noteId,
              userId: user.uid,
              title: data.title,
              transcript: data.transcript,
              originalTranscript: data.originalTranscript,
              smartCategory: (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase() : 'Uncategorized') as NoteCategory,
              triage: {
                ...data.triage,
                priority: data.triage?.priority?.toLowerCase() || 'medium',
                actionType: data.triage?.actionType?.toLowerCase() || 'reference',
              },
              tags: data.tags,
              audioUrl,
              createdAt: new Date(),
              updatedAt: new Date(),
              isFavorite: false,
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
    const note = notes.find(n => n.id === noteId);
    if (note?.isLocked) {
      toast.error('Cannot delete a locked note');
      return;
    }
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
    const note = notes.find(n => n.id === noteId);
    if (note?.isLocked) {
      toast.error('Cannot delete a locked note');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this note? This cannot be undone.')) return;

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
    const note = notes.find(n => n.id === noteId);
    if (note?.isLocked) {
      toast.error('Cannot archive a locked note');
      return;
    }
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

  const handleToggleFavorite = async (noteId: string, isFavorite: boolean) => {
    if (!user) return;
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isFavorite } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isFavorite } : null);

    try {
      await toggleFavoriteVoiceNote(user.uid, noteId, isFavorite);
    } catch (error) {
      // Revert on error
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isFavorite: !isFavorite } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isFavorite: !isFavorite } : null);
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const handleToggleLock = async (noteId: string, isLocked: boolean) => {
    if (!user) return;
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isLocked } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isLocked } : null);

    try {
      await toggleLockVoiceNote(user.uid, noteId, isLocked);
      toast.success(isLocked ? 'Note locked' : 'Note unlocked');
    } catch (error) {
      // Revert
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isLocked: !isLocked } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isLocked: !isLocked } : null);
      console.error('Error toggling lock:', error);
      toast.error('Failed to update lock status');
    }
  };

  const handleToggleTriageStatus = async (noteId: string, status: 'pending' | 'done') => {
    if (!user) return;
    // Optimistic Update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, triage: { ...n.triage!, status } } : n));
    if (selectedNote?.id === noteId && selectedNote.triage) setSelectedNote({ ...selectedNote, triage: { ...selectedNote.triage, status } });

    try {
      await toggleTriageStatus(user.uid, noteId, status);
      toast.success(status === 'done' ? 'Marked as Done' : 'Marked as Pending');
    } catch (error) {
      console.error('Error updating triage status:', error);
      toast.error('Failed to update status');
      // Revert
      const originalStatus = status === 'done' ? 'pending' : 'done';
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, triage: { ...n.triage!, status: originalStatus } } : n));
    }
  };

  // Multiselect Handlers
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedNoteIds(new Set()); // Clear selection when toggling mode
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleSelectAll = (filteredNotes: VoiceNote[]) => {
    if (selectedNoteIds.size === filteredNotes.length) {
      // Deselect all
      setSelectedNoteIds(new Set());
    } else {
      // Select all visible
      setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const handleBulkAction = async (action: 'archive' | 'unarchive' | 'trash' | 'restore' | 'delete' | 'favorite' | 'unfavorite' | 'lock' | 'unlock') => {
    if (!user) return;
    let ids = Array.from(selectedNoteIds);
    if (ids.length === 0) return;

    // Filter out locked notes for destructive actions
    if (['trash', 'delete', 'archive'].includes(action)) {
      const lockedIds = new Set(notes.filter(n => ids.includes(n.id) && n.isLocked).map(n => n.id));
      if (lockedIds.size > 0) {
        toast('Skipping locked notes', { icon: '🔒', style: { borderRadius: '10px', background: '#334155', color: '#fff' } });
        ids = ids.filter(id => !lockedIds.has(id));
      }
    }

    if (ids.length === 0) return;

    if (action === 'delete' && !confirm(`Permanently delete ${ids.length} notes? This cannot be undone.`)) return;

    // Optimistic Updates
    const originalNotes = [...notes]; // For rollback

    let updates: Partial<VoiceNote> = {};

    if (action === 'archive') updates = { isArchived: true };
    if (action === 'unarchive') updates = { isArchived: false };
    if (action === 'trash') updates = { isDeleted: true, deletedAt: new Date() };
    if (action === 'restore') updates = { isDeleted: false, isArchived: false, deletedAt: undefined };
    if (action === 'favorite') updates = { isFavorite: true };
    if (action === 'unfavorite') updates = { isFavorite: false };
    if (action === 'lock') updates = { isLocked: true };
    if (action === 'unlock') updates = { isLocked: false };

    // Apply optimistic state
    const idsToUpdate = new Set(ids);
    if (action === 'delete') {
      setNotes(prev => prev.filter(n => !idsToUpdate.has(n.id)));
    } else {
      setNotes(prev => prev.map(n => idsToUpdate.has(n.id) ? { ...n, ...updates } : n));
    }

    // Exit selection mode
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());

    try {
      if (action === 'delete') {
        // We have to delete one by one unfortunately because of storage cleanup, 
        // but we can parallelize or create a bulk delete helper. 
        // For now, let's just loop locally. Ideally bulk helper for atomicity.
        // But we already have a loop in `bulkUpdateVoiceNotes`, implementing delete logic there or loop here.
        await Promise.all(ids.map(id => {
          const note = originalNotes.find(n => n.id === id);
          return permanentlyDeleteVoiceNote(user.uid, id, note?.audioUrl);
        }));
      } else {
        await bulkUpdateVoiceNotes(user.uid, ids, updates);
      }
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Bulk action failed:', error);
      setNotes(originalNotes); // Rolling back
      toast.error('Failed to update notes');
    }
  };


  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to filter notes for rendering (and for select all)
  const getFilteredNotes = () => {
    return notes.filter(note => {
      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (
          note.title?.toLowerCase().includes(q) ||
          note.transcript?.toLowerCase().includes(q) ||
          note.tags?.some(tag => tag.toLowerCase().includes(q))
        );
        if (!match) return false;
      }

      // View Mode Filter
      if (viewMode === 'trash') return note.isDeleted;
      if (viewMode === 'favorites') return !note.isDeleted && note.isFavorite; // Favorites implicitly active? Or can be archived? Assume favorites are usually active. Let's include active/archived favorites.
      if (viewMode === 'archived') return !note.isDeleted && note.isArchived;

      // Active
      return !note.isDeleted && !note.isArchived;
    }).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const filteredNotes = getFilteredNotes();

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

      <div className="container mx-auto px-4 pb-8 relative">
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

          {/* View Toggles & Tools */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {/* Toggles */}
            <div className="flex flex-wrap items-center justify-center bg-slate-800/50 p-1.5 rounded-xl gap-2 transition-all">
              {/* Focus Mode Toggle */}
              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`btn btn-sm rounded-lg px-2 border-0 transition-all ${isFocusMode
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                  : 'btn-ghost text-slate-400 hover:bg-white/5'
                  }`}
                title={isFocusMode ? "Disable Focus Mode" : "Enable Focus Mode"}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isFocusMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Focus</span>
                </div>
              </button>

              <div className="w-px h-6 bg-slate-700 mx-1" />

              <button
                onClick={() => setViewMode('active')}
                className={`btn btn-sm rounded-lg px-4 border-0 transition-all ${viewMode === 'active' ? 'btn-primary shadow-lg shadow-cyan-500/20 scale-105' : 'btn-ghost text-slate-400 hover:bg-white/5'}`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode('favorites')}
                className={`btn btn-sm rounded-lg px-4 border-0 transition-all ${viewMode === 'favorites' ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 scale-105' : 'btn-ghost text-slate-400 hover:bg-white/5'}`}
              >
                <Heart className={`w-4 h-4 mr-1 ${viewMode === 'favorites' ? 'fill-white' : ''}`} />
                Favs
              </button>

              <div className="w-px h-6 bg-slate-700 mx-1" />

              {/* Sort Toggle */}
              <button
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="btn btn-sm btn-ghost text-slate-400 hover:bg-white/5 px-2"
                title={`Sort: ${sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
              >
                <ArrowDownUp className={`w-4 h-4 transition-transform ${sortOrder === 'oldest' ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setViewMode('archived')}
                className={`btn btn-sm rounded-lg px-4 border-0 transition-all ${viewMode === 'archived' ? 'btn-secondary shadow-lg shadow-secondary/20 scale-105' : 'btn-ghost text-slate-400 hover:bg-white/5'}`}
              >
                Archive
              </button>
              <button
                onClick={() => setViewMode('trash')}
                className={`btn btn-sm rounded-lg px-4 border-0 transition-all ${viewMode === 'trash' ? 'btn-error shadow-lg shadow-error/20 scale-105' : 'btn-ghost text-slate-400 hover:bg-white/5'}`}
              >
                Trash
              </button>
            </div>

            {/* Select Toggle */}
            {notes.length > 0 && (
              <button
                onClick={handleToggleSelectionMode}
                className={`btn btn-sm gap-2 ${isSelectionMode ? 'btn-info' : 'btn-ghost text-slate-400'}`}
              >
                {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {isSelectionMode ? 'Cancel Select' : 'Select'}
              </button>
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
              onDelete={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
              onArchive={(id, val) => handleArchive(id, val)}
              onRestore={handleRestore}
              onFavorite={(id, val) => handleToggleFavorite(id, val)}
              onLock={(id, val) => handleToggleLock(id, val)}
              isTrash={viewMode === 'trash'}
              onUpdate={async updatedNote => {
                // Update local state
                setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
                setSelectedNote(updatedNote);

                if (user) {
                  try {
                    await updateVoiceNote(user.uid, updatedNote.id, {
                      smartCategory: updatedNote.smartCategory,
                      tags: updatedNote.tags,
                      isShared: updatedNote.isShared,
                      shareToken: updatedNote.shareToken,
                      triage: updatedNote.triage,
                    });

                    // Persist insights to Firestore if they changed
                    if (updatedNote.insights) {
                      if (updatedNote.insights.actionItems && updatedNote.insights.actionItems.length > 0) {
                        await updateNoteInsights(user.uid, updatedNote.id, 'actionItems', updatedNote.insights.actionItems);
                      }
                      if (updatedNote.insights.contentIdeas && updatedNote.insights.contentIdeas.length > 0) {
                        await updateNoteInsights(user.uid, updatedNote.id, 'contentIdeas', updatedNote.insights.contentIdeas);
                      }
                      if (updatedNote.insights.researchPointers && updatedNote.insights.researchPointers.length > 0) {
                        await updateNoteInsights(user.uid, updatedNote.id, 'research', updatedNote.insights.researchPointers);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to save updates to Firestore:', error);
                    toast.error('Failed to save changes');
                  }
                }
              }}
            />
          ) : (
              <div className="space-y-6 pb-24">
                {/* Selection Header (Visible in Selection Mode) */}
                {isSelectionMode && (
                  <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl backdrop-blur-sm border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium ml-2">{selectedNoteIds.size} Selected</span>
                    </div>
                    <button
                      onClick={() => handleSelectAll(filteredNotes)}
                      className="btn btn-sm btn-ghost text-cyan-400"
                    >
                      {selectedNoteIds.size === filteredNotes.length && filteredNotes.length > 0 ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                )}

                {/* Sticky Search Header */}
                {notes.length > 0 && !isSelectionMode && (
                  <div className="sticky top-4 z-20 mx-auto max-w-md">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl -m-4 rounded-b-2xl z-[-1] mask-gradient" />
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      className="shadow-lg"
                    />
                  </div>
                )}

                {/* Triage Center (Active View Only, Non-Focus Mode) */}
                {!isFocusMode && viewMode === 'active' && notes.length > 0 && (
                  <TriageCenter
                    notes={filteredNotes}
                    activeFilter={triageFilter}
                    onFilterChange={setTriageFilter}
                  />
                )}

                <NotesList
                  key="list"
                  notes={filteredNotes}
                  onSelectNote={(note) => {
                    if (isSelectionMode) {
                      handleSelectNote(note.id);
                    } else {
                      setSelectedNote(note);
                    }
                  }}
                  onDeleteNote={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
                  onArchiveNote={(id, val) => handleArchive(id, val)}
                  onRestoreNote={handleRestore}
                  onFavoriteNote={handleToggleFavorite}
                  onLockNote={handleToggleLock}
                  viewMode={viewMode as 'active' | 'archived' | 'trash'}
                  isSelectionMode={isSelectionMode}
                  selectedNoteIds={selectedNoteIds}
                  isFocusMode={isFocusMode}
                  triageFilter={triageFilter}
                  onToggleTriageStatus={handleToggleTriageStatus}
            />
              </div>
          )}
        </AnimatePresence>

        {/* Bulk Action Bar - Floating at bottom */}
        <AnimatePresence>
          {isSelectionMode && selectedNoteIds.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4"
            >
              <div className="bg-slate-800/90 backdrop-blur-md shadow-2xl border border-slate-700/50 rounded-2xl p-2 flex items-center gap-2">

                {/* Actions based on view mode */}

                {/* Favorite Action */}
                {viewMode !== 'trash' && (
                  <>
                    <button
                      onClick={() => handleBulkAction('favorite')}
                      className="btn btn-circle btn-ghost text-slate-400 hover:text-yellow-400 tooltip"
                      data-tip="Favorite"
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                    {/* Lock Action */}
                    <button
                      onClick={() => handleBulkAction('lock')}
                      className="btn btn-circle btn-ghost text-slate-400 hover:text-amber-500 tooltip"
                      data-tip="Lock"
                    >
                      <Lock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleBulkAction('unlock')}
                      className="btn btn-circle btn-ghost text-slate-400 hover:text-amber-500 tooltip"
                      data-tip="Unlock"
                    >
                      <Unlock className="w-5 h-5" />
                    </button>
                    <div className="divider divider-horizontal mx-0"></div>
                  </>
                )}

                {/* Archive Actions */}
                {viewMode === 'active' || viewMode === 'favorites' ? (
                  <button
                    onClick={() => handleBulkAction('archive')}
                    className="btn btn-circle btn-ghost text-slate-400 hover:text-cyan-400 tooltip"
                    data-tip="Archive"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                ) : viewMode === 'archived' ? (
                  <button
                    onClick={() => handleBulkAction('unarchive')}
                    className="btn btn-circle btn-ghost text-slate-400 hover:text-cyan-400 tooltip"
                    data-tip="Unarchive"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                ) : null}

                {/* Trash Actions */}
                {viewMode === 'trash' ? (
                  <>
                    <button
                      onClick={() => handleBulkAction('restore')}
                      className="btn btn-circle btn-ghost text-green-400 hover:bg-green-400/10 tooltip tooltip-info"
                      data-tip="Restore"
                    >
                      <Archive className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="divider divider-horizontal mx-0"></div>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="btn btn-circle btn-ghost text-red-500 hover:bg-red-500/10 tooltip tooltip-error"
                      data-tip="Delete Permanently"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleBulkAction('trash')}
                    className="btn btn-circle btn-ghost text-slate-400 hover:text-red-400 tooltip"
                    data-tip="Move to Trash"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <div className="divider divider-horizontal mx-0"></div>

                <button
                  onClick={() => {
                    setSelectedNoteIds(new Set());
                    setIsSelectionMode(false);
                  }}
                  className="btn btn-circle btn-ghost text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
