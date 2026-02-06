'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { VoiceNote, NoteCategory } from '@/types';
import {
  loadUserNotes,
  saveVoiceNote,
  softDeleteVoiceNote,
  permanentlyDeleteVoiceNote,
  restoreVoiceNote,
  archiveVoiceNote,
  updateNoteInsights,
  toggleFavoriteVoiceNote,
  updateVoiceNote,
  toggleLockVoiceNote,
  bulkUpdateVoiceNotes,
  toggleTriageStatus,
  uploadAudio
} from '@/lib/firebase-helpers';
import { toast } from 'react-hot-toast';

interface NotesContextType {
  notes: VoiceNote[];
  loading: boolean;
  setNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  refreshNotes: () => Promise<void>;
  // CRUD Actions
  addNote: (note: VoiceNote) => void;
  updateLocalNote: (note: VoiceNote) => void;
  // We can expose the helper functions wrapped if needed, or just access raw helpers + local refresh
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotes = async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userNotes = await loadUserNotes(user.uid);
      setNotes(userNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotes();
  }, [user]);

  const addNote = (note: VoiceNote) => {
    setNotes(prev => [note, ...prev]);
  };

  const updateLocalNote = (updatedNote: VoiceNote) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  return (
    <NotesContext.Provider value={{ 
      notes, 
      loading, 
      setNotes, 
      refreshNotes,
      addNote,
      updateLocalNote
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
