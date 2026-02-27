# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zo Quest — an interactive, mobile-first quest map for Rishikesh. Users explore quests (locations, activities, food spots) on a dark-themed Mapbox map, filter by category, earn $ZO tokens by taking selfies at quest locations, and compete on a leaderboard.

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no npm, no bundler, no framework)
- Mapbox GL JS v3.1.2 for map rendering
- Supabase (via CDN) for auth, database (profiles, quest_claims), and storage (selfies bucket)
- Deployed on Vercel as a static site with `vercel.json` build command

## Development

No build or install step. Serve with any static file server:

```
npx serve .
# or
python -m http.server
```

There are no tests, no linter, and no CI pipeline.

### Configuration

API keys live in `config.js` (gitignored). Copy `config.example.js` to `config.js` and fill in real keys:

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key (starts with `eyJhbGci...`)
- `MAPBOX_TOKEN` — Mapbox GL access token

On Vercel, `config.js` is generated at build time from environment variables via `vercel.json`.

## Architecture

### Files

- **index.html** — DOM: map, header, category filters, quest panel, auth modal, leaderboard modal, bottom nav, selfie input, toast, loading screen
- **script.js** (~1100 lines) — Single IIFE with all app logic
- **styles.css** (~975 lines) — Black/orange theme, CSS-only animations, mobile-first responsive
- **rishikesh_quests.csv** — Quest data: 48 quests across 12 categories, with Location column (`"lat, lng"` format)
- **rishikesh_quests_locations.csv** — Reference file with accurate GPS coordinates (used for Location merge)
- **config.js** — Gitignored. Sets `window.APP_CONFIG` with API keys
- **config.example.js** — Committed template for config.js
- **vercel.json** — Build command that generates config.js from Vercel env vars

### script.js Structure

Single IIFE `(function() { ... })()` with DOMContentLoaded entry point. Key sections:

- **Config** — Reads `window.APP_CONFIG` for Supabase/Mapbox keys; `CATEGORIES` metadata (emoji + color per category); `COORDS` fallback mapping (slug → [lng, lat])
- **State** — Global vars: `map`, `allQuests`, `filteredQuests`, `currentUser`, `userProfile`, `userLocation`, `fakeLocation`, `fakeMode`
- **Supabase Init** — Creates client in `init()`, checks for placeholder URLs to skip auth gracefully
- **Auth** — `checkAuth()`, `signUp()`, `signIn()`, `signOut()` via Supabase Auth; auth modal toggle between sign-up/login
- **Profiles** — `loadProfile()` fetches/creates user profile with `zo_balance`; `updateZoDisplay()` updates header badge
- **Claims & Cooldown** — `claimQuestReward()` updates balance + inserts `quest_claims` row; `checkCooldown()` queries last claim time per slug; `checkAndShowClaim()` async UI update in popup
- **Selfie** — `startSelfieClaim()` opens rear camera; `handleSelfieCapture()` shows preview + confirm; `uploadSelfie()` uploads to Supabase Storage `selfies` bucket
- **Geolocation** — Browser geolocation + fake location mode (testing pin); `haversineDistance()` for 50m proximity check
- **CSV Parser** — `parseCSVRow()` / `parseCSV()` handle quoted fields with escaped double-quotes
- **Map** — `initMap()` creates Mapbox map bounded to Rishikesh, night mode, rotation disabled
- **Quest Loading** — `loadQuests()` fetches CSV, parses Location column (with COORDS fallback), populates state
- **Rendering** — `renderCategoryFilters()`, `renderQuests()` (card list), `renderMarkers()` (grouped by slug)
- **Popups** — `openPopup()` shows quests at location with proximity-based claim UI; `flyToQuest()` animates map
- **Leaderboard** — `loadLeaderboard()` queries profiles ordered by zo_balance
- **Navigation** — `initNav()` handles bottom nav (Quests/Rank/Events); Events shows "Coming Soon"

### Quest Data Flow

1. CSV fetched → parsed with custom parser
2. Each row gets coordinates from its `Location` column (`"lat, lng"` format), falling back to `COORDS[slug]`
3. Quests without coords are filtered out (e.g., "game-1111" daily quest)
4. Quests grouped by slug for map markers (one marker per physical location, may have multiple quests)
5. Category filter re-renders both the card list and markers

### Claim Flow

1. User taps a marker → popup shows quests at that location
2. If user is >50m away → shows distance, no claim button
3. If within 50m → async checks cooldown via `quest_claims` table
4. If on cooldown → shows remaining time
5. If claimable → shows "Take Selfie to Claim" button
6. Camera opens (rear, no gallery) → selfie preview → confirm
7. Selfie uploads to Supabase Storage → balance updated → claim recorded

### Supabase Tables

- **profiles** — `id` (UUID, references auth.users), `username`, `zo_balance` (integer)
- **quest_claims** — `id`, `user_id`, `quest_id`, `slug`, `reward`, `selfie_url`, `claimed_at` (timestamptz, default now())

Both tables have RLS enabled (users can only read/write their own rows).

### CSS Design System

```
--bg: #0a0a0a          (dark background)
--bg-card: rgba(20,20,20,0.85)
--accent: #ff6b35       (orange)
--accent-light: #ff8c42
--text: #ffffff
--text-dim: rgba(255,255,255,0.6)
--border: rgba(255,255,255,0.08)
```

Each quest category has its own color defined in `CATEGORIES` in script.js.

### Mobile vs Desktop

- Mobile (<=768px): horizontal card carousel at bottom, category pills above cards, bottom gradient on map
- Desktop (>=769px): 340px right sidebar with vertical quest list, category pills float on map top-left
- Bottom nav: 64px fixed — Quests (active), Rank (leaderboard), Events (coming soon)

### Map Configuration

- Bounded to Rishikesh area: `[[78.05, 29.90], [78.60, 30.35]]`
- Center: `[78.32, 30.12]`, zoom 11.5 mobile / 12.5 desktop
- Night mode basemap, rotation disabled for mobile performance
- Custom HTML markers with category emoji + color, grouped by location slug

### Coordinate Format

- CSV `Location` column: `"lat, lng"` (latitude first, comma-separated, quoted in CSV)
- Mapbox / `COORDS` object: `[lng, lat]` (longitude first)
- The `loadQuests()` parser handles the conversion

## Adding New Quest Locations

1. Add the quest row to `rishikesh_quests.csv` with a unique slug and `Location` column (`"lat, lng"`)
2. Optionally add the slug to the `COORDS` object in script.js as a fallback
3. If the category is new, add it to the `CATEGORIES` object with emoji and color

## Mapbox Reference

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Style Specification](https://docs.mapbox.com/style-spec/)
