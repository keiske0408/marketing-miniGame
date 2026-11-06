# Perfect Picture Match — Marketing Event Arcade Game

An interactive, mobile-first timing and reflex mini-game optimized for in-person marketing events, product showcases, and kiosk displays. Attendees scan a QR code, play a fast-paced puzzle challenge, compete on a live event leaderboard, and claim booth prizes.

Deploys seamlessly to **Vercel** with full client-side SPA routing and serverless score validation.

---

## ⚡ Tech Stack

- **Framework**: React 18 + Vite 6 + TypeScript (Strict)
- **Routing**: `react-router-dom` with deep link SPA rewrites (`/`, `/home`, `/login`, `/menu`, `/play`, `/settings`, `/leaderboard`, `/rewards`)
- **State & Storage**: `zustand` with persistent `localStorage` synchronization
- **Audio Engine**: Zero-latency Web Audio API procedural synthesizer (plus optional `/public/audio` file overrides)
- **Haptics**: `navigator.vibrate` with customizable tick, success, and countdown patterns
- **Forms & Validation**: `react-hook-form` + `zod`
- **Backend & Auth**: Supabase (PostgreSQL + Row-Level Security) with offline mock fallback
- **Serverless API**: Vercel Serverless Function `/api/submit-score` for secure score verification

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```

### 3. Build & Typecheck for Production
```bash
npm run build
```

---

## 🌐 Deploying to Vercel

### Option A: GitHub / Git Integration (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel dashboard, click **"Add New Project"** and import the repository.
3. Vercel automatically detects the Vite framework and reads [`vercel.json`](./vercel.json):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Rewrites**: All paths mapped to `/index.html` for deep links (`/menu`, `/play`, etc.)
4. Add environment variables in the Vercel Project Settings (see below).
5. Click **Deploy**.

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
# For production deployment:
vercel --prod
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Location |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL | Client & Server |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous client key | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret (bypasses RLS for score submission) | Serverless API Only |
| `VITE_EVENT_NAME` | Name displayed on live banners & splash | Optional (Client) |

> **Offline / Demo Resilience**: If Supabase environment variables are omitted, the game automatically operates in **offline demo mode** using local mock profiles, standings, and vouchers.

---

## 🎨 Asset Customization Guide

### 1. Logo & Event Name
- **Event Name**: Update `EVENT_NAME` in [`src/config/constants.ts`](./src/config/constants.ts) or set `VITE_EVENT_NAME` in `.env`.
- **Wordmark / Logo**: Styled via the `.logo` class in [`src/styles.css`](./src/styles.css) with CSS font `@font-face` (defaulting to the Google Font `"Bungee"`).

### 2. Illustration Scenes & Images
- Procedural SVG scenes are defined in [`src/images.ts`](./src/images.ts).
- To replace scenes with actual event photos or sponsor banners, swap `src` with URL strings or imported image assets (`aspect-ratio: 16:10`).

### 3. Custom Audio & Sound Effects
- By default, [`src/services/audio.ts`](./src/services/audio.ts) generates procedural 8-bit sound effects using the Web Audio API without requiring external audio downloads.
- To substitute your own brand sound effects, drop `.wav` or `.mp3` files into `/public/audio/` as documented in [`public/audio/README.md`](./public/audio/README.md).

---

## 📱 Mobile Testing Checklist (On Real Phone)

- [ ] **Splash Unlock**: Tap "TAP TO START" on the initial screen; verify audio context unlocks on iOS Safari and Android Chrome.
- [ ] **Home Parallax**: Confirm floating puzzle pieces animate smoothly without jank.
- [ ] **Guest Demo Round**: Tap "Play as Guest", finish 1 round; verify results prompt asks to create an account to save score.
- [ ] **Account Creation**: Enter display name and email; ensure validation flags invalid emails and requires terms consent.
- [ ] **Deep Link Refresh**: Navigate to `/menu` or `/settings` and refresh the browser; ensure the page reloads correctly without a 404 error.
- [ ] **Gameplay & Physics**: Tap anywhere on the board or press Spacebar; verify the slice decelerates, locks into the gap, and spawns confetti.
- [ ] **Pause Menu**: Tap the `⏸` button in the HUD; verify the game timer and animation freeze until resumed.
- [ ] **Haptics**: On supported Android devices, verify vibrations trigger on button taps and successful matches.
- [ ] **Settings Persistence**: Change theme from Auto to Dark or adjust SFX volume; refresh the page and verify preferences persist.
- [ ] **Lighthouse Accessibility**: Ensure high-contrast colors, visible focus rings, and screen-reader ARIA roles meet accessibility standards ($\ge 90$).

