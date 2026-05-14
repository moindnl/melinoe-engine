# melinoe-engine

> **TrailBlazer Ultra** — wind-optimised road cycling route planner

Mobile-first PWA built with SvelteKit + Svelte 5, MapLibre GL, OpenRouteService, and Open-Meteo.

## Features

- GPS-based location detection
- Wind-optimised round-trip route generation (4 candidate directions, best wind score wins)
- Real weather data at start time via Open-Meteo
- Elevation profile chart
- GPX export (Garmin, Wahoo, Komoot compatible)
- Custom date/time picker
- User personalisation (name + greeting)
- Night sky & rain easter eggs
- PWA / Add to Home Screen

## Developing

```sh
pnpm install
pnpm dev
```

## Building

```sh
pnpm build
```

## API Key

Routing uses [OpenRouteService](https://openrouteservice.org). Enter your free API key in the app UI — stored in `localStorage`. Without a key the app falls back to mock routes.

Copy `.env.example` to `.env` to set the key at build time instead:

```sh
cp .env.example .env
# edit VITE_ORS_API_KEY=your_key_here
```
