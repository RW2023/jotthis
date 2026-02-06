# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm start        # Start production server
```

No test framework is configured. There are no unit or integration tests.

## Environment Setup

Copy `.env.example` to `.env` and fill in Firebase + OpenAI credentials. See `.env.example` for required variables. Users can also provide their own OpenAI API key via the Settings modal (stored in localStorage, sent via `x-openai-key` header).

## Architecture

**Next.js 15 App Router** with TypeScript, Tailwind CSS, DaisyUI (custom `jotthis` theme), and Framer Motion.

### Data Flow

1. User records audio via browser MediaRecorder (`hooks/useVoiceRecorder.ts`)
2. Audio blob uploaded to **Firebase Storage** client-side (`lib/firebase-helpers.ts:uploadAudio`)
3. Blob sent to `POST /api/transcribe` → OpenAI Whisper transcription → GPT-4o-mini cleanup + metadata generation (title, tags, category, triage priority/action type)
4. Note saved to **Firestore** at `users/{userId}/transcriptions/{noteId}`
5. AI insights (action items, content ideas, research pointers) generated on-demand via `POST /api/analyze`

### Key Directories

- `app/` — Next.js App Router pages and API routes
- `app/api/transcribe/` — Whisper transcription + GPT metadata extraction
- `app/api/analyze/` — On-demand GPT insight generation (actionItems, contentIdeas, research)
- `app/api/speak/` — Text-to-speech endpoint
- `app/api/share/[id]/` — Shared note access via token
- `components/` — React components (all client-side `'use client'`)
- `lib/` — Firebase client SDK init (`firebase.ts`), Firebase Admin (`firebase-admin.ts`), Firestore/Storage CRUD helpers (`firebase-helpers.ts`)
- `hooks/` — `useVoiceRecorder` custom hook for audio recording
- `types/` — `VoiceNote` and `Tag` type definitions

### State Management

All state lives in `app/page.tsx` (`HomeContent` component) — no global state library. Notes are loaded from Firestore on auth, then managed locally with `useState`. Optimistic updates are used for toggle operations (favorite, lock, triage status) with rollback on error.

### Auth

`AuthProvider` context wraps the app (Google sign-in via popup, email/password). The `useAuth()` hook provides `user`, `loading`, `signInWithGoogle`, `signInWithEmail`, `signUpWithEmail`, `signOut`.

### Firestore Schema

Notes stored at `users/{userId}/transcriptions/{noteId}` with fields defined in `types/index.ts:VoiceNote`. Key flags: `isDeleted` (soft delete), `isArchived`, `isFavorite`, `isLocked` (prevents deletion). Locked notes are protected at both UI and Firestore security rule levels.

### OpenAI API Key Handling

API routes accept keys via `x-openai-key` header. If the header value matches `ADMIN_ACCESS_KEY` env var, the server's `OPENAI_API_KEY` is used instead. This enables a shared admin key for demo/production use.

### DaisyUI Theme

Custom `jotthis` theme defined in `tailwind.config.ts` — dark slate/cyan palette. The HTML element uses `data-theme="jotthis"`.

## Path Alias

`@/*` maps to project root (e.g., `@/components/AuthProvider`, `@/lib/firebase`).
