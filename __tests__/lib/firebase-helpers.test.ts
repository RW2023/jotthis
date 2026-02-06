import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockAddDoc,
  mockGetDocs,
  mockUpdateDoc,
  mockDeleteDoc,
  mockWriteBatch,
  mockBatch,
  mockUploadBytes,
  mockGetDownloadURL,
  mockDeleteObject,
  mockTimestampNow,
  mockTimestampFromDate,
  mockCollection,
  mockDoc,
  mockQuery,
  mockOrderBy,
  mockRef,
} from '../__mocks__/firebase';

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  addDoc: mockAddDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  orderBy: mockOrderBy,
  Timestamp: {
    now: mockTimestampNow,
    fromDate: mockTimestampFromDate,
  },
  writeBatch: mockWriteBatch,
}));

vi.mock('firebase/storage', () => ({
  ref: mockRef,
  uploadBytes: mockUploadBytes,
  getDownloadURL: mockGetDownloadURL,
  deleteObject: mockDeleteObject,
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
  auth: {},
  app: {},
}));

import {
  saveVoiceNote,
  loadUserNotes,
  toggleFavoriteVoiceNote,
  updateVoiceNote,
  bulkUpdateVoiceNotes,
  permanentlyDeleteVoiceNote,
  softDeleteVoiceNote,
  restoreVoiceNote,
  archiveVoiceNote,
  uploadAudio,
  deleteAudio,
  updateNoteInsights,
  updateNoteShareToken,
  toggleLockVoiceNote,
  toggleTriageStatus,
} from '@/lib/firebase-helpers';

