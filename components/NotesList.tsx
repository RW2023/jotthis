'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Tag, Trash2, Clock, Archive, ArchiveRestore, RefreshCcw, Heart, CheckSquare, Square, Lock, Unlock } from 'lucide-react';
import { VoiceNote } from '@/types';

interface NotesListProps {
  notes: VoiceNote[];
  onSelectNote: (note: VoiceNote) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string, isArchived: boolean) => void;
  onRestoreNote: (id: string) => void;
  onFavoriteNote: (id: string, isFavorite: boolean) => void;
  onLockNote: (id: string, isLocked: boolean) => void;
  viewMode: 'active' | 'archived' | 'trash';
  isSelectionMode?: boolean;
  selectedNoteIds?: Set<string>;
}

export default function NotesList({
  notes,
  onSelectNote,
  onDeleteNote,
  onArchiveNote,
  onRestoreNote,
  onFavoriteNote,
  onLockNote,
  viewMode,
  isSelectionMode,
  selectedNoteIds
}: NotesListProps) {
  if (notes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400 text-lg">No notes yet</p>
        <p className="text-slate-500 text-sm mt-2">Tap the microphone to create your first note</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-200 mb-4">Your Notes</h2>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        layout
      >
        <AnimatePresence mode="popLayout">
          {notes.map(note => {
            const isSelected = selectedNoteIds?.has(note.id);

            return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              layout
                 className={`glass p-5 rounded-xl cursor-pointer group relative transition-all duration-200 ${isSelectionMode && isSelected
                     ? 'ring-2 ring-cyan-400 bg-slate-800/80'
                     : 'glass-hover'
                   }`}
              onClick={() => onSelectNote(note)}
            >

                 {/* Selection Checkbox */}
                 {isSelectionMode && (
                   <div className="absolute top-3 left-3 z-10 text-cyan-400">
                     {isSelected ? <CheckSquare className="w-5 h-5 fill-cyan-400/20" /> : <Square className="w-5 h-5 text-slate-500" />}
                   </div>
                 )}

              {/* Actions */}
                 <div className={`absolute top-3 right-3 flex gap-1 transition-opacity ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>

                   {/* Favorite Button */}
                   {viewMode !== 'trash' && (
                     <button
                       onClick={e => {
                         e.stopPropagation();
                         onFavoriteNote(note.id, !note.isFavorite);
                       }}
                       className={`btn btn-sm btn-circle btn-ghost ${note.isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-yellow-400'}`}
                       title={note.isFavorite ? "Unfavorite" : "Favorite"}
                     >
                       <Heart className={`w-4 h-4 ${note.isFavorite ? 'fill-current' : ''}`} />
                     </button>
                   )}


                {/* Archive Button (not available in Trash) */}
                {viewMode !== 'trash' && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onArchiveNote(note.id, !note.isArchived);
                    }}
                    className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-cyan-400"
                    title={note.isArchived ? "Unarchive" : "Archive"}
                  >
                    {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                )}

                  {/* Lock Button */}
                  {viewMode !== 'trash' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onLockNote(note.id, !note.isLocked);
                      }}
                      className={`btn btn-sm btn-circle btn-ghost ${note.isLocked ? 'text-amber-500 hover:text-amber-400' : 'text-slate-400 hover:text-amber-500'}`}
                      title={note.isLocked ? "Unlock Note" : "Lock Note"}
                    >
                      {note.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Archive Button (not available in Trash) */}
                  {viewMode !== 'trash' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (note.isLocked) return;
                        onArchiveNote(note.id, !note.isArchived);
                      }}
                      disabled={note.isLocked}
                      className={`btn btn-sm btn-circle btn-ghost ${note.isLocked ? 'opacity-50 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-cyan-400'}`}
                      title={note.isLocked ? "Unlock to Archive" : (note.isArchived ? "Unarchive" : "Archive")}
                    >
                      {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  )}

                {/* Restore Button (only in Trash) */}
                {viewMode === 'trash' && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRestoreNote(note.id);
                    }}
                    className="btn btn-sm btn-circle btn-ghost text-green-400 hover:bg-green-400/10"
                    title="Restore"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className={`btn btn-sm btn-circle btn-ghost ${viewMode === 'trash' ? 'text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-400'}`}
                  title={viewMode === 'trash' ? "Delete Permanently" : "Move to Trash"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
                 <h3 className={`text-lg font-semibold text-slate-100 mb-2 pr-8 ${isSelectionMode ? 'pl-8' : ''}`}>{note.title}</h3>

              {/* Transcript Preview */}
                 <p className={`text-sm text-slate-400 line-clamp-3 mb-3 ${isSelectionMode ? 'pl-8' : ''}`}>{note.transcript}</p>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                   <div className={`flex flex-wrap gap-2 mb-3 ${isSelectionMode ? 'pl-8' : ''}`}>
                  {note.tags.map(tag => (
                    <span
                      key={tag}
                      className="badge badge-sm glass text-cyan-300 border-cyan-400/30"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
                 <div className={`flex items-center gap-1 text-xs text-slate-500 ${isSelectionMode ? 'pl-8' : ''}`}>
                <Clock className="w-3 h-3" />
                {new Date(note.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
