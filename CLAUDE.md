# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zo Quest — an interactive, mobile-first quest map for Rishikesh. Users explore quests (locations, activities, food spots) on a dark-themed Mapbox map, filter by category, and earn ZO tokens. Built as a static web app with no build system, no frameworks, and no backend.

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no npm, no bundler, no framework)
- Mapbox GL JS v3.1.2 for map rendering
- Deployed on Vercel as a static site (auto-detected, no vercel.json)

## Development

No build or install step. Serve with any static file server:

```
npx serve .
# or
python -m http.server
```

There are no tests, no linter, and no CI pipeline.

## Architecture

### Files

- **index.html** — DOM structure: map, header, category filters, quest panel, bottom nav, toast, loading screen
- **script.js** (~300 lines) — IIFE with all app logic: CSV parsing, map setup, marker/popup rendering, filtering, navigation
- **styles.css** (~400 lines) — Black/orange theme, CSS-only animations, mobile-first responsive layout
- **rishikesh_quests.csv** — Quest data: id, title, description, difficulty, reward, category, slug (48 quests across 12 categories)

### script.js Structure

Single IIFE `(function() { ... })()` with DOMContentLoaded entry point. Key sections:

- **Config** — Mapbox token, Rishikesh center/bounds, `CATEGORIES` metadata (emoji + color per category), `COORDS` mapping (slug → [lng, lat])
- **CSV Parser** — `parseCSVRow()` / `parseCSV()` handle quoted fields with escaped double-quotes
- **Map** — `initMap()` creates Mapbox map bounded to Rishikesh, night mode, rotation disabled for perf
- **Quest Loading** — `loadQuests()` fetches CSV, filters to quests with matching coordinates, populates state
- **Rendering** — `renderCategoryFilters()`, `renderQuests()` (horizontal card list), `renderMarkers()` (grouped by slug)
- **Popups** — `openPopup()` creates dark-themed popup showing all quests at a location; `flyToQuest()` animates map
- **Navigation** — `initNav()` handles bottom nav; Events tab shows "Coming Soon" toast

### Quest Data Flow

1. CSV fetched → parsed with custom parser
2. Each row matched to coordinates via `COORDS[slug]`
3. Quests without matching coords are filtered out (e.g., the "game-1111" daily quest)
4. Quests grouped by slug for map markers (one marker per physical location)
5. Category filter re-renders both the card list and markers

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

- Mobile (≤768px): horizontal card carousel at bottom, category pills above cards, bottom gradient on map
- Desktop (≥769px): 340px right sidebar with vertical quest list, category pills float on map top-left
- Bottom nav: 64px fixed, Quests (active) + Events (coming soon)

### Map Configuration

- Bounded to Rishikesh area: `[[78.10, 29.95], [78.55, 30.30]]`
- Center: `[78.32, 30.12]`, zoom 11.5 mobile / 12.5 desktop
- Night mode basemap, hidden labels, rotation disabled for mobile performance
- No 3D building layer (removed for performance)
- Custom HTML markers with category emoji + color, grouped by location slug

### Performance Optimizations

- No GIFs — CSS-only spinner for loading
- No backdrop-filter on mobile (solid/semi-transparent backgrounds)
- All animations use only transform + opacity (GPU-accelerated)
- Map rotation/drag-rotate disabled
- No 3D building extrusion layer
- Markers grouped by slug to minimize DOM elements

## Assets

`Assets/` directory: logos (zo-white.png), favicon (icon.png). The Z_to_House.gif and spinner GIF are no longer used.

## Adding New Quest Locations

1. Add the quest row to `rishikesh_quests.csv` with a unique slug
2. Add the slug's `[lng, lat]` coordinates to the `COORDS` object in script.js
3. If the category is new, add it to the `CATEGORIES` object with emoji and color

# Mapbox Documentation

> Mapbox is a developer platform for mapping, location search, and navigation. Developers can use Mapbox's APIs, SDKs, and tools to build custom maps, add location search, and implement navigation features into web and mobile applications. This file contains information and links to the documentation for all products in the Mapbox ecosystem.

## Maps client libraries & SDKs