describe('firebase-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveVoiceNote', () => {
    it('should call addDoc with the correct data and return doc ID', async () => {
      const note = {
        userId: 'user1',
        title: 'Test Note',
        transcript: 'Hello world',
        tags: ['test'],
      };

      const result = await saveVoiceNote('user1', note as any);

      expect(mockAddDoc).toHaveBeenCalledOnce();
      const callArgs = mockAddDoc.mock.calls[0][1];
      expect(callArgs.title).toBe('Test Note');
      expect(callArgs.transcript).toBe('Hello world');
      expect(callArgs.tags).toEqual(['test']);
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.updatedAt).toBeDefined();
      expect(result).toBe('mock-doc-id');
    });
  });

  describe('loadUserNotes', () => {
    it('should return mapped voice notes with defaults', async () => {
      const mockDate = new Date('2025-01-15T10:00:00Z');
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'note1',
            data: () => ({
              userId: 'user1',
              title: 'My Note',
              transcript: 'Some text',
              createdAt: { toDate: () => mockDate },
              updatedAt: { toDate: () => mockDate },
            }),
          },
        ],
      });

      const notes = await loadUserNotes('user1');

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('note1');
      expect(notes[0].title).toBe('My Note');
      expect(notes[0].tags).toEqual([]);
      expect(notes[0].smartCategory).toBe('Uncategorized');
      expect(notes[0].isFavorite).toBe(false);
      expect(notes[0].isArchived).toBe(false);
      expect(notes[0].isDeleted).toBe(false);
      expect(notes[0].isLocked).toBe(false);
      expect(notes[0].createdAt).toEqual(mockDate);
    });

    it('should return empty array when no notes exist', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const notes = await loadUserNotes('user1');
      expect(notes).toEqual([]);
    });

    it('should handle missing timestamps with default Date', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'note1',
            data: () => ({
              userId: 'user1',
              title: 'No timestamps',
              transcript: 'text',
            }),
          },
        ],
      });

      const notes = await loadUserNotes('user1');
      expect(notes[0].createdAt).toBeInstanceOf(Date);
      expect(notes[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve triage data when present', async () => {
      const triage = { priority: 'high', actionType: 'task', status: 'pending' };
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'note1',
            data: () => ({
              userId: 'user1',
              title: 'Triaged',
              transcript: 'text',
              triage,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });

      const notes = await loadUserNotes('user1');
      expect(notes[0].triage).toEqual(triage);
    });
  });

  describe('toggleFavoriteVoiceNote', () => {
    it('should update isFavorite to true', async () => {
      await toggleFavoriteVoiceNote('user1', 'note1', true);

      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isFavorite).toBe(true);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should update isFavorite to false', async () => {
      await toggleFavoriteVoiceNote('user1', 'note1', false);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isFavorite).toBe(false);
    });
  });

  describe('updateVoiceNote', () => {
    it('should filter out undefined values', async () => {
      await updateVoiceNote('user1', 'note1', {
        title: 'Updated',
        transcript: undefined,
      } as any);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.title).toBe('Updated');
      expect(callArgs).not.toHaveProperty('transcript');
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should always include updatedAt', async () => {
      await updateVoiceNote('user1', 'note1', { title: 'New' });

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.updatedAt).toBeDefined();
    });
  });

  describe('bulkUpdateVoiceNotes', () => {
    it('should batch update multiple notes', async () => {
      await bulkUpdateVoiceNotes('user1', ['note1', 'note2'], { isArchived: true });

      expect(mockWriteBatch).toHaveBeenCalledOnce();
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledOnce();
    });

    it('should convert Date deletedAt to Firestore Timestamp', async () => {
      const date = new Date('2025-06-01');
      await bulkUpdateVoiceNotes('user1', ['note1'], { deletedAt: date } as any);

      expect(mockTimestampFromDate).toHaveBeenCalledWith(date);
    });
  });

  describe('permanentlyDeleteVoiceNote', () => {
    it('should delete the firestore document', async () => {
      await permanentlyDeleteVoiceNote('user1', 'note1');
      expect(mockDeleteDoc).toHaveBeenCalledOnce();
    });

    it('should delete audio when audioUrl is provided', async () => {
      await permanentlyDeleteVoiceNote('user1', 'note1', 'https://storage.example.com/audio.webm');
      expect(mockDeleteObject).toHaveBeenCalled();
    });

    it('should not throw when audio deletion fails', async () => {
      mockDeleteObject.mockRejectedValueOnce(new Error('Storage error'));
      await expect(
        permanentlyDeleteVoiceNote('user1', 'note1', 'https://storage.example.com/audio.webm')
      ).resolves.not.toThrow();
    });

    it('should skip audio deletion when no audioUrl', async () => {
      await permanentlyDeleteVoiceNote('user1', 'note1');
      expect(mockDeleteObject).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteVoiceNote', () => {
    it('should set isDeleted true and isArchived false', async () => {
      await softDeleteVoiceNote('user1', 'note1');

      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isDeleted).toBe(true);
      expect(callArgs.isArchived).toBe(false);
      expect(callArgs.deletedAt).toBeDefined();
      expect(callArgs.updatedAt).toBeDefined();
    });
  });

  describe('restoreVoiceNote', () => {
    it('should set isDeleted false, isArchived false, deletedAt null', async () => {
      await restoreVoiceNote('user1', 'note1');

      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isDeleted).toBe(false);
      expect(callArgs.isArchived).toBe(false);
      expect(callArgs.deletedAt).toBeNull();
      expect(callArgs.updatedAt).toBeDefined();
    });
  });

  describe('archiveVoiceNote', () => {
    it('should archive a note', async () => {
      await archiveVoiceNote('user1', 'note1', true);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isArchived).toBe(true);
      expect(callArgs.isDeleted).toBe(false);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should unarchive a note', async () => {
      await archiveVoiceNote('user1', 'note1', false);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isArchived).toBe(false);
      expect(callArgs.isDeleted).toBe(false);
    });
  });

  describe('uploadAudio', () => {
    it('should upload blob and return download URL', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const url = await uploadAudio('user1', blob);

      expect(mockUploadBytes).toHaveBeenCalledOnce();
      expect(mockGetDownloadURL).toHaveBeenCalledOnce();
      expect(url).toBe('https://storage.example.com/audio.webm');
    });
  });

  describe('deleteAudio', () => {
    it('should extract path from Firebase Storage URL', async () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fuser1%2Faudio%2F123.webm?alt=media';
      await deleteAudio('user1', url);
      expect(mockDeleteObject).toHaveBeenCalledOnce();
    });

    it('should handle simple path fallback', async () => {
      await deleteAudio('user1', '123.webm');
      expect(mockDeleteObject).toHaveBeenCalledOnce();
    });
  });

  describe('updateNoteInsights', () => {
    it('should update actionItems insights', async () => {
      const insights = ['item1', 'item2'];
      await updateNoteInsights('user1', 'note1', 'actionItems', insights);

      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs['insights.actionItems']).toEqual(insights);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should update contentIdeas insights', async () => {
      const insights = ['idea1'];
      await updateNoteInsights('user1', 'note1', 'contentIdeas', insights);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs['insights.contentIdeas']).toEqual(insights);
    });

    it('should update research insights', async () => {
      const insights = ['topic1', 'topic2', 'topic3'];
      await updateNoteInsights('user1', 'note1', 'research', insights);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs['insights.research']).toEqual(insights);
    });
  });

  describe('updateNoteShareToken', () => {
    it('should set share token and isShared', async () => {
      await updateNoteShareToken('user1', 'note1', 'abc123', true);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.shareToken).toBe('abc123');
      expect(callArgs.isShared).toBe(true);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should handle null token for un-sharing', async () => {
      await updateNoteShareToken('user1', 'note1', null, false);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.shareToken).toBeNull();
      expect(callArgs.isShared).toBe(false);
    });
  });

  describe('toggleLockVoiceNote', () => {
    it('should lock a note', async () => {
      await toggleLockVoiceNote('user1', 'note1', true);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isLocked).toBe(true);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should unlock a note', async () => {
      await toggleLockVoiceNote('user1', 'note1', false);

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs.isLocked).toBe(false);
    });
  });

  describe('toggleTriageStatus', () => {
    it('should update triage status to done', async () => {
      await toggleTriageStatus('user1', 'note1', 'done');

      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs['triage.status']).toBe('done');
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
    });

    it('should update triage status to pending', async () => {
      await toggleTriageStatus('user1', 'note1', 'pending');

      const callArgs = mockUpdateDoc.mock.calls[0][1];
      expect(callArgs['triage.status']).toBe('pending');
    });

    it('should return true on success', async () => {
      const result = await toggleTriageStatus('user1', 'note1', 'done');
      expect(result).toBe(true);
    });

    it('should rethrow errors', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Firestore error'));
      await expect(toggleTriageStatus('user1', 'note1', 'done')).rejects.toThrow('Firestore error');
    });
  });
});
