'use client';

import { motion } from 'framer-motion';
import { FileText, Tag, Trash2, Clock } from 'lucide-react';
import { VoiceNote } from '@/types';

interface NotesListProps {
  notes: VoiceNote[];
  onSelectNote: (note: VoiceNote) => void;
  onDeleteNote: (id: string) => void;
}

export default function NotesList({ notes, onSelectNote, onDeleteNote }: NotesListProps) {
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
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {notes.map(note => (
          <motion.div
            key={note.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
            layout
            className="glass glass-hover p-5 rounded-xl cursor-pointer group relative"
            onClick={() => onSelectNote(note)}
          >
            {/* Delete Button */}
            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity btn btn-sm btn-circle btn-ghost text-error"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-100 mb-2 pr-8">{note.title}</h3>

            {/* Transcript Preview */}
            <p className="text-sm text-slate-400 line-clamp-3 mb-3">{note.transcript}</p>

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
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
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {new Date(note.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
