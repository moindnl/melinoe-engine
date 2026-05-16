# souplesse Ultra

*Le vent tourne.* — Wind-optimised road cycling route planner, built as a mobile-first PWA.

## About

souplesse Ultra generates GPS round-trip cycling routes optimised for tailwind on the return leg. It fetches hourly weather forecasts from Open-Meteo for your planned start time, scores four candidate loop directions by wind alignment, and returns the best match via OpenRouteService. Each result includes an elevation profile, nutrition estimate (water, gels, bars, calories), and contextual ride tips. Routes export as GPX files compatible with Garmin, Wahoo, and Komoot.

The app is free, runs entirely in the browser, and works offline after first load as a PWA.

**Production:** [souplesse-ultra.vercel.app](https://souplesse-ultra.vercel.app)

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
- pnpm (or npm)
- A free [OpenRouteService API key](https://openrouteservice.org/dev/#/login)

### Installation

```bash
git clone https://github.com/moindnl/melinoe-engine.git
cd melinoe-engine
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## API Key

The ORS routing key can be provided two ways:

**In-app (recommended):** Enter the key directly in the app — stored in `localStorage`.

**Build-time (for deployment):** Create `.env`:

```
VITE_ORS_API_KEY=your_key_here
```

Without a key the app returns mock routes for UI testing.

## Usage

1. Tap the avatar (top right) to set your name and default preferences — surface type, gradient limit, target distance, and speed per surface.
2. Tap **GPS** to detect your location, or search an address. Tap the clock to pick a future start time.
3. Set distance or duration, surface type, and max gradient.
4. Tap **Route berechnen**. The app fetches live weather, scores four loop candidates, and returns the best wind-optimised route.
5. Browse candidates with the prev/next arrows. Tap **Weitere Routen** for additional options.
6. Review the elevation profile and nutrition estimate in the results.
7. Export as GPX or share the route summary.

## Features

- **Wind optimisation** — scores candidate loops by tailwind percentage on the return leg
- **Nutrition estimates** — water, gels, bars, and calorie targets per route
- **GPX export** — with elevation data, compatible with major cycling devices
- **Profile system** — persisted name, speed, surface, and gradient defaults with avatar indicator
- **PWA** — installable on iOS and Android, works offline after first load
- **OG image** — branded share card for social and messaging apps

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
scripts/
├── gen-icons.mjs        # generates PNG icons + OG image from SVGs
└── push-status.sh       # polls Vercel deployment status after push
static/
├── icon.svg             # 512×512 app icon (sine wave, liquid glass)
├── favicon.svg          # 32×32 favicon
└── og-image.png         # 1200×630 social share card
```

## Building

```bash
pnpm build
pnpm preview   # preview production build locally
```

## Icon Generation

After editing `static/icon.svg` or `static/og-image.svg`, regenerate PNGs:

```bash
node scripts/gen-icons.mjs
```

Requires `sharp` (already in devDependencies).

## Configuration

| Variable | Description |
|---|---|
| `VITE_ORS_API_KEY` | OpenRouteService API key (optional — can be entered in-app) |

User preferences are persisted in `localStorage` (`tb_settings`). Active session state survives page refresh via `sessionStorage` (`tb_session`).
