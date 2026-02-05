export interface VoiceNote {
  id: string;
  userId: string;
  title: string;
  transcript: string;
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
}

export interface Tag {
  id: string;
  name: string;
  count: number;
  color?: string;
}
