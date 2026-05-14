<script lang="ts">
  import { Timer, MoveUp, Gauge } from 'lucide-svelte';
  import type { RouteResult } from '$lib/services/routing';

  let { route }: { route: RouteResult } = $props();

  function formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')} h` : `${m} min`;
  }

  const avgSpeed = $derived(Math.round((route.distanceKm / route.durationMin) * 60 * 10) / 10);
</script>

<div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
  <div class="grid grid-cols-3 divide-x divide-mdb-hairline">
    <div class="flex flex-col items-center gap-1 px-2">
      <Gauge size={16} color="#5c6c7a" />
      <span class="text-xl font-semibold text-mdb-ink">{route.distanceKm}</span>
      <span class="text-xs text-mdb-stone">km</span>
    </div>
    <div class="flex flex-col items-center gap-1 px-2">
      <Timer size={16} color="#5c6c7a" />
      <span class="text-xl font-semibold text-mdb-ink">{formatDuration(route.durationMin)}</span>
      <span class="text-xs text-mdb-stone">Dauer</span>
    </div>
    <div class="flex flex-col items-center gap-1 px-2">
      <MoveUp size={16} color="#5c6c7a" />
      <span class="text-xl font-semibold text-mdb-ink">{route.elevationGain}</span>
      <span class="text-xs text-mdb-stone">m Hm</span>
    </div>
  </div>
  <div class="mt-3 pt-3 border-t border-mdb-hairline text-center">
    <span class="text-xs text-mdb-stone">Ø {avgSpeed} km/h</span>
  </div>
</div>
