
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Home from '@/app/(app)/dashboard/page';
import { AuthProvider } from '@/components/AuthProvider';
import { NotesProvider } from '@/components/NotesProvider';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    status: 'idle',
    duration: 0,
    volume: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    error: null,
  }),
}));

// Mock Auth Context
const mockUser = { uid: 'test-user', email: 'test@example.com' };
const mockSignOut = vi.fn();

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: mockSignOut,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Notes Context
const mockNotes = [
  {
    id: 'note-1',
    title: 'Test Note',
    transcript: 'This is a test note.',
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    isArchived: false,
  }
];

vi.mock('@/components/NotesProvider', () => ({
  useNotes: vi.fn(() => ({
    notes: mockNotes,
    setNotes: vi.fn(),
    loading: false,
  })),
  NotesProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock heavy components to keep test lightweight
vi.mock('@/components/AudioWaveform', () => ({
  default: () => <div data-testid="audio-waveform" />
}));

describe('Dashboard Page', () => {
  it('renders the dashboard with header and recording button', async () => {
    render(<Home />);

    // Check for "JotThis" header
    expect((await screen.findAllByText('JotThis')).length).toBeGreaterThan(0);

    // Check for "Tap to record" text
    expect(screen.getByText(/Tap to record/i)).toBeDefined();

    // Check for Notes List (implied by "Test Note" presence)
    expect(screen.getByText('Test Note')).toBeDefined();
  });

  it('renders "No notes yet" when notes list is empty', async () => {
    // Override useNotes for this specific test
    const { useNotes } = await import('@/components/NotesProvider');
    vi.mocked(useNotes).mockReturnValue({
      notes: [],
      setNotes: vi.fn(),
      loading: false,
    } as any);

    render(<Home />);

    expect(screen.getByText(/Tap the microphone/i)).toBeDefined();
  });
});
