<script lang="ts">
  import type { WeatherData } from '$lib/services/weather';
  import { windDirectionLabel } from '$lib/services/weather';
  import type { RouteResult } from '$lib/services/routing';

  let { weather, route }: { weather: WeatherData; route: RouteResult } = $props();

  const arrowRotation = $derived((weather.windDirection + 180) % 360);
  const label = $derived(windDirectionLabel(weather.windDirection));
  const scoreColor = $derived(
    route.windScore >= 60 ? '#00ed64' : route.windScore >= 40 ? '#fa6e39' : '#e74c3c'
  );
</script>

<div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
  <div class="text-xs font-semibold text-mdb-stone uppercase tracking-wider mb-3">Wind</div>
  <div class="flex items-center gap-4">
    <!-- Compass -->
    <div class="w-14 h-14 rounded-full bg-mdb-surface border border-mdb-hairline flex items-center justify-center flex-shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <text x="26" y="10" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">N</text>
        <text x="26" y="48" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">S</text>
        <text x="8"  y="29" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">W</text>
        <text x="45" y="29" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">O</text>
        <g transform="rotate({arrowRotation}, 26, 26)">
          <polygon points="26,13 29,31 26,27 23,31" fill="#00ed64" />
          <polygon points="26,39 29,21 26,25 23,21" fill="#1c2d38" />
        </g>
      </svg>
    </div>

    <div class="flex-1 min-w-0">
      <div class="font-semibold text-mdb-ink">{label}wind · {weather.windSpeed} km/h</div>
      <div class="text-sm text-mdb-steel mt-0.5">{route.windScore}% Rückenwind auf Rückfahrt</div>
      <div class="mt-2 h-1.5 bg-mdb-surface rounded-full overflow-hidden border border-mdb-hairline">
        <div
          class="h-full rounded-full transition-all duration-700"
          style="width: {route.windScore}%; background: {scoreColor}"
        />
      </div>
    </div>
  </div>
</div>
