'use client';

import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { User } from 'firebase/auth';
import { VoiceNote } from '@/types';
import {
  softDeleteVoiceNote,
  permanentlyDeleteVoiceNote,
  restoreVoiceNote,
  archiveVoiceNote,
  toggleFavoriteVoiceNote,
  updateVoiceNote,
  updateNoteInsights,
  toggleLockVoiceNote,
  bulkUpdateVoiceNotes,
  toggleTriageStatus,
} from '@/lib/firebase-helpers';

interface UseNoteActionsProps {
  user: User | null;
  notes: VoiceNote[];
  setNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  selectedNote: VoiceNote | null;
  setSelectedNote: React.Dispatch<React.SetStateAction<VoiceNote | null>>;
}

export function useNoteActions({ user, notes, setNotes, selectedNote, setSelectedNote }: UseNoteActionsProps) {

  const handleSoftDelete = useCallback(async (noteId: string) => {
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
  }, [user, notes, selectedNote, setNotes, setSelectedNote]);

  const handlePermanentDelete = useCallback(async (noteId: string) => {
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
  }, [user, notes, selectedNote, setNotes, setSelectedNote]);

  const handleRestore = useCallback(async (noteId: string) => {
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
  }, [user, selectedNote, setNotes, setSelectedNote]);

  const handleArchive = useCallback(async (noteId: string, isArchived: boolean) => {
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
  }, [user, notes, selectedNote, setNotes, setSelectedNote]);

  const handleToggleFavorite = useCallback(async (noteId: string, isFavorite: boolean) => {
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
  }, [user, selectedNote, setNotes, setSelectedNote]);

  const handleToggleLock = useCallback(async (noteId: string, isLocked: boolean) => {
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
  }, [user, selectedNote, setNotes, setSelectedNote]);

  const handleToggleTriageStatus = useCallback(async (noteId: string, status: 'pending' | 'done') => {
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
  }, [user, selectedNote, setNotes, setSelectedNote]);

  const handleUpdateNote = useCallback(async (updatedNote: VoiceNote) => {
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
          if (updatedNote.insights.actionItems?.length) await updateNoteInsights(user.uid, updatedNote.id, 'actionItems', updatedNote.insights.actionItems);
          if (updatedNote.insights.contentIdeas?.length) await updateNoteInsights(user.uid, updatedNote.id, 'contentIdeas', updatedNote.insights.contentIdeas);
          if (updatedNote.insights.researchPointers?.length) await updateNoteInsights(user.uid, updatedNote.id, 'research', updatedNote.insights.researchPointers);
        }
      } catch (error) {
        console.error('Failed to save updates:', error);
        toast.error('Failed to save changes');
      }
    }
  }, [user, setNotes, setSelectedNote]);

  const handleBulkAction = useCallback(async (
    action: 'archive' | 'unarchive' | 'trash' | 'restore' | 'delete' | 'favorite' | 'unfavorite' | 'lock' | 'unlock',
    selectedIds: Set<string>,
    clearSelection: () => void,
  ) => {
    if (!user) return;
    let ids = Array.from(selectedIds);
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

    clearSelection();

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
  }, [user, notes, setNotes]);

  return {
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
    handleArchive,
    handleToggleFavorite,
    handleToggleLock,
    handleToggleTriageStatus,
    handleUpdateNote,
    handleBulkAction,
  };
}
