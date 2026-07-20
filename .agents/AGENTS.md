# Project Guidelines & Preferences

## 🎨 UI & Layout Style Preferences
- **Queue Tab Structure:** 
  - Keep the **Lobby list** layout in a 3-column layout on desktop resolutions (`xl:` and above).
  - Do NOT display player avatars (`Avatar` component) inside the Lobby queue cards, as they clutter the narrow column space.
  - Keep the card delete/remove button (`×`) hidden by default on desktop resolutions (`lg:` and up) and only show it on hover. This ensures maximum text width for the player name and prevents name truncation. On mobile/touch screens, let it remain visible.
  - Stack player card metadata into 3 clean vertical lines: Name (Line 1, full width), ELO rating (Line 2), and Wait Time / Staged Table (Line 3).
  - Maintain the global page layout container constraint at **`max-w-8xl`** (`1440px`) to prevent wasted margins and maximize grid usability on modern widescreen monitors.

## 🚀 Deployment & Version Control Rules
- **No Automatic Pushing:** DO NOT execute `git push` or push local commits to the remote GitHub repository unless explicitly requested by the user. Keep all commits local until final confirmation.
