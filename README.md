# JotThis - AI Voice Notes

> Transform your voice notes into structured insights with AI-powered transcription and analysis.

## 🎯 Project Overview

**JotThis** is a voice-to-text application that records audio, transcribes it using OpenAI Whisper, and provides AI-powered insights using GPT-4. Built with Next.js 15, Firebase, and OpenAI APIs.

**Current Status:** 🟡 In Development
- ✅ UI & voice recording implemented
- ✅ Firebase infrastructure configured
- ⚠️ OpenAI integration pending (using mocks)
- ⚠️ Authentication not yet implemented

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Firebase account
- OpenAI API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` or `.env.local` with:

```bash
# Firebase (all prefixed with NEXT_PUBLIC_ for client-side access)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI (server-side only, NO NEXT_PUBLIC_ prefix)
OPENAI_API_KEY=sk-proj-...
```

See `.env.example` for reference.

### 3. Firebase Setup

#### Enable Services
1. **Firestore Database**
   - Go to Firebase Console → Firestore Database
   - Click "Create Database" → Production mode
   - Choose region (e.g., `us-central1`)

2. **Firebase Storage**
   - Go to Firebase Console → Storage
   - Click "Get Started" → Production mode
   - Use same region as Firestore

3. **Authentication** (Optional, for future use)
   - Go to Firebase Console → Authentication
   - Enable Email/Password and/or Anonymous auth

#### Deploy Security Rules
```bash
# Install Firebase CLI globally (if not done)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

