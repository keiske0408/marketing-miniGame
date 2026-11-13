# Grand Wine Experience — Marketing Event Arcade Games

## Kiosk Flow and Privacy

The kiosk starts with game selection, followed by player consent. Both games use **one stop per round**. Next player is the primary result action; Play again remains a small, explicit secondary action. Results cannot be dismissed with Escape, a backdrop tap, or a close button.

- **Picture Match:** stop the moving glass once. The result is horizontal overlap with its outline, from 0% to 100%; only complete alignment wins. Partial overlap is rounded down so it never appears as a false 100%. Settings provides a 0.25x–2x speed multiplier alongside difficulty.
- **Stop the Clock Challenge:** the live clock uses `MM:SS.hh` (23 seconds is `00:23.00`); results and leaderboards show elapsed seconds to two decimal places, not points. New devices default to a 23.00s target and an inclusive winning range of **22.34s–23.99s**. Event controls lets the host save a target (1–300s) and independent minimum/maximum winning times (0–300s). Judging uses the same hundredths shown on screen. Settings are snapshotted at round start.
- **Standings:** the in-game Top 8 and the standalone leaderboard share device-local results. Picture Match ranks highest percentage first. Stop the Clock Challenge ranks closest to each round's recorded target first, even if the host later changes the target. Ties favor earlier results. Up to 100 results per game are retained.
- **Upgrade:** legacy kiosk points and the old cumulative picture best are cleared once on first use of the new event leaderboard. Historical remote scores are not deleted or converted. Existing valid saved targets and unrelated preferences are preserved; new settings gain defaults.
- **Settings:** Event controls is first and Audio is last. English/Tagalog language selection updates the kiosk immediately and persists on the device. Registration requirements remain configurable without a login. **Show leaderboard** (on by default) hides the in-game standings in both games, the Menu leaderboard button, and redirects `/leaderboard` home when off. **Design** offers Violet Velocity (default), Mischka Pink, Solid Slate, or a custom color, plus the `7.png` ribbon or `5.png` circle background. Non-violet colors tint the artwork and panels rather than filling them, so white text stays readable.

Player registration details remain in memory until Next player or a page reload. Leaderboard names and scores are stored in the browser's local storage on that device, not synced between devices. The existing Supabase schema exposes profile data publicly; do not use it to collect personal information without implementing authenticated access and appropriate database policies. The consent text must be reviewed for the event's actual privacy requirements before deployment.

### AVP video and background music

The supplied media is already configured:

- Video: [`public/gvi-avp-2026.mp4`](./public/gvi-avp-2026.mp4), an optimized 1280x720 H.264/AAC MP4 with fast-start metadata (about 10.7 MB). **Play AVP works without an environment variable.**
- Background music: [`public/Gvi Avp 2026 (Final) 2.mp3`](<./public/Gvi Avp 2026 (Final) 2.mp3>), looping after the first user interaction. Master/Music volume, mute, and result ducking apply; procedural sound effects remain separate.
- Background music pauses while AVP plays and resumes on pause/end/exit. AVP follows master volume and mute. Media failures show an explicit error/retry rather than a placeholder.
- The original MOV is preserved locally, ignored by Git, and excluded from production output. Only the optimized MP4 and MP3 are deployed, outside the JavaScript bundle.

**Using a video from SharePoint:** download/export the file from SharePoint as a browser-ready H.264/AAC `.mp4`. Replace `public/gvi-avp-2026.mp4`, then commit and deploy. Alternatively put the MP4 at `public/videos/avp.mp4` and set `VITE_AVP_VIDEO_URL=/videos/avp.mp4` in local configuration and Vercel Project Settings, then redeploy.

For online hosting, upload the MP4 to a media/static host you control and set `VITE_AVP_VIDEO_URL` to its **direct HTTPS file URL**. It must return video bytes without an authentication prompt, viewer page, or expiring sharing token, and should support byte-range requests. A normal SharePoint sharing/viewer link usually does not meet these requirements.

