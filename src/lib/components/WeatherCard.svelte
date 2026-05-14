<script lang="ts">
  import { Sun, Cloud, CloudRain, Wind } from 'lucide-svelte';
  import type { WeatherData } from '$lib/services/weather';

  let { weather }: { weather: WeatherData } = $props();

  const iconMap = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, windy: Wind };
  const labelMap: Record<string, string> = { sunny: 'Sonnig', cloudy: 'Bewölkt', rainy: 'Regen', windy: 'Windig' };
  const colorMap: Record<string, string> = { sunny: '#fa6e39', cloudy: '#5c6c7a', rainy: '#00ed64', windy: '#7b3ff2' };

  const Icon = $derived(iconMap[weather.condition]);
  const label = $derived(labelMap[weather.condition]);
  const color = $derived(colorMap[weather.condition]);
</script>

<div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
  <div class="text-xs font-semibold text-mdb-stone uppercase tracking-wider mb-3">Wetter zur Startzeit</div>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-mdb-lg flex items-center justify-center" style="background: {color}18">
        <Icon size={20} color={color} />
      </div>
      <div>
        <div class="font-semibold text-mdb-ink">{label}</div>
        <div class="text-xs text-mdb-steel">Gefühlt ca. {weather.temperature - 2} °C</div>
      </div>
    </div>
    <div class="text-3xl font-semibold text-mdb-ink">{weather.temperature}°</div>
  </div>
</div>
