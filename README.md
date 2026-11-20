# Grand Wine Experience — Marketing Event Arcade Games

## Kiosk Flow and Privacy

The kiosk requires an admin login before game selection and player consent. Both games use **one stop per round**, and results cannot be dismissed with Escape, a backdrop tap, or a close button. In The Perfect 23, the next-player action clears registration and returns to the registration screen. **Play again** is controlled in Event controls and is off by default; when off, a completed player must register again before another round.

- **Picture Match:** stop the moving glass once. The result is horizontal overlap with its outline, from 0% to 100%; only complete alignment wins. Partial overlap is rounded down so it never appears as a false 100%. Settings provides a 0.25x–2x speed multiplier alongside difficulty.
- **The Perfect 23:** the live clock uses `MM:SS.hh` and disappears at 20 seconds while the timer keeps running. Results and leaderboards show elapsed seconds to two decimal places, not points. By default, only a displayed **23.00s** wins. Event controls lets the host save a target (1–300s) and independent inclusive minimum/maximum winning times (0–300s). Judging uses the same rounded hundredths shown on screen, and settings are snapshotted at round start.
- **Standings:** the in-game Top 8 and the standalone leaderboard share device-local results. Picture Match ranks highest percentage first. The Perfect 23 ranks closest to each round's recorded target first, even if the host later changes the target. Ties favor earlier results. Up to 100 results per game are retained.
- **Upgrade:** legacy kiosk points and the old cumulative picture best are cleared once on first use of the new event leaderboard. Historical remote scores are not deleted or converted. On the first settings migration, the old default 23.00s target and 22.34s–23.99s range become the exact 23.00s default; other custom rules and unrelated preferences are preserved. A host may subsequently save the old range again.
- **Settings:** Event controls is first and Audio is last. English/Tagalog language selection updates the kiosk immediately and persists on the device. New or reset devices require player email and phone, but not name; guidelines and vibration are on. Existing saved choices are preserved and can be changed after admin login. **Show leaderboard** (on by default) hides the in-game standings in both games, the Menu leaderboard button, and redirects `/leaderboard` home when off. **Design** offers Violet Velocity (default), Mischka Pink, Solid Slate, or a custom color, plus the `7.png` ribbon or `5.png` circle background. Non-violet colors tint the artwork and panels rather than filling them, so white text stays readable.

Each consented player registration is saved in Supabase before play; repeat registrations are separate records. If saving fails, the form retains the details and the player must retry. The active player remains in memory until Next player, admin sign-out, or a page reload. Leaderboard names and scores are stored in the browser's local storage on that device, not synced between devices. Apply the access SQL below before deployment to protect remote records; the UI gate alone does not secure the database. Review the privacy notice and establish an appropriate retention and deletion policy before deployment.

Vibration uses the browser's Vibration API. Use **Settings > Gameplay > Test vibration** on the actual device; a successful request does not guarantee a physical vibration. Some browsers and devices do not support it, and system vibration, silent, or Do Not Disturb settings may prevent it. Saved device settings can disable vibration even though it is on by default for new devices.

## Admin Login and Initial Account

Every app page requires a verified Supabase Auth administrator. The admin unlocks the event device once; player registration and Next player do not sign the admin out. Supabase restores and refreshes the session across reloads. Sign-out, session expiry without a successful refresh, or verification failure locks the app. There is no public signup, passwordless pass, guest-login shortcut, or offline authentication fallback.

### Setup (Node 22.15+)

