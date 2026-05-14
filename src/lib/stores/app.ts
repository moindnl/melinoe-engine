import { writable } from 'svelte/store';
import type { WeatherData } from '$lib/services/weather';
import type { RouteResult } from '$lib/services/routing';

export type AppState = 'home' | 'planning' | 'loading' | 'result';

export interface PlanForm {
  distanceKm: number;
  durationMin: number;
  startTime: string; // ISO string for datetime-local input
}

function defaultStartTime(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  // Format for datetime-local: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

export const appState = writable<AppState>('home');
export const currentLocation = writable<{ lat: number; lon: number } | null>(null);
export const planForm = writable<PlanForm>({
  distanceKm: 60,
  durationMin: 120,
  startTime: defaultStartTime()
});
export const weatherData = writable<WeatherData | null>(null);
export const routeResult = writable<RouteResult | null>(null);
export const routeTips = writable<string[]>([]);
