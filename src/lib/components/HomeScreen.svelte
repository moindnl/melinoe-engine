<script lang="ts">
  import { Bike, ChevronRight, MapPin } from 'lucide-svelte';
  import { appState } from '$lib/stores/app';
</script>

<div class="flex flex-col min-h-screen bg-mdb-surface">

  <!-- Hero band — dark teal -->
  <div class="bg-mdb-teal safe-top px-6 pt-10 pb-10">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 bg-mdb-green rounded-mdb-lg flex items-center justify-center">
        <Bike size={20} color="#001e2b" strokeWidth={2.5} />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-mdb-on-dark tracking-tight">Touren Planer</h1>
        <p class="text-sm text-mdb-on-dark-muted">Windoptimierte Rennradrouten</p>
      </div>
    </div>

    <p class="text-2xl font-semibold text-mdb-on-dark leading-snug mb-8">
      Deine optimale Route.<br/>
      <span class="text-mdb-green">Mit dem Wind.</span>
    </p>

    <button
      onclick={() => appState.set('planning')}
      class="w-full bg-mdb-green text-mdb-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform text-sm"
    >
      Route planen
      <ChevronRight size={16} strokeWidth={2.5} />
    </button>
  </div>

  <!-- Content -->
  <div class="px-4 pt-6 flex-1">
    <h2 class="text-xs font-semibold text-mdb-stone uppercase tracking-wider mb-3 px-1">Letzte Touren</h2>

    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline">
      <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div class="w-12 h-12 bg-mdb-surface rounded-mdb-lg flex items-center justify-center mb-4">
          <MapPin size={22} color="#5c6c7a" />
        </div>
        <p class="font-semibold text-mdb-ink mb-1">Noch keine Touren</p>
        <p class="text-sm text-mdb-steel">Plane deine erste windoptimierte Runde</p>
      </div>
    </div>
  </div>

  <div class="safe-bottom" />
</div>
