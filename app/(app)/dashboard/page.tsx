'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, LogOut, Settings, Clock, Tag, Heart, Square, Trash2, Archive, X, Lock, Unlock, ArrowDownUp } from 'lucide-react';
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
import NavigationSidebar from '@/components/NavigationSidebar';
import VisceralRecorder from '@/components/VisceralRecorder';
import {
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
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const { status, duration, volume, startRecording, stopRecording, error, analyserNode } = useVoiceRecorder();
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
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isFavorite } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isFavorite } : null);

    try {
      await toggleFavoriteVoiceNote(user.uid, noteId, isFavorite);
    } catch (error) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isFavorite: !isFavorite } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isFavorite: !isFavorite } : null);
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const handleToggleLock = async (noteId: string, isLocked: boolean) => {
    if (!user) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isLocked } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isLocked } : null);

    try {
      await toggleLockVoiceNote(user.uid, noteId, isLocked);
      toast.success(isLocked ? 'Note locked' : 'Note unlocked');
    } catch (error) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isLocked: !isLocked } : n));
      if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, isLocked: !isLocked } : null);
      console.error('Error toggling lock:', error);
      toast.error('Failed to update lock status');
    }
  };

  const handleToggleTriageStatus = async (noteId: string, status: 'pending' | 'done') => {
    if (!user) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, triage: { ...n.triage!, status } } : n));
    if (selectedNote?.id === noteId && selectedNote.triage) setSelectedNote({ ...selectedNote, triage: { ...selectedNote.triage, status } });

    try {
      await toggleTriageStatus(user.uid, noteId, status);
      toast.success(status === 'done' ? 'Marked as Done' : 'Marked as Pending');
    } catch (error) {
      console.error('Error updating triage status:', error);
      toast.error('Failed to update status');
      const originalStatus = status === 'done' ? 'pending' : 'done';
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, triage: { ...n.triage!, status: originalStatus } } : n));
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedNoteIds(new Set());
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
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const handleBulkAction = async (action: 'archive' | 'unarchive' | 'trash' | 'restore' | 'delete' | 'favorite' | 'unfavorite' | 'lock' | 'unlock') => {
    if (!user) return;
    let ids = Array.from(selectedNoteIds);
    if (ids.length === 0) return;

    if (['trash', 'delete', 'archive'].includes(action)) {
      const lockedIds = new Set(notes.filter(n => ids.includes(n.id) && n.isLocked).map(n => n.id));
      if (lockedIds.size > 0) {
        toast('Skipping locked notes', { icon: '🔒', style: { borderRadius: '10px', background: '#334155', color: '#fff' } });
        ids = ids.filter(id => !lockedIds.has(id));
      }
    }

    if (ids.length === 0) return;

    if (action === 'delete' && !confirm(`Permanently delete ${ids.length} notes? This cannot be undone.`)) return;

    const originalNotes = [...notes];
    let updates: Partial<VoiceNote> = {};

    if (action === 'archive') updates = { isArchived: true };
    if (action === 'unarchive') updates = { isArchived: false };
    if (action === 'trash') updates = { isDeleted: true, deletedAt: new Date() };
    if (action === 'restore') updates = { isDeleted: false, isArchived: false, deletedAt: undefined };
    if (action === 'favorite') updates = { isFavorite: true };
    if (action === 'unfavorite') updates = { isFavorite: false };
    if (action === 'lock') updates = { isLocked: true };
    if (action === 'unlock') updates = { isLocked: false };

    const idsToUpdate = new Set(ids);
    if (action === 'delete') {
      setNotes(prev => prev.filter(n => !idsToUpdate.has(n.id)));
    } else {
      setNotes(prev => prev.map(n => idsToUpdate.has(n.id) ? { ...n, ...updates } : n));
    }

    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());

    try {
      if (action === 'delete') {
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
      setNotes(originalNotes);
      toast.error('Failed to update notes');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilteredNotes = () => {
    return notes.filter(note => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (
          note.title?.toLowerCase().includes(q) ||
          note.transcript?.toLowerCase().includes(q) ||
          note.tags?.some(tag => tag.toLowerCase().includes(q)) ||
          note.smartCategory?.toLowerCase().includes(q) ||
          note.triage?.priority?.toLowerCase().includes(q) ||
          note.triage?.actionType?.toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      if (viewMode === 'trash') return note.isDeleted;
      if (viewMode === 'favorites') return !note.isDeleted && note.isFavorite;
      if (viewMode === 'archived') return !note.isDeleted && note.isArchived;

      return !note.isDeleted && !note.isArchived;
    }).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const filteredNotes = getFilteredNotes();

  return (
    <main className="h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden flex">
      <Toaster position="top-center" />

      {/* Desktop Sidebar */}
      <NavigationSidebar
        viewMode={viewMode}
        setViewMode={setViewMode}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showSettings={() => setShowSettingsModal(true)}
        user={user}
        signOut={signOut}
        className="hidden lg:flex w-[260px] flex-shrink-0 z-20"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Mobile Header (Logo + Actions) - Hidden on LG */}
        {!selectedNote && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-between px-4 pt-8 pb-6 flex-none"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20">
                <Image
                  src="/icon-512.png"
                  alt="JotThis Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
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
                  className="btn btn-ghost btn-circle btn-sm"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Content Columns */}
        <div className="flex-1 flex overflow-hidden">

          {/* List Column (Middle Pane) */}
          <div className={`
              flex flex-col relative transition-all duration-300
              ${selectedNote ? 'hidden lg:flex' : 'flex w-full'}
              lg:w-[420px] lg:border-r lg:border-slate-800 bg-[#0f172a]
           `}>

            {/* Recording Section & Mobile Toggles */}
            <div className="flex-none p-4 pb-2 z-10 bg-[#0f172a]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                {/* Record Button */}
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    whileHover={{ scale: status === 'recording' ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRecord}
                    disabled={isProcessing}
                    aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
                    className={`btn btn-lg btn-circle glass glass-hover relative group 
                      ${status === 'recording' ? 'btn-error w-24 h-24' : 'btn-primary w-20 h-20'}
                      shadow-xl shadow-cyan-500/10 border-slate-700/50
                    `}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    ) : (
                      <>
                        {status === 'recording' && (
                          <div className="absolute inset-0 flex items-center justify-center p-2 z-0">
                            <AudioWaveform volume={volume} />
                          </div>
                        )}
                        <Mic
                          className={`w-8 h-8 relative z-10 ${status === 'recording' ? 'text-red-400' : 'text-cyan-400'}`}
                        />
                      </>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {status === 'recording' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-2 text-red-400"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono text-base font-medium">{formatDuration(duration)}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <div className="alert alert-error text-xs py-1 px-2">
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                {/* Mobile View Toggles (Hidden on LG) */}
                <div className="lg:hidden flex flex-wrap items-center justify-center bg-slate-800/50 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`btn btn-xs rounded-lg px-2 border-0 ${isFocusMode ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'btn-ghost text-slate-400'}`}
                  >
                    Focus
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button
                    onClick={() => setViewMode('active')}
                    className={`btn btn-xs rounded-lg px-3 border-0 ${viewMode === 'active' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setViewMode('favorites')}
                    className={`btn btn-xs rounded-lg px-3 border-0 ${viewMode === 'favorites' ? 'bg-amber-500 text-white' : 'btn-ghost text-slate-400'}`}
                  >
                    Favs
                  </button>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                    className="btn btn-xs btn-ghost text-slate-400 px-2"
                  >
                    <ArrowDownUp className={`w-3 h-3 ${sortOrder === 'oldest' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Search Input */}
            <div className="flex-none px-4 py-2 z-10 sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                className="shadow-sm"
              />
            </div>

            {/* Triage Center */}
            {!isFocusMode && viewMode === 'active' && notes.length > 0 && (
              <div className="px-4 pb-2">
                <TriageCenter
                  notes={filteredNotes}
                  activeFilter={triageFilter}
                  onFilterChange={setTriageFilter}
                />
              </div>
            )}

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-4 pb-24 lg:pb-4">
              {filteredNotes.length === 0 && notes.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <p>No notes found</p>
                </div>
              ) : (
                  <NotesList
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
              )}
            </div>

            {/* Selection Mode FAB (Mobile/Desktop consistent) */}
            {notes.length > 0 && !isSelectionMode && (
              <div className="absolute bottom-6 right-6 lg:hidden">
                <button
                  onClick={handleToggleSelectionMode}
                  className="btn btn-circle btn-ghost bg-slate-800/80 backdrop-blur border border-slate-700 shadow-lg text-slate-400"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Bulk Action Bar (Floating) */}
            <AnimatePresence>
              {isSelectionMode && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-6 left-0 right-0 z-50 flex justify-center px-4"
                >
                  <div className="bg-slate-800/95 backdrop-blur-md shadow-2xl border border-slate-700/50 rounded-2xl p-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 ml-2 mr-2">{selectedNoteIds.size} selected</span>
                    <button
                      onClick={() => handleSelectAll(filteredNotes)}
                      className="btn btn-xs btn-ghost text-cyan-400 mr-2"
                    >
                      All
                    </button>
                    {/* Simplified Bulk Actions for Space */}
                    {viewMode !== 'trash' && (
                      <>
                        <button onClick={() => handleBulkAction('favorite')} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-yellow-400">
                          <Heart className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBulkAction(viewMode === 'archived' ? 'unarchive' : 'archive')} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-cyan-400">
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleBulkAction(viewMode === 'trash' ? 'delete' : 'trash')} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="divider divider-horizontal mx-0"></div>
                    <button onClick={() => { setIsSelectionMode(false); setSelectedNoteIds(new Set()); }} className="btn btn-circle btn-sm btn-ghost text-slate-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detail Column (Right Pane) */}
          <div className={`
              flex-col flex-1 bg-slate-900/50 relative transition-all duration-300
              ${selectedNote ? 'flex fixed inset-0 z-50 lg:static lg:z-0 lg:bg-[#0f172a]/50' : 'hidden lg:flex lg:items-center lg:justify-center'}
           `}>
            {selectedNote ? (
              <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0f172a] lg:bg-transparent p-4 lg:p-8">
                {/* NoteDetail */}
                <NoteDetail
                  note={selectedNote}
                  onBack={() => setSelectedNote(null)}
                  onDelete={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
                  onArchive={(id, val) => handleArchive(id, val)}
                  onRestore={handleRestore}
                  onFavorite={(id, val) => handleToggleFavorite(id, val)}
                  onLock={(id, val) => handleToggleLock(id, val)}
                  isTrash={viewMode === 'trash'}
                  onUpdate={async updatedNote => {
                    setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
                    setSelectedNote(updatedNote);
                    if (user) {
                      try {
                        await updateVoiceNote(user.uid, updatedNote.id, {
                          title: updatedNote.title,
                          transcript: updatedNote.transcript,
                          smartCategory: updatedNote.smartCategory,
                          tags: updatedNote.tags,
                          isShared: updatedNote.isShared,
                          shareToken: updatedNote.shareToken,
                          triage: updatedNote.triage,
                        });
                        if (updatedNote.insights) {
                          if (updatedNote.insights.actionItems && updatedNote.insights.actionItems.length > 0) await updateNoteInsights(user.uid, updatedNote.id, 'actionItems', updatedNote.insights.actionItems);
                          if (updatedNote.insights.contentIdeas && updatedNote.insights.contentIdeas.length > 0) await updateNoteInsights(user.uid, updatedNote.id, 'contentIdeas', updatedNote.insights.contentIdeas);
                          if (updatedNote.insights.researchPointers && updatedNote.insights.researchPointers.length > 0) await updateNoteInsights(user.uid, updatedNote.id, 'research', updatedNote.insights.researchPointers);
                        }
                      } catch (error) {
                        console.error('Failed to save updates:', error);
                        toast.error('Failed to save changes');
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center select-none">
                <div className="w-20 h-20 bg-slate-800/50 rounded-3xl mb-6 flex items-center justify-center shadow-inner">
                  <div className="opacity-20 transform scale-150">
                    <Image src="/icon-512.png" width={64} height={64} alt="Logo" />
                  </div>
                </div>
                <p className="text-lg font-medium text-slate-400">Select a note to view details</p>
                <p className="text-sm text-slate-600 mt-2">Or start recording a new one</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <AnimatePresence>
        {status === 'recording' && (
          <VisceralRecorder
            analyserNode={analyserNode}
            duration={duration}
            onStop={handleRecord}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
