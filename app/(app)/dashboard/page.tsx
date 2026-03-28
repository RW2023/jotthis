'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Settings, Clock, Tag, Heart, Square, Trash2, Archive, X, ArrowDownUp } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useNotes } from '@/components/NotesProvider';
import { useNoteActions } from '@/hooks/useNoteActions';
import { useRecording } from '@/hooks/useRecording';
import { useFilteredNotes } from '@/hooks/useFilteredNotes';
import { VoiceNote } from '@/types';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import AuthModal from '@/components/AuthModal';
import SettingsModal from '@/components/SettingsModal';
import { TriageCenter } from '@/components/TriageCenter';
import AudioWaveform from '@/components/AudioWaveform';
import SearchInput from '@/components/SearchInput';
import NavigationSidebar from '@/components/NavigationSidebar';
import VisceralRecorder from '@/components/VisceralRecorder';

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
  const { notes, setNotes, loading } = useNotes();

  // UI State
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'trash' | 'favorites'>('active');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [triageFilter, setTriageFilter] = useState<{ type: 'priority' | 'action', value: string } | null>(null);

  // Admin detection: stored key matches ADMIN_ACCESS_KEY on the server
  // We check by calling a lightweight endpoint rather than hardcoding the key
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': storedKey },
        body: JSON.stringify({ destination: 'ping' }),
      }).then(res => {
        // 400 = admin but bad destination (expected), 403 = not admin
        setIsAdmin(res.status !== 403);
      }).catch(() => setIsAdmin(false));
    }
  }, []);

  // Custom Hooks
  const {
    status, duration, volume, error, analyserNode, isProcessing, liveTranscript, handleRecord,
  } = useRecording({
    user,
    setNotes,
    setSelectedNote,
    onRequireAuth: () => setShowAuthModal(true),
  });

  const {
    handleSoftDelete, handlePermanentDelete, handleRestore, handleArchive,
    handleToggleFavorite, handleToggleLock, handleToggleTriageStatus, handleUpdateNote, handleBulkAction,
  } = useNoteActions({ user, notes, setNotes, selectedNote, setSelectedNote });

  const filteredNotes = useFilteredNotes(notes, searchQuery, viewMode, sortOrder);

  // Deep linking
  useEffect(() => {
    const noteId = searchParams.get('noteId');
    if (noteId && notes.length > 0) {
      const note = notes.find(n => n.id === noteId);
      if (note) setSelectedNote(note);
    }
  }, [searchParams, notes]);

  // Clear selection on view change
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  }, [viewMode]);

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNoteIds.size === filteredNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const clearSelection = () => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        onToggleSelectionMode={() => { setIsSelectionMode(prev => !prev); setSelectedNoteIds(new Set()); }}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showSettings={() => setShowSettingsModal(true)}
        user={user}
        signOut={signOut}
        className="hidden lg:flex w-[260px] flex-shrink-0 z-20"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Mobile Header */}
        {!selectedNote && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-between px-4 pt-8 pb-6 flex-none"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20">
                <Image src="/icon-512.png" alt="JotThis Logo" fill className="object-cover" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                JotThis
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettingsModal(true)} className="btn btn-ghost btn-circle btn-sm" title="Settings">
                <Settings className="w-5 h-5 text-slate-400" />
              </button>
              <Link href="/tags" className="btn btn-ghost btn-circle btn-sm" title="Tags">
                <Tag className="w-5 h-5 text-slate-400" />
              </Link>
              {user && (
                <button onClick={() => signOut()} className="btn btn-ghost btn-circle btn-sm" title="Sign Out">
                  <Settings className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Content Columns */}
        <div className="flex-1 flex overflow-hidden">

          {/* List Column */}
          <div className={`flex flex-col relative transition-all duration-300 ${selectedNote ? 'hidden lg:flex' : 'flex w-full'} lg:w-[420px] lg:border-r lg:border-slate-800 bg-[#0f172a]`}>

            {/* Recording Section */}
            <div className="flex-none p-4 pb-2 z-10 bg-[#0f172a]">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    whileHover={{ scale: status === 'recording' ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRecord}
                    disabled={isProcessing}
                    aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
                    className={`btn btn-lg btn-circle glass glass-hover relative group ${status === 'recording' ? 'btn-error w-24 h-24' : 'btn-primary w-20 h-20'} shadow-xl shadow-cyan-500/10 border-slate-700/50`}
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
                        <Mic className={`w-8 h-8 relative z-10 ${status === 'recording' ? 'text-red-400' : 'text-cyan-400'}`} />
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
                    <div className="alert alert-error text-xs py-1 px-2"><span>{error}</span></div>
                  )}
                </div>

                {/* Mobile View Toggles */}
                <div className="lg:hidden flex flex-wrap items-center justify-center bg-slate-800/50 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`btn btn-xs rounded-lg px-2 border-0 ${isFocusMode ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'btn-ghost text-slate-400'}`}
                  >
                    Focus
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  {(['active', 'favorites'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`btn btn-xs rounded-lg px-3 border-0 ${viewMode === mode ? (mode === 'favorites' ? 'bg-amber-500 text-white' : 'btn-primary') : 'btn-ghost text-slate-400'}`}
                    >
                      {mode === 'active' ? 'Active' : 'Favs'}
                    </button>
                  ))}
                  <button
                    onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                    className="btn btn-xs btn-ghost text-slate-400 px-2"
                  >
                    <ArrowDownUp className={`w-3 h-3 ${sortOrder === 'oldest' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Search */}
            <div className="flex-none px-4 py-2 z-10 sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl">
              <SearchInput value={searchQuery} onChange={setSearchQuery} className="shadow-sm" />
            </div>

            {/* Triage Center */}
            {!isFocusMode && viewMode === 'active' && notes.length > 0 && (
              <div className="px-4 pb-2">
                <TriageCenter notes={filteredNotes} activeFilter={triageFilter} onFilterChange={setTriageFilter} />
              </div>
            )}

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-4 pb-24 lg:pb-4">
              {filteredNotes.length === 0 && notes.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500"><p>No notes found</p></div>
              ) : (
                <NotesList
                  notes={filteredNotes}
                  onSelectNote={(note) => isSelectionMode ? handleSelectNote(note.id) : setSelectedNote(note)}
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

            {/* Selection Mode FAB */}
            {notes.length > 0 && !isSelectionMode && (
              <div className="absolute bottom-6 right-6 lg:hidden">
                <button
                  onClick={() => { setIsSelectionMode(true); setSelectedNoteIds(new Set()); }}
                  className="btn btn-circle btn-ghost bg-slate-800/80 backdrop-blur border border-slate-700 shadow-lg text-slate-400"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Bulk Action Bar */}
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
                    <button onClick={handleSelectAll} className="btn btn-xs btn-ghost text-cyan-400 mr-2">All</button>
                    {viewMode !== 'trash' && (
                      <>
                        <button onClick={() => handleBulkAction('favorite', selectedNoteIds, clearSelection)} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-yellow-400">
                          <Heart className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBulkAction(viewMode === 'archived' ? 'unarchive' : 'archive', selectedNoteIds, clearSelection)} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-cyan-400">
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleBulkAction(viewMode === 'trash' ? 'delete' : 'trash', selectedNoteIds, clearSelection)} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="divider divider-horizontal mx-0" />
                    <button onClick={clearSelection} className="btn btn-circle btn-sm btn-ghost text-slate-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detail Column */}
          <div className={`flex-col flex-1 bg-slate-900/50 relative transition-all duration-300 ${selectedNote ? 'flex fixed inset-0 z-50 lg:static lg:z-0 lg:bg-[#0f172a]/50' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
            {selectedNote ? (
              <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0f172a] lg:bg-transparent p-4 lg:p-8">
                <NoteDetail
                  note={selectedNote}
                  onBack={() => setSelectedNote(null)}
                  onDelete={viewMode === 'trash' ? handlePermanentDelete : handleSoftDelete}
                  onArchive={(id, val) => handleArchive(id, val)}
                  onRestore={handleRestore}
                  onFavorite={(id, val) => handleToggleFavorite(id, val)}
                  onLock={(id, val) => handleToggleLock(id, val)}
                  isTrash={viewMode === 'trash'}
                  isAdmin={isAdmin}
                  onUpdate={handleUpdateNote}
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

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      {/* Visceral Recorder Overlay with Live Transcript */}
      <AnimatePresence>
        {status === 'recording' && (
          <VisceralRecorder
            analyserNode={analyserNode}
            duration={duration}
            onStop={handleRecord}
            liveTranscript={liveTranscript}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
