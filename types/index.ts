export type NoteCategory = 'Work' | 'Personal' | 'Family' | 'Hobby' | 'Uncategorized';

export interface VoiceNote {
  id: string;
  userId: string;
  title: string;
  transcript: string;
  originalTranscript?: string;
  smartCategory?: NoteCategory;
  tags: string[];
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  insights?: {
    actionItems?: string[];
    contentIdeas?: string[];
    researchPointers?: string[];
  };
  shareToken?: string;
  isShared?: boolean;
  isFavorite?: boolean; // Default false
  isLocked?: boolean;   // Default false (Prevent deletion)
  isArchived?: boolean; // Default false
  isDeleted?: boolean;  // Default false ("Soft Delete")
  deletedAt?: Date;     // Timestamp for soft deletion
}

export interface Tag {
  id: string;
  name: string;
  count: number;
  color?: string;
}
