import { vi } from 'vitest';

// Firestore mocks
export const mockDocRef = { id: 'mock-doc-id' };
export const mockAddDoc = vi.fn().mockResolvedValue(mockDocRef);
export const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });
export const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
export const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);

const mockBatchInstance = {
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};
export const mockWriteBatch = vi.fn().mockReturnValue(mockBatchInstance);
export const mockBatch = mockBatchInstance;

export const mockTimestampNow = vi.fn().mockReturnValue({
  toDate: () => new Date('2025-01-01T00:00:00Z'),
});
export const mockTimestampFromDate = vi.fn((d: Date) => ({
  toDate: () => d,
}));

export const mockCollection = vi.fn().mockReturnValue('mock-collection-ref');
export const mockDoc = vi.fn().mockReturnValue('mock-doc-ref');
export const mockQuery = vi.fn().mockReturnValue('mock-query');
export const mockOrderBy = vi.fn();

// Storage mocks
export const mockRef = vi.fn().mockReturnValue('mock-storage-ref');
export const mockUploadBytes = vi.fn().mockResolvedValue({});
export const mockGetDownloadURL = vi.fn().mockResolvedValue('https://storage.example.com/audio.webm');
export const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
