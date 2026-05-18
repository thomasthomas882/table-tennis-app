# Antigravity Session Handoff

*This document was generated to preserve context between Antigravity sessions across different devices.*

## Project Overview
**PingTrack** is a real-time table tennis match tracking and Elo rating system designed for local clubs.
- **Backend:** Node.js, Express, `socket.io` for real-time state broadcasting, `better-sqlite3` for synchronous database operations.
- **Frontend (Desktop):** React (Vite), Tailwind CSS, React Router. Packaged into a standalone `.exe` using Electron.
- **Frontend (Mobile):** Expo / React Native (located in the `mobile/` directory, currently active on the `feature/mobile-app` branch).

## Recent Accomplishments
- **Visuals:** Built dynamic, high-energy CSS animations for matches (rallying paddles, glowing balls, and anime-style lightning clashes on match start/end).
- **Match Management:**
  - Auto-start match countdown (15s grace period when dragging players into an active table).
  - Full Doubles support (vertical stacking in the UI to fit 4 players cleanly).
  - "Series Mode" tracking (Best of 3/5/7) with dedicated UI cards and progress dots.
  - Limited the "Recent Matches" widget on the Matches tab to 12 items to prevent infinite scrolling, with a link routing to a fully paginated History page.
- **Audio & Notifications:**
  - Integrated text-to-speech `SpeechSynthesis` (announcing match completions, low time warnings, etc.).
  - Added 6 new custom achievements (Deuce Master, Iron Man, Flawless Day, Warming Up, Giant Slayer, Sweep).
- **Stability & Testing:**
  - Ran a "Chaos Monkey" script (50 concurrent req/sec, 4,000+ operations in 2 minutes) simulating massive club load. The SQLite database held up perfectly with no deadlocks.

## Major Bugs Resolved (Watch out for these!)
1. **Duplicate React Keys (Stuck Notifications):** The `socket.io` server originally used `Date.now() + Math.random()` for notification IDs. Under the Chaos Monkey load, IDs collided in the exact same millisecond, causing React to panic, orphan the DOM nodes, and leave permanent "stuck" notifications on the screen. **Fix:** Replaced with `crypto.randomUUID()` in `server/index.js` for perfect uniqueness.
2. **Cross-Tab Announcer Echo:** Global timers were running independently in multiple open browser tabs, causing overlapping `SpeechSynthesis` voices. **Fix:** Added a `localStorage` lock (`lockKey-spoken`) with a slight random jitter (`setTimeout` between 50-250ms). Only the first tab to claim the lock speaks the alert, silencing the others.
3. **Electron Build Conflicts:** The production `.exe` build generates files in `client/dist`. Because these files are tracked in Git, it can cause severe merge conflicts when switching branches. Always stash or commit build outputs before switching branches.

## Current Focus: Mobile Companion App
We have just switched back to the `feature/mobile-app` branch to resume work on the React Native (Expo) companion app. 
- The `GTTC` branch (our main production branch) was successfully merged into `feature/mobile-app`, meaning the backend and desktop web app code is fully up to date.
- Next steps involve building out the mobile UI, establishing `socket.io` routing, and bringing the desktop's real-time experience to the phone.
