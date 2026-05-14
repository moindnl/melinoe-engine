<script lang="ts">
  import { ChevronLeft, Navigation, Loader } from 'lucide-svelte';
  import { appState, planForm, currentLocation, weatherData, routeResult, routeTips } from '$lib/stores/app';
  import { fetchWeather } from '$lib/services/weather';
  import { generateOptimalLoop } from '$lib/services/routing';
  import { generateRouteTips } from '$lib/services/optimizer';
  import { get } from 'svelte/store';

  let locating = $state(false);
  let locError = $state('');

  function formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')} h` : `${m} min`;
  }

  async function locateMe() {
    locating = true;
    locError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      currentLocation.set({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch {
      locError = 'Standort nicht verfügbar. Bitte GPS aktivieren.';
    } finally {
      locating = false;
    }
  }

  async function calculate() {
    const loc = get(currentLocation);
    if (!loc) {
      locError = 'Bitte zuerst Standort bestimmen.';
      return;
    }
    appState.set('loading');

    try {
      const form = get(planForm);
      const startTime = new Date(form.startTime);
      const weather = await fetchWeather(loc.lat, loc.lon, startTime);
      const route = await generateOptimalLoop(loc, form.distanceKm, form.durationMin, weather.windDirection, weather.windSpeed);

      weatherData.set(weather);
      routeResult.set(route);
      routeTips.set(generateRouteTips(weather, route));
      appState.set('result');
    } catch {
      appState.set('planning');
    }
  }
</script>

<div class="flex flex-col min-h-screen bg-mdb-surface">

  <!-- Nav bar -->
  <div class="bg-mdb-teal safe-top px-4 pt-10 pb-4 flex items-center">
    <button
      onclick={() => appState.set('home')}
      class="flex items-center gap-1 text-mdb-green font-medium py-1 pr-4 text-sm"
    >
      <ChevronLeft size={18} />
      Zurück
    </button>
    <h1 class="text-mdb-on-dark font-semibold flex-1 text-center pr-16">Route planen</h1>
  </div>

  <!-- Cards -->
  <div class="px-4 pt-5 space-y-3 flex-1">

    <!-- Location -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <label class="text-xs font-semibold text-mdb-stone uppercase tracking-wider mb-3 block">Startpunkt</label>
      {#if $currentLocation}
        <div class="flex items-center gap-2 text-mdb-green-dark mb-3">
          <Navigation size={14} />
          <span class="text-sm font-medium">
            {$currentLocation.lat.toFixed(4)}°, {$currentLocation.lon.toFixed(4)}°
          </span>
        </div>
      {/if}
      <button
        onclick={locateMe}
        disabled={locating}
        class="w-full flex items-center justify-center gap-2 border border-mdb-hairline-strong text-mdb-ink rounded-full py-2.5 text-sm font-semibold active:bg-mdb-surface transition-colors disabled:opacity-50"
      >
        {#if locating}
          <Loader size={15} class="animate-spin" />
          Standort wird ermittelt…
        {:else}
          <Navigation size={15} />
          {$currentLocation ? 'Standort aktualisieren' : 'Standort ermitteln'}
        {/if}
      </button>
      {#if locError}
        <p class="text-xs text-ios-red mt-2">{locError}</p>
      {/if}
    </div>

    <!-- Distance -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="flex justify-between items-baseline mb-3">
        <label class="text-xs font-semibold text-mdb-stone uppercase tracking-wider">Distanz</label>
        <span class="text-2xl font-semibold text-mdb-ink">{$planForm.distanceKm}<span class="text-base font-normal text-mdb-steel ml-1">km</span></span>
      </div>
      <input type="range" min="20" max="200" step="5" bind:value={$planForm.distanceKm} class="w-full" />
      <div class="flex justify-between text-xs text-mdb-muted mt-1">
        <span>20 km</span><span>200 km</span>
      </div>
    </div>

    <!-- Duration -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="flex justify-between items-baseline mb-3">
        <label class="text-xs font-semibold text-mdb-stone uppercase tracking-wider">Dauer</label>
        <span class="text-2xl font-semibold text-mdb-ink">{formatDuration($planForm.durationMin)}</span>
      </div>
      <input type="range" min="30" max="360" step="15" bind:value={$planForm.durationMin} class="w-full" />
      <div class="flex justify-between text-xs text-mdb-muted mt-1">
        <span>30 min</span><span>6 h</span>
      </div>
    </div>

    <!-- Start time -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <label class="text-xs font-semibold text-mdb-stone uppercase tracking-wider mb-3 block">Startzeit</label>
      <input
        type="datetime-local"
        bind:value={$planForm.startTime}
        class="w-full text-mdb-ink font-medium text-base border-0 outline-none bg-transparent"
      />
    </div>

  </div>

  <!-- CTA -->
  <div class="px-4 mt-5 safe-bottom">
    <button
      onclick={calculate}
      class="w-full bg-mdb-green text-mdb-ink font-semibold rounded-full py-4 text-sm active:scale-[0.97] transition-transform"
    >
      Route berechnen
    </button>
  </div>
</div>
