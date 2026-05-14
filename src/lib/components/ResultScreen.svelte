<script lang="ts">
  import { ChevronLeft, Download } from 'lucide-svelte';
  import { appState, currentLocation, weatherData, routeResult, routeTips } from '$lib/stores/app';
  import { downloadGPX } from '$lib/services/gpx';
  import MapView from './MapView.svelte';
  import RouteStats from './RouteStats.svelte';
  import WindCard from './WindCard.svelte';
  import WeatherCard from './WeatherCard.svelte';
  import TipsCard from './TipsCard.svelte';

  const route = $derived($routeResult);
  const weather = $derived($weatherData);
  const loc = $derived($currentLocation);
  const tips = $derived($routeTips);

  function handleExport() {
    if (route) {
      const name = `Tour_${new Date().toISOString().slice(0, 10)}`;
      downloadGPX(route, name);
    }
  }
</script>

<div class="flex flex-col min-h-screen bg-mdb-surface">

  <!-- Map -->
  <div class="relative w-full" style="height: 42vh">
    {#if route && loc}
      <MapView coordinates={route.coordinates} origin={loc} />
    {/if}
    <!-- Nav overlay on map -->
    <div class="absolute top-0 left-0 right-0 safe-top flex items-center px-3 pt-3 pb-4 bg-gradient-to-b from-mdb-teal/80 to-transparent">
      <button
        onclick={() => appState.set('planning')}
        class="flex items-center gap-1 text-mdb-green font-medium py-2 pr-4 text-sm"
      >
        <ChevronLeft size={18} />
        Neu planen
      </button>
    </div>
  </div>

  <!-- Cards scroll area -->
  <div class="flex-1 px-4 pt-4 space-y-3 pb-28">
    {#if route}
      <RouteStats {route} />
    {/if}
    {#if weather && route}
      <WindCard {weather} {route} />
      <WeatherCard {weather} />
    {/if}
    {#if tips.length}
      <TipsCard {tips} />
    {/if}
  </div>

  <!-- Sticky export CTA -->
  <div class="fixed bottom-0 left-0 right-0 bg-mdb-teal border-t border-mdb-hairline-dark px-4 pt-3 safe-bottom">
    <button
      onclick={handleExport}
      class="w-full bg-mdb-green text-mdb-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform text-sm"
    >
      <Download size={16} strokeWidth={2.5} />
      Als GPX exportieren
    </button>
  </div>
</div>
