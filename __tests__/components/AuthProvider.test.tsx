import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';

const {
  mockOnAuthStateChanged,
  mockSignInWithPopup,
  mockSignInWithEmailAndPassword,
  mockCreateUserWithEmailAndPassword,
  mockFirebaseSignOut,
  mockGetRedirectResult,
  MockGoogleAuthProviderClass,
  mockToastError,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockSignInWithEmailAndPassword: vi.fn(),
  mockCreateUserWithEmailAndPassword: vi.fn(),
  mockFirebaseSignOut: vi.fn(),
  mockGetRedirectResult: vi.fn().mockResolvedValue(null),
  MockGoogleAuthProviderClass: class {
    setCustomParameters = vi.fn();
  },
  mockToastError: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  GoogleAuthProvider: MockGoogleAuthProviderClass,
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  app: {},
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: mockToastError },
}));

import { AuthProvider, useAuth } from '@/components/AuthProvider';

describe('AuthProvider', () => {
  let authCallback: ((user: unknown) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
      ok: true,
    }));

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
      authCallback = callback;
      return vi.fn(); // unsubscribe
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('useAuth hook', () => {
    it('should throw when used outside AuthProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });

    it('should start with loading true and user null', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('should set user and loading=false when auth state changes', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockUser = {
        uid: 'user1',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('fake-token')
      };

      await act(async () => {
        authCallback?.(mockUser);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set user to null when signed out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authCallback?.(null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('signInWithGoogle', () => {
    it('should call signInWithPopup with a GoogleAuthProvider', async () => {
      mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: 'google-user' } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignInWithPopup).toHaveBeenCalledOnce();
    });
  });

  describe('signInWithEmail', () => {
    it('should call signInWithEmailAndPassword', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'email-user' } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'password123');
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });
  });

  describe('signUpWithEmail', () => {
    it('should call createUserWithEmailAndPassword', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'new-user' } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUpWithEmail('new@example.com', 'newpass123');
      });

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'newpass123'
      );
    });
  });

  describe('signOut', () => {
    it('should call firebaseSignOut', async () => {
      mockFirebaseSignOut.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockFirebaseSignOut).toHaveBeenCalledOnce();
    });
  });

  describe('redirect handling', () => {
    it('should call getRedirectResult on mount', () => {
      render(<AuthProvider><div>child</div></AuthProvider>);
      expect(mockGetRedirectResult).toHaveBeenCalledOnce();
    });

    it('should show error toast when redirect fails', async () => {
      mockGetRedirectResult.mockRejectedValueOnce(new Error('Redirect failed'));

      render(<AuthProvider><div>child</div></AuthProvider>);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Authentication failed. Please try again.');
      });
    });
  });
});
