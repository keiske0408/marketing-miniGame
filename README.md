# Perfect Picture Match — Marketing Event Arcade Game

## Kiosk Flow and Privacy

The kiosk starts with game selection, followed by player consent. Time Stop shows elapsed time and uses one attempt per round; retries are available until the promoter selects Next player. Settings controls the target (24 seconds by default) and whether name, email and phone are required. These settings are stored on the current device and are accessible without a login.

Player registration details remain in memory until Next player or a page reload. Leaderboard names and scores are stored in the browser's local storage on that device, not synced between devices. The existing Supabase schema exposes profile data publicly; do not use it to collect personal information without implementing authenticated access and appropriate database policies. The consent text must be reviewed for the event's actual privacy requirements before deployment.

Set `VITE_AVP_VIDEO_URL` to a browser-playable video file URL (for example, `/videos/avp.mp4` after adding the file under `public/videos/`) to enable Play AVP. Without a URL, the AVP screen shows a placeholder.

### Portrait Tablet Layout

The game menu and play screen are optimized for 1032 x 1376 portrait tablets. Portrait widths from 761px through 1100px place the leaderboard below the game stage; wider landscape screens retain the sidebar. Menu and game navigation controls use touch targets of at least 56px, visible keyboard focus, and reduced-motion support. New visitors see **Register & play**; **Next player / Register & play** clears the current player and opens fresh registration.

For UI regression checks, verify both game menus, registration, timer start/stop/retry, player handoff, AVP, and admin navigation at 1032 x 1376, 1376 x 1032, and mobile widths. Run `npm run build` before pushing; Vercel uses the existing SPA rewrites and `dist` output.

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

