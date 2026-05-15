# TrailBlazer Ultra

Mobile-first PWA built with SvelteKit + Svelte 5, MapLibre GL, OpenRouteService, and Open-Meteo.

## About

TrailBlazer Ultra generates GPS round-trip cycling routes optimised for tailwind on the return leg. It fetches hourly weather forecasts from Open-Meteo for your planned start time, scores four candidate loop directions by wind alignment, and returns the best match via OpenRouteService. Routes export as GPX files with elevation data, compatible with Garmin, Wahoo, and Komoot.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Maps | MapLibre GL |
| Routing API | OpenRouteService |
| Weather API | Open-Meteo |
| PWA | @vite-pwa/sveltekit |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A free [OpenRouteService API key](https://openrouteservice.org/dev/#/login)

### Installation

```bash
git clone https://github.com/moindnl/melinoe-engine.git
cd melinoe-engine
npm install
cp .env.example .env   # optional — see API Key section
npm run dev
```

Open `http://localhost:5173`.

### API Key

The ORS routing key can be set two ways:

**In-app (recommended for users):** Open the app → enter key in the UI → stored in `localStorage`.

**Build-time (for deployment):** edit `.env`:

```
VITE_ORS_API_KEY=your_key_here
```

Without a key, the app shows mock routes for UI testing.

## Usage

1. Tap the avatar icon (top left) to set your name and default preferences — surface type, gradient limit, target distance, and average speed per surface.
2. Tap the GPS button to detect your location. Tap the clock to pick a future start time.
3. Set distance/duration, surface, and gradient, then tap **Route berechnen**.
4. Browse generated routes with the prev/next arrows. Tap **Weitere Routen** for additional candidates.
5. Export as GPX or share the route summary.

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── BottomSheet.svelte     # modal sheet with drag-to-close
│   │   ├── DateTimePicker.svelte  # day + time selector
│   │   ├── ElevationChart.svelte  # SVG elevation profile
│   │   ├── InstallPrompt.svelte   # PWA install banner
│   │   └── MapView.svelte         # MapLibre GL route display
│   └── services/
│       ├── routing.ts   # ORS API, wind scoring, loop generation
│       ├── weather.ts   # Open-Meteo hourly forecast lookup
│       ├── gpx.ts       # GPX export with <ele> tags
│       └── optimizer.ts # contextual ride tips
└── routes/
    └── +page.svelte     # single-page app shell
```

## Building

```bash
npm run build
npm run preview   # preview production build locally
```

## Configuration

| Variable | Description |
|---|---|
| `VITE_ORS_API_KEY` | OpenRouteService API key (optional — can be entered in-app) |

User preferences (speed per surface, default distance, surface, gradient) are persisted in `localStorage` under the `tb_settings` key. Active route results survive page refresh via `sessionStorage` (`tb_session`).