1. In Supabase Auth, enable email/password sign-in and disable **Allow new users to sign up**. This implementation has no public signup form, and only accounts with the server-managed `app_metadata.role = 'admin'` can access the app.
2. For a new database, run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor. For both new and existing databases, then run [`supabase/admin-access.sql`](./supabase/admin-access.sql) and [`supabase/player-registrations.sql`](./supabase/player-registrations.sql). The access scripts protect the old tables and the new registration table without deleting existing data. Ensure the registration table is exposed through the Supabase Data API, and deploy these restrictions together with the app/API changes. Do not retain additional custom public-access policies on these tables.
3. Copy [`.env.example`](./.env.example) to the ignored `.env` file. Configure the Supabase URL, public client key, server service-role key, and seed-only `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Choose a unique password of at least 12 characters. Never put passwords or service-role keys in `VITE_` variables, source code, or shared logs.
4. Run `npm run seed:admin`. This explicitly creates an email-confirmed Supabase Auth admin and matching operator profile. The SQL seed alone does **not** create login credentials. No fake scores or marketing consents are added, and device settings are not overwritten.
5. Open `/login` and sign in with the email/password you supplied. Set only the client variables and score API server variables in Vercel, then deploy. Seed-only credentials are not needed by the running app.

The seed reads process environment variables and, if present, the ignored local `.env` file (existing process values take precedence). Rerunning repairs the profile but does not duplicate accounts, change existing passwords, or promote an existing non-admin account. If an account conflicts, an authorized project administrator must resolve it explicitly.

For password rotation, use the Supabase Dashboard's Auth user management to reset the password and revoke existing sessions as appropriate; rerunning the seed is not password rotation. Remove `ADMIN_PASSWORD` from local setup configuration after use. Admin role changes used by RLS take effect when JWTs refresh/expire; changing a role does not instantly revoke every issued token.

**Privacy boundary:** all interactive pages, database records, and the score API require admin authorization. Bundled JavaScript, images, MP4, and MP3 files remain downloadable by URL; hiding them needs separate hosting-level protection. This login does not encrypt browser-local standings/settings. Use a trusted event device and review its stored data before handing it to someone else.

**Data clearing:** Settings > Clear event data removes this device's standings/settings/rewards, this operator's remote game records, and player registrations saved by this admin. Other admins' registrations and the admin Auth account and operator profile are preserved. Remote deletions happen sequentially: if one fails, earlier deletions may already have completed; resolve the error and retry. To remove an admin account or revoke its access, use authorized Supabase administration, not the player-data controls.

### Access checks

- `npm test` covers admin role verification, session failures/expiry, API authorization, seed validation/reruns, and existing game rules.
- `npm run build` typechecks and creates the production build.
- In a designated test database, run [`supabase/tests/admin-access.sql`](./supabase/tests/admin-access.sql) after the schema/access scripts. It checks anonymous denial, non-admin denial, and admin access inside a rolled-back transaction. Never use production data for setup testing.
- Also run [`supabase/tests/player-registrations.sql`](./supabase/tests/player-registrations.sql) in that test database to check registration permissions and owner-scoped deletion.
- Browser-check signed-out root/deep links, incorrect credentials, non-admin rejection, successful login, refresh, sign-out/back navigation, and consecutive player registration at tablet/mobile widths. `vite` serves the UI only; the score API requires Vercel or `vercel dev`.

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

The game menu and play screen are optimized for 1032 x 1376 portrait tablets. The Perfect 23 keeps the supplied portrait composition, with navigation and the leaderboard below the artwork at every width. Picture Match places the leaderboard below its stage at portrait widths from 761px through 1100px and retains the sidebar on wider landscape screens. Menu and game navigation controls use touch targets of at least 56px, visible keyboard focus, and reduced-motion support. New visitors see **Register & play**; The Perfect 23's **Next player** clears the current player and returns to registration.

For UI regression checks, verify both game menus, registration, timer start/stop/retry, player handoff, AVP, and admin navigation at 1032 x 1376, 1376 x 1032, and mobile widths. Run `npm run build` before pushing; Vercel uses the existing SPA rewrites and `dist` output.

The Perfect 23 shows **Cheers to the Perfect 23!** for a win and **Every pour is worth the cheers!** otherwise. Its result includes the recorded time and, for winners, instructions to present the screen to the event ambassador. Picture Match retains its existing results and gameplay. Registration keeps the full Privacy Notice behind **View more details** and requires its existing privacy acknowledgment; no marketing checkbox is added.

### Supplied rebranding and stopwatch flow

The shared selection/registration screens and stopwatch use the original transparent PNG artwork from [`assets/wine_game_UI`](./assets/wine_game_UI). The event's **23rd Grand Wine Experience** and Global Visions logos remain unchanged; the stopwatch's name is **The Perfect 23**.

The shared screens use [`SCREEN 2/7.png`](<./assets/wine_game_UI/SCREEN 2/7.png>) as a full-width violet backdrop, including behind registration and the stopwatch. Picture Match retains its own scene. The selection header adds lavender orbital accents and softly glowing stars (static with reduced motion); Challenge 1 displays a smaller, fully contained wine glass.

During The Perfect 23 a gold **Target** badge sits under the clock, and the supplied wine glass fills from empty: the wine reaches the glowing target line at the target time and the brim shortly after. [`assets/generated/wine-glass-empty.png`](./assets/generated/wine-glass-empty.png) is an empty-glass version derived from the supplied artwork; the original is clipped over it to reveal the wine. A floating message badge in GVE brand colors (Red Visions, Bridge Happy, Simple Bliss, Stable Slate) with the GVE mark shows through 15.99s, then changes to a HULMA badge (HULMA Blue, Perspective Orange, Foundation Gray, Fresh White, Kanit type, radiating-line pattern, and the HM mark) from 16.00s until STOP. The logo marks in `assets/generated` are cropped from [`assets/GVE Logo`](<./assets/GVE Logo>) and [`assets/Hulma Logo`](<./assets/Hulma Logo>); the GVE Gilmer font is used only when installed on the device. Brand-tinted bubbles and sparkles rise only inside the poured wine, masked by [`assets/generated/wine-liquid-mask.png`](./assets/generated/wine-liquid-mask.png) and the current fill level. At 20 seconds, even with a custom target, the clock keeps counting under a heavy, pulsing blur with color-split interference and a soft scanline, so time visibly passes without being readable; the exact final time is revealed on STOP. The OS or in-app **Reduce motion** setting keeps the message badge still, hides the rising bubbles, and stops the blur pulse, interference, and scanline; the blurred digits still keep counting.

Each newly registered stopwatch player sees the instructions with the currently configured winning rule. **Pour a glass!** (or closing instructions) only dismisses them; the player must press **Start** to begin, then **Stop** once to finish. When enabled in settings, **Play again** returns to Start without forcing another instruction dialog. When disabled, the same registration cannot replay through the game menu or direct navigation. **Next player** or **Cheers to you!** clears registration and returns to the registration screen.

The five `Screen*.png` files are visual references, not flattened interactive screens. Backgrounds, logos, glass, and suitable artwork are reused directly. Dialog and CTA text remains live and available in English/Tagalog so custom rules and actual results are never replaced with baked-in example text. **23.68s is a loss under the exact default**, though an event host can configure a range that includes it.

Rebranding regression checks:

- Compare registration, running clock, instructions, win, and loss against all five references at 1032 x 1376. Allow the approved live text, new name, and retained player-handoff controls.
- Check 1376 x 1032 and narrow phone layouts, both languages, theme settings, keyboard focus, and the full privacy disclosure.
- Check the 15.99s/16.00s bubble transition, clock hiding at 20s, Start/Stop, Space, replay on/off, Next player, one saved result per stop, inclusive winning boundaries, and a custom target above one minute. Rapid repeated Stop actions must not dismiss the result or start another round.
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
- **Backend & Auth**: Supabase Auth email/password admin sessions, PostgreSQL, and admin-only Row-Level Security
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

Uses the existing TypeScript package and Node's built-in test runner (Node 22.15+). Covers overlap percentages, exact and custom timing boundaries, bubble and clock transitions, default migration, live clock rollover, settings normalization, ranking, legacy clearing, and storage errors.

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

| Variable                    | Description                                                       | Location            |
| :-------------------------- | :---------------------------------------------------------------- | :------------------ |
| `VITE_SUPABASE_URL`         | Supabase project URL                                              | Client & Server     |
| `VITE_SUPABASE_ANON_KEY`    | Public anonymous client key                                       | Client              |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret (bypasses RLS for score submission)  | Serverless API Only |
| `SUPABASE_URL`              | Supabase project URL for API and seeding                          | Server / Seed       |
| `ADMIN_EMAIL`               | Initial admin login email; used only by the explicit seed command | Seed Only           |
| `ADMIN_PASSWORD`            | Initial unique password (at least 12 characters); never bundled   | Seed Only           |
| `VITE_EVENT_NAME`           | Name displayed on live banners & splash                           | Optional (Client)   |
| `VITE_AVP_VIDEO_URL`        | Optional direct video URL; defaults to `/gvi-avp-2026.mp4`        | Optional (Client)   |

> **Fail-closed login**: missing Supabase client configuration displays a setup error and never unlocks the app. Authentication needs connectivity. Player handoff remains local while the admin session is valid.

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
- [ ] **Admin gate**: Open the root and every deep link while signed out; only the admin login should appear, including after a refresh or a forged legacy saved user.
- [ ] **Admin session**: Verify incorrect credentials and non-admin accounts are rejected; verify login, reload, sign-out, and session loss. No public registration or guest bypass should exist.
- [ ] **Deep Link Refresh**: Navigate to `/menu` or `/settings` and refresh the browser; ensure the page reloads correctly without a 404 error.
- [ ] **Picture Match**: Stop once by button, board tap, or Spacebar. Verify one percentage result, no automatic continuation, and no duplicate submission on rapid taps.
- [ ] **The Perfect 23**: Dismiss instructions, explicitly Start, check the bubble transition and hidden clock, save target/bounds, and verify the displayed result and winning outcome agree.
- [ ] **Player handoff**: Verify the next-player action receives result-dialog focus, clears registration, and returns to registration. Escape/backdrop must not restart. Check that Play again is off by default, blocks the same registration when off, and works when enabled.
- [ ] **Standings**: Verify shared in-game/standalone results, percentage/seconds units, and target-relative timer ordering.
- [ ] **Media**: Verify AVP plays with no URL override, MP3 loops, mute/volumes work, and background audio pauses during video playback.
- [ ] **Language/layout**: Switch English/Tagalog and check settings, registration, results, and standings at 1032 x 1376, landscape, and mobile.
- [ ] **Haptics**: On supported Android devices, verify vibrations trigger on button taps and successful matches.
- [ ] **Settings Persistence**: Change theme from Auto to Dark or adjust SFX volume; refresh the page and verify preferences persist.
- [ ] **Lighthouse Accessibility**: Ensure high-contrast colors, visible focus rings, and screen-reader ARIA roles meet accessibility standards ($\ge 90$).
