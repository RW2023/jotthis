# JotThis - AI Voice Notes

Transform your voice notes into structured insights with AI.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

#### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** → Name it `jotthis-ai`
3. Click the **Web icon (`</>`)** to register a web app
4. Copy the `firebaseConfig` values into your `.env.local`
5. **Enable these services in your Firebase project:**
   - **Authentication:** Enable "Anonymous" or "Email/Password"
   - **Firestore Database:** Create database in "test mode"
   - **Storage:** Enable for audio files

#### OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to `.env.local` as `OPENAI_API_KEY`

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + DaisyUI
- **Animations:** Framer Motion
- **Backend:** Firebase (Auth, Firestore, Storage)
- **AI:** OpenAI (Whisper + GPT-4o)
- **Icons:** Lucide React

## 📱 Features

- **Voice Recording:** Browser-based audio capture
- **AI Transcription:** Powered by OpenAI Whisper
- **Smart Tagging:** Automatic categorization
- **On-Demand Insights:**
  - Action Items
  - Content Ideas
  - Research Pointers
- **PWA Support:** Install on mobile devices

## 🧪 Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📄 License

MIT