Bundled media needs no SharePoint connection or login. A deployed site still needs internet for its initial download; guaranteed offline playback after a browser restart is not implemented. For a disconnected event, serve the built site locally on the event device and test playback beforehand.

### Portrait Tablet Layout

The game menu and play screen are optimized for 1032 x 1376 portrait tablets. Stop the Clock Challenge keeps the supplied portrait composition, with navigation and the leaderboard below the artwork at every width. Picture Match places the leaderboard below its stage at portrait widths from 761px through 1100px and retains the sidebar on wider landscape screens. Menu and game navigation controls use touch targets of at least 56px, visible keyboard focus, and reduced-motion support. New visitors see **Register & play**; **Next player / Register & play** clears the current player and opens fresh registration.

For UI regression checks, verify both game menus, registration, timer start/stop/retry, player handoff, AVP, and admin navigation at 1032 x 1376, 1376 x 1032, and mobile widths. Run `npm run build` before pushing; Vercel uses the existing SPA rewrites and `dist` output.

Stop the Clock Challenge shows **Congratulations!** for a win and **So close!** otherwise. Picture Match retains **Congratulations!** / **Thank you for playing!**, its decorative wine-themed stage, and its existing gameplay. Both games retain primary **Next player**, secondary **Play again**, and non-dismissible result dialogs. Registration keeps the full Privacy Notice behind View more details and requires a separate consent checkbox.

### Supplied rebranding and stopwatch flow

The shared selection/registration screens and stopwatch use the original transparent PNG artwork from [`assets/wine_game_UI`](./assets/wine_game_UI). The event's **23rd Grand Wine Experience** and Global Visions logos remain unchanged; the stopwatch's official name is **Stop the Clock Challenge**.

The shared screens use [`SCREEN 2/7.png`](<./assets/wine_game_UI/SCREEN 2/7.png>) as a full-width violet backdrop, including behind registration and the stopwatch. Picture Match retains its own scene. The selection header adds lavender orbital accents and softly glowing stars (static with reduced motion); Challenge 1 displays a smaller, fully contained wine glass.

During Stop the Clock Challenge a gold **Target** badge sits under the clock, and the supplied wine glass fills from empty: the wine reaches the glowing target line at the target time and the brim shortly after. [`assets/generated/wine-glass-empty.png`](<./assets/generated/wine-glass-empty.png>) is an empty-glass version derived from the supplied artwork (wine pixels replaced with a translucent glass tint); the original is clipped over it to reveal the wine. Sparkles, the pulsing Stop button, and result feedback are disabled by the OS reduced-motion preference or the in-app **Reduce motion** setting.

Each newly registered stopwatch player sees **How to play**, with the currently configured target. **I'm ready** (or closing instructions) only dismisses the instructions; the player must press **Start** to begin, then **Stop** once to finish. **Play again** returns to Start without forcing another instruction dialog. **Next player** clears registration and starts the handoff again.

The five `Screen*.png` files are visual references, not flattened interactive screens. Backgrounds, logos, glass, and button images are reused directly. Dialog text remains live and available in English/Tagalog so custom targets, actual results, and the new game name are never replaced with the PNGs' baked-in example text. In particular, **23.68s is a win under the default range**, despite the illustrative losing mockup.

Rebranding regression checks:

- Compare registration, running clock, instructions, win, and loss against all five references at 1032 x 1376. Allow the approved live text, new name, and retained player-handoff controls.
- Check 1376 x 1032 and narrow phone layouts, both languages, theme settings, keyboard focus, and the full privacy disclosure.
- Check Start/Stop, Space, replay, Next player, one saved result per stop, inclusive winning boundaries, and a custom target above one minute. Rapid repeated Stop actions must not dismiss the result or start another round.
- Confirm results/standings still use seconds, saved data and rules remain compatible, both Picture Match modes still work, and AVP/music/admin navigation remain available.

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

