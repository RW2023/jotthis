'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Tag, Trash2, Clock, Archive, ArchiveRestore, RefreshCcw, Heart, CheckSquare, Square, Lock, Unlock, AlertCircle, ShoppingCart, Calendar, Lightbulb } from 'lucide-react';
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
  isFocusMode?: boolean;
  triageFilter?: { type: 'priority' | 'action', value: string } | null;
  onToggleTriageStatus?: (id: string, status: 'pending' | 'done') => void;
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
  selectedNoteIds,
  isFocusMode,
  triageFilter,
  onToggleTriageStatus,
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
          {notes
            .filter(note => {
              if (!triageFilter) return true;
              if (triageFilter.type === 'priority') return note.triage?.priority === triageFilter.value;
              if (triageFilter.type === 'action') return note.triage?.actionType === triageFilter.value;
              return true;
            })
            .map(note => {
            const isSelected = selectedNoteIds?.has(note.id);

              const isPriorityCritical = note.triage?.priority === 'critical';


            return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              layout
                className={`glass p-5 rounded-xl cursor-pointer group relative transition-all duration-200 
                   ${isSelectionMode && isSelected ? 'ring-2 ring-cyan-400 bg-slate-800/80' : 'glass-hover'}
                   ${isFocusMode && note.smartCategory === 'Work' ? 'border-l-4 border-l-emerald-400 bg-emerald-500/5' : ''}
                   ${isFocusMode && note.smartCategory === 'Personal' ? 'border-l-4 border-l-blue-400 bg-blue-500/5' : ''}
                   ${isFocusMode && note.smartCategory === 'Family' ? 'border-l-4 border-l-amber-400 bg-amber-500/5' : ''}
                   ${isFocusMode && note.smartCategory === 'Hobby' ? 'border-l-4 border-l-rose-400 bg-rose-500/5' : ''}
                   ${isFocusMode && (!note.smartCategory || note.smartCategory === 'Uncategorized') ? 'opacity-60 grayscale border-l-4 border-l-slate-700' : ''}
                   ${isPriorityCritical ? 'ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}
                   `}
              onClick={() => onSelectNote(note)}
            >

                {/* Triage Badges */}
                <div className="absolute top-3 right-12 flex gap-2">
                  {/* Priority Badge */}
                  {note.triage?.priority === 'critical' && note.triage?.status !== 'done' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTriageStatus?.(note.id, 'done'); }}
                      className="flex items-center gap-1 text-[10px] uppercase font-bold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/20 hover:bg-rose-900/50 transition-colors group/badge"
                      title="Mark as Done"
                    >
                      <AlertCircle className="w-3 h-3 group-hover/badge:hidden" />
                      <CheckSquare className="w-3 h-3 hidden group-hover/badge:block" />
                      Do Now
                    </button>
                  )}
                  {note.triage?.priority === 'high' && note.triage?.status !== 'done' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTriageStatus?.(note.id, 'done'); }}
                      className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/20 hover:bg-amber-900/50 transition-colors group/badge"
                      title="Mark as Done"
                    >
                      <AlertCircle className="w-3 h-3 group-hover/badge:hidden" />
                      <CheckSquare className="w-3 h-3 hidden group-hover/badge:block" />
                      Schedule
                    </button>
                  )}

                  {/* Action Icon */}
                  {note.triage?.actionType === 'purchase' && (
                    <span title="To Buy">
                      <ShoppingCart className="w-4 h-4 text-purple-400" />
                    </span>
                  )}
                  {note.triage?.actionType === 'calendar' && (
                    <span title="Event">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </span>
                  )}
                  {note.triage?.actionType === 'task' && (
                    <span title="Task">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    </span>
                  )}
                  {note.triage?.actionType === 'idea' && (
                    <span title="Idea">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                    </span>
                  )}
                </div>

                {/* Category Badge (Focus Mode Only) - Moved down slightly if Triage is active */}
                {isFocusMode && note.smartCategory && note.smartCategory !== 'Uncategorized' && (
                  <div className={`absolute top-[-10px] left-4 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider shadow-sm border
                  ${note.smartCategory === 'Work' ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/30' : ''}
                  ${note.smartCategory === 'Personal' ? 'bg-blue-900/90 text-blue-200 border-blue-500/30' : ''}
                  ${note.smartCategory === 'Family' ? 'bg-amber-900/90 text-amber-200 border-amber-500/30' : ''}
                  ${note.smartCategory === 'Hobby' ? 'bg-rose-900/90 text-rose-200 border-rose-500/30' : ''}
                `}>
                    {note.smartCategory}
                  </div>
                )}


                 {/* Selection Checkbox */}
                 {isSelectionMode && (
                   <div className="absolute top-3 left-3 z-10 text-cyan-400">
                     {isSelected ? <CheckSquare className="w-5 h-5 fill-cyan-400/20" /> : <Square className="w-5 h-5 text-slate-500" />}
                   </div>
                 )}

                {/* Actions - Adjusted position */}
                <div className={`absolute bottom-3 right-3 flex gap-1 transition-opacity ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>

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

                  {/* Redundant Archive Button Removed (it was duplicated in original file) */}

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

                {/* Title - Add spacing for badges */}
                <h3 className={`text-lg font-semibold text-slate-100 mb-2 pr-24 ${isSelectionMode ? 'pl-8' : ''}`}>{note.title}</h3>

              {/* Transcript Preview */}
                 <p className={`text-sm text-slate-400 line-clamp-3 mb-3 ${isSelectionMode ? 'pl-8' : ''}`}>{note.transcript}</p>

                {/* Tags and Metadata */}
                <div className={`flex flex-wrap items-center gap-3 mb-3 ${isSelectionMode ? 'pl-8' : ''}`}>
                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