- [Mapbox GL JS - GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Mapbox GL JS - JS Frameworks](https://docs.mapbox.com/mapbox-gl-js/plugins/#framework-integrations)
- [Mobile SDKs - iOS SDK Docs](https://docs.mapbox.com/ios/)
- [Mobile SDKs - Android SDK Docs](https://docs.mapbox.com/android/)
- [Mobile SDKs - Flutter SDK Docs](https://docs.mapbox.com/flutter/)

## Data loading & access APIs

- [Mapbox Tiling Service - API Docs](https://docs.mapbox.com/api/maps/mapbox-tiling-service/)
- [Mapbox Tiling Service - MTS Manual](https://docs.mapbox.com/mapbox-tiling-service/)
- [Uploads API - API Docs](https://docs.mapbox.com/api/maps/uploads/)
- [Datasets API - API Docs](https://docs.mapbox.com/api/maps/datasets/)
- [Tilequery API - API Docs](https://docs.mapbox.com/api/maps/tilequery/)
- [Tilequery API - API Playground](https://docs.mapbox.com/playground/tilequery/)

## Tiling & rendering APIs

- [Vector Tiles API - API Docs](https://docs.mapbox.com/api/maps/vector-tiles/)
- [Raster Tiles API - API Docs](https://docs.mapbox.com/api/maps/raster-tiles/)
- [Static Images API - API Docs](https://docs.mapbox.com/api/maps/static-images/)
- [Static Images API - API Playground](https://docs.mapbox.com/playground/static/)
- [Static Tiles API - API Docs](https://docs.mapbox.com/api/maps/static-tiles/)

## Map design

- [Mapbox Studio - Studio Manual](https://docs.mapbox.com/studio-manual/)
- [Mapbox Studio - Studio Login](https://studio.mapbox.com/)
- [Style Specification - View the Spec](https://docs.mapbox.com/style-spec/)
- [Mapbox Standard Style - View the docs](https://docs.mapbox.com/map-styles/standard/)
- [Styles API - API Docs](https://docs.mapbox.com/api/maps/styles/)
- [Fonts API - API Docs](https://docs.mapbox.com/api/maps/fonts/)

## Navigation client SDKs

- [Navigation SDK - iOS SDK Docs](https://docs.mapbox.com/ios/navigation/)
- [Navigation SDK - Android SDK Docs](https://docs.mapbox.com/android/navigation/guides/)

## Navigation APIs

- [Directions API - API Docs](https://docs.mapbox.com/api/navigation/directions/)
- [Directions API - API Playground](https://docs.mapbox.com/playground/directions/)
- [Map Matching API - API Docs](https://docs.mapbox.com/api/navigation/map-matching/)
- [Isochrone API - API Docs](https://docs.mapbox.com/api/navigation/isochrone/)
- [Isochrone API - API Playground](https://docs.mapbox.com/playground/isochrone/)
- [Optimization API - API Docs](https://docs.mapbox.com/api/navigation/optimization/)
- [Optimization API - Demo](https://demos.mapbox.com/optimization-v2-playground/)
- [Matrix API - API Docs](https://docs.mapbox.com/api/navigation/matrix/)
- [EV Charge Finder API - API Docs](https://docs.mapbox.com/api/navigation/ev-charge-finder/)
- [EV Charge Finder API - API Playground](https://docs.mapbox.com/playground/ev-charge-finder/)

## Search client libraries & SDKs

- [Mapbox Search JS - Search JS Docs](https://docs.mapbox.com/mapbox-search-js/)
- [Search Mobile SDKs - iOS SDK Docs](https://docs.mapbox.com/ios/search/overview/)
- [Search Mobile SDKs - Android SDK Docs](https://docs.mapbox.com/android/search/overview/)
- [Mapbox GL Geocoder - Github Repo](https://github.com/mapbox/mapbox-gl-geocoder)

## Search APIs

- [Geocoding API - API Docs](https://docs.mapbox.com/api/search/geocoding/)
- [Geocoding API - API Playground](https://docs.mapbox.com/playground/geocoding/)
- [Search Box API - API Docs](https://docs.mapbox.com/api/search/search-box/)
- [Search Box API - API Playground](https://docs.mapbox.com/playground/search-box/)

## Mapbox Tilesets

- [Vector Tilesets - All Tileset Docs](https://docs.mapbox.com/data/tilesets/reference/)
- [Raster Tilesets - All Tileset Docs](https://docs.mapbox.com/data/tilesets/reference/)

## Specialty data products

- [Mapbox Boundaries - Dataset Docs](https://docs.mapbox.com/data/boundaries/)
- [Mapbox Movement - Dataset Docs](https://docs.mapbox.com/data/movement/)
- [Traffic Data - Dataset Docs](https://docs.mapbox.com/data/traffic/)

## Accounts and Pricing

- [Accounts and Pricing Account Docs](https://docs.mapbox.com/accounts/)

## Tokens API

- [Tokens API Tokens API](https://docs.mapbox.com/api/accounts/tokens/)

## Atlas

- [Atlas Atlas Docs](https://docs.mapbox.com/atlas)

## Mapbox in Tableau

- [Mapbox in Tableau Tableau Extension Docs](https://docs.mapbox.com/geographic-analytics/overview/)

## Android Core library

- [Android Core library Library Docs](https://docs.mapbox.com/android/core/guides/)

## Maps SDK for Unity

- [Maps SDK for Unity SDK Docs](https://docs.mapbox.com/unity/maps/guides/)

## Mapbox AI Tools

- [Mapbox AI Tools MCP Server](https://docs.mapbox.com/api/guides/mcp-server/)
- [Mapbox AI Tools DevKit MCP Server](https://docs.mapbox.com/api/guides/devkit-mcp-server/)
- [Mapbox AI Tools Agent Skills](https://docs.mapbox.com/api/guides/mapbox-agent-skills/)

## Geospatial Dev Tools

- [Geospatial Dev Tools geojson.io](https://geojson.io)
- [Geospatial Dev Tools Location Helper](https://labs.mapbox.com/location-helper/)
- [Geospatial Dev Tools Bezier Curves](https://labs.mapbox.com/bezier-curves/)
- [Geospatial Dev Tools What the Tile](https://labs.mapbox.com/what-the-tile/)
- [Geospatial Dev Tools See all Dev Tools](https://docs.mapbox.com/resources/dev-tools/)

## Map Design

- [Map Design Mapbox Studio](https://studio.mapbox.com)
- [Map Design Cartogram](https://apps.mapbox.com/cartogram)
- [Map Design Maki Icon Editor](https://labs.mapbox.com/maki-icons/)
- [Map Design Mapbox Core Styles](https://docs.mapbox.com/api/maps/styles/#mapbox-styles)
- [Map Design Style Gallery](https://www.mapbox.com/gallery/)

## API Playgrounds

- [API Playgrounds Directions API](https://docs.mapbox.com/playground/directions/)
- [API Playgrounds Search Box API](https://docs.mapbox.com/playground/search-box/)
- [API Playgrounds Static Images API](https://docs.mapbox.com/playground/static/)
- [API Playgrounds Isochrone API](https://docs.mapbox.com/playground/isochrone/)
- [API Playgrounds See all](https://docs.mapbox.com/playground/)

## Open Code

- [Open Code Mapbox Vector Tile Specification](https://github.com/mapbox/vector-tile-spec)
- [Open Code Rasterio](https://github.com/mapbox/rasterio)
- [Open Code PixelMatch](https://github.com/mapbox/pixelmatch)
- [Open Code See all](https://github.com/mapbox/)

## Developers

- [Developers Developer AI Assistant](/ask-ai/)
- [Developers Developer Cheatsheet](https://labs.mapbox.com/developer-cheatsheet/)
- [Developers MapboxDevs Discord](https://discord.gg/UshjQYyDFw)
- [Developers @Mapbox on Twitter](https://twitter.com/mapbox)
- [Developers Events](https://www.mapbox.com/webinars)

## Demos & Projects

- [Demos & Projects Real Estate Demo App](https://labs.mapbox.com/demo-realestate/)
- [Demos & Projects Store Locator Demo App](https://labs.mapbox.com/demo-store-locator/)
- [Demos & Projects Isochrone Intersect Demo](https://labs.mapbox.com/isochrone-intersect/)
- [Demos & Projects See all](https://docs.mapbox.com/resources/demos-and-projects/)

## Web service interfaces

- [Web service interfaces JavaScript](https://github.com/mapbox/mapbox-sdk-js)
- [Web service interfaces Python](https://github.com/mapbox/mapbox-cli-py)
- [Web service interfaces Java](https://docs.mapbox.com/android/java/overview/)
- [Web service interfaces Ruby](https://github.com/mapbox/mapbox-sdk-rb)
- [Web service interfaces See all](https://docs.mapbox.com/api/overview/#sdk-and-library-support)
