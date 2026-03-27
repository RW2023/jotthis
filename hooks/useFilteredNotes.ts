'use client';

import { useMemo } from 'react';
import { VoiceNote } from '@/types';

type ViewMode = 'active' | 'archived' | 'trash' | 'favorites';
type SortOrder = 'newest' | 'oldest';

export function useFilteredNotes(
  notes: VoiceNote[],
  searchQuery: string,
  viewMode: ViewMode,
  sortOrder: SortOrder,
) {
  return useMemo(() => {
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
  }, [notes, searchQuery, viewMode, sortOrder]);
}