### 4. Rule and storage regression tests
```bash
npm test
```
Uses the existing TypeScript package and Node's built-in test runner (Node 22.15+). Covers overlap percentages, inclusive timing boundaries, live clock rollover, settings normalization, ranking, legacy clearing, and storage errors.

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
| `VITE_AVP_VIDEO_URL` | Optional direct video URL; defaults to `/gvi-avp-2026.mp4` | Optional (Client) |

> **Offline / Demo Resilience**: If Supabase environment variables are omitted, the game automatically operates in **offline demo mode** using local mock profiles, standings, and vouchers.

---

## 🎨 Asset Customization Guide

### 1. Logo & Event Name
- **Event Name**: Update `EVENT_NAME` in [`config/constants.ts`](./config/constants.ts) or set `VITE_EVENT_NAME` in `.env`. The stopwatch name is centralized as `TIMER_GAME_NAME` in the same file.
- **Wordmark / Logo**: [`EventBrand`](./components/EventBrand.tsx) uses the supplied event wordmark and sponsor logos. Preserve their transparency and proportions. The branded screens use scoped `.event-*` / `.stop-clock-*` rules in [`styles.css`](./styles.css), rather than changing Picture Match's theme.

### 2. Illustration Scenes & Images
- Stopwatch/registration artwork lives in [`assets/wine_game_UI/SCREEN 1`](<./assets/wine_game_UI/SCREEN 1>) and [`SCREEN 2`](<./assets/wine_game_UI/SCREEN 2>). Vite imports only the production resources referenced by the UI; the duplicate mockup ZIP is not bundled.
- Procedural Picture Match scenes remain in [`images.ts`](./images.ts); existing vintage scene images remain in [`public/images`](./public/images).

### 3. Custom Audio & Sound Effects
- [`services/audio.ts`](./services/audio.ts) generates procedural sound effects and loops the supplied MP3 using the Web Audio API for volume routing.
- See [`public/audio/README.md`](./public/audio/README.md) for the configured track and instructions for customizing audio. Dropping extra files into that folder does not automatically override sound effects.

---

## 📱 Mobile Testing Checklist (On Real Phone)

- [ ] **Splash Unlock**: Tap "TAP TO START" on the initial screen; verify audio context unlocks on iOS Safari and Android Chrome.
- [ ] **Home Parallax**: Confirm floating puzzle pieces animate smoothly without jank.
- [ ] **Guest Demo Round**: Tap "Play as Guest", finish 1 round; verify results prompt asks to create an account to save score.
- [ ] **Account Creation**: Enter display name and email; ensure validation flags invalid emails and requires terms consent.
- [ ] **Deep Link Refresh**: Navigate to `/menu` or `/settings` and refresh the browser; ensure the page reloads correctly without a 404 error.
- [ ] **Picture Match**: Stop once by button, board tap, or Spacebar. Verify one percentage result, no automatic continuation, and no duplicate submission on rapid taps.
- [ ] **Stop the Clock Challenge**: Dismiss instructions, explicitly Start, save target/bounds, stop at each boundary, and verify the live `MM:SS.hh`, result seconds, and winning outcome agree.
- [ ] **Player handoff**: Verify Next player receives result-dialog focus and clears registration. Escape/backdrop must not restart. Play again must be explicit and secondary.
- [ ] **Standings**: Verify shared in-game/standalone results, percentage/seconds units, and target-relative timer ordering.
- [ ] **Media**: Verify AVP plays with no URL override, MP3 loops, mute/volumes work, and background audio pauses during video playback.
- [ ] **Language/layout**: Switch English/Tagalog and check settings, registration, results, and standings at 1032 x 1376, landscape, and mobile.
- [ ] **Haptics**: On supported Android devices, verify vibrations trigger on button taps and successful matches.
- [ ] **Settings Persistence**: Change theme from Auto to Dark or adjust SFX volume; refresh the page and verify preferences persist.
- [ ] **Lighthouse Accessibility**: Ensure high-contrast colors, visible focus rings, and screen-reader ARIA roles meet accessibility standards ($\ge 90$).