**Security rules are already configured in:**
- `firestore.rules` - User data isolation
- `storage.rules` - Audio file access control

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Verify Firebase Connection
Visit [http://localhost:3000/firebase-test](http://localhost:3000/firebase-test) to check:
- ✅ Authentication initialized
- ✅ Firestore initialized  
- ✅ Storage initialized

All should show green checkmarks.

---

## 🏗️ Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + DaisyUI |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Auth** | Firebase Authentication |
| **Database** | Cloud Firestore |
| **Storage** | Firebase Storage |
| **AI Transcription** | OpenAI Whisper |
| **AI Analysis** | OpenAI GPT-4o |

### File Structure
```
jotthis/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts    # Voice → Text (TODO: integrate Whisper)
│   │   └── analyze/route.ts       # AI insights (TODO: integrate GPT-4)
│   ├── firebase-test/page.tsx     # Firebase connection test
│   ├── page.tsx                   # Main app UI
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── components/
│   ├── NotesList.tsx              # Notes list view
│   └── NoteDetail.tsx             # Single note detail + AI insights
├── hooks/
│   └── useVoiceRecorder.ts        # Audio recording logic
├── lib/
│   └── firebase.ts                # Firebase SDK initialization
├── types/
│   └── index.ts                   # TypeScript type definitions
├── firebase.json                  # Firebase configuration
├── firestore.rules                # Firestore security rules
├── firestore.indexes.json         # Firestore indexes
└── storage.rules                  # Storage security rules
```

### Data Flow

```mermaid
graph LR
    A[User] -->|Records Audio| B[useVoiceRecorder]
    B -->|Audio Blob| C[/api/transcribe]
    C -->|Upload| D[Firebase Storage]
    C -->|Transcribe| E[OpenAI Whisper]
    E -->|Text| F[OpenAI GPT-4]
    F -->|Title + Tags| G[Firestore]
    G -->|Load Notes| H[NotesList]
    H -->|Select Note| I[NoteDetail]
    I -->|Request Insights| J[/api/analyze]
    J -->|GPT-4| K[AI Insights]
```

### Database Schema

**Firestore Structure:**
```
/users/{userId}/transcriptions/{transcriptionId}
  - id: string
  - userId: string
  - title: string (AI-generated)
  - transcript: string (from Whisper)
  - tags: string[] (AI-generated)
  - audioUrl: string (Storage path)
  - insights: {
      actionItems?: string[]
      contentIdeas?: string[]
      research?: string[]
    }
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Storage Structure:**
```
/users/{userId}/audio/{timestamp}.webm
```

---

## 🔧 Development Status

### ✅ Completed
- [x] Next.js 15 app setup with TypeScript
- [x] Tailwind CSS + DaisyUI styling
- [x] Voice recording hook with MediaRecorder API
- [x] Main UI with recording button and timer
- [x] Notes list and detail views
- [x] Firebase SDK initialization
- [x] Firebase configuration files
- [x] Security rules for Firestore and Storage
- [x] Firebase connection test page

### 🚧 In Progress / TODO
- [ ] Replace `/api/transcribe` mock with OpenAI Whisper
- [ ] Replace `/api/analyze` mock with OpenAI GPT-4
- [ ] Add Firebase Authentication
- [ ] Store notes in Firestore (currently in-memory)
- [ ] Upload audio to Firebase Storage
- [ ] Real-time data sync with Firestore listeners
- [ ] Delete audio files when notes are deleted
- [ ] PWA manifest and service worker
- [ ] Mobile responsiveness improvements
- [ ] Error handling and retry logic

---

## 🧪 Testing

### Firebase Connection Test
```bash
# Start dev server
npm run dev

# Visit test page
open http://localhost:3000/firebase-test
```

All three services should show **✓ Initialized**.

### Manual Voice Recording Test
1. Visit [http://localhost:3000](http://localhost:3000)
2. Click the microphone button
3. Speak for a few seconds
4. Click again to stop
5. Wait for mock transcription to appear

**Note:** Currently uses placeholder transcription. Real OpenAI integration pending.

---

## 📝 API Routes

### POST `/api/transcribe`
**Purpose:** Transcribe audio to text

**Request:**
- Body: `FormData` with `audio` field (Blob)

**Response:**
```json
{
  "success": true,
  "transcript": "Transcribed text...",
  "title": "AI-generated title",
  "tags": ["tag1", "tag2"],
  "audioUrl": "gs://bucket/users/{userId}/audio/{id}.webm"
}
```

**Status:** 🟡 Mock implementation (TODO: integrate Whisper)

---

### POST `/api/analyze`
**Purpose:** Generate AI insights from transcript

**Request:**
```json
{
  "transcript": "Full transcript text...",
  "type": "actionItems" | "contentIdeas" | "research"
}
```

**Response:**
```json
{
  "success": true,
  "insights": ["Insight 1", "Insight 2", "..."]
}
```

**Status:** 🟡 Mock implementation (TODO: integrate GPT-4)

---

## 🔐 Security

### Firestore Rules
Users can only access their own transcriptions:
```javascript
match /users/{userId}/transcriptions/{transcriptionId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Storage Rules
Users can only access their own audio files:
```javascript
match /users/{userId}/audio/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Rules are deployed to:**
- Firestore: Production
- Storage: Production

---

## 🤖 AI Integration Guide

### For AI Assistants Working on This Codebase

**Key Files to Understand:**
1. `app/page.tsx` - Main UI and recording flow
2. `hooks/useVoiceRecorder.ts` - Audio capture logic
3. `app/api/transcribe/route.ts` - Transcription endpoint (needs OpenAI)
4. `app/api/analyze/route.ts` - Analysis endpoint (needs GPT-4)
5. `lib/firebase.ts` - Firebase SDK setup

**Next Implementation Steps:**
1. Create `lib/firebase-helpers.ts` with Firestore/Storage utilities
2. Update `/api/transcribe` to use OpenAI Whisper API
3. Update `/api/analyze` to use GPT-4 with tailored prompts
4. Add authentication flow with Firebase Auth
5. Persist notes to Firestore instead of local state

**Environment Variables Required:**
- ✅ Firebase config (all set in `.env`)
- ✅ OpenAI API key (set in `.env`)

**Common Commands:**
```bash
npm run dev          # Start development server
firebase deploy      # Deploy security rules
npm run build        # Production build
```

---

## 📦 Dependencies

### Production
- `next` - React framework
- `react` & `react-dom` - UI library
- `typescript` - Type safety
- `firebase` - Backend services
- `openai` - AI APIs
- `tailwindcss` & `daisyui` - Styling
- `framer-motion` - Animations
- `lucide-react` - Icons

### Development
- `@types/*` - TypeScript definitions
- `eslint` - Code linting
- `postcss` - CSS processing

---

## 🐛 Troubleshooting

### Firebase not initializing
- Check `.env` file has all required variables
- Verify Firebase services are enabled in Console
- Visit `/firebase-test` to see specific errors

### Audio recording not working
- Ensure HTTPS or localhost (required for getUserMedia)
- Check browser microphone permissions
- Test in Chrome/Edge (best MediaRecorder support)

### OpenAI API errors (when implemented)
- Verify `OPENAI_API_KEY` is set correctly
- Check API usage limits and billing
- Review error logs in terminal/console

---

## 📄 License

MIT

---

## 🤝 Contributing

This is a personal project, but suggestions are welcome! Open an issue or submit a PR.
