<script lang="ts">
  import { Wind } from 'lucide-svelte';

  const steps = [
    'Wetterdaten werden abgerufen…',
    'Windrichtung wird analysiert…',
    'Optimale Route wird berechnet…',
    'Route wird finalisiert…'
  ];

  let currentStep = $state(0);

  $effect(() => {
    const interval = setInterval(() => {
      currentStep = Math.min(currentStep + 1, steps.length - 1);
    }, 700);
    return () => clearInterval(interval);
  });
</script>

<div class="flex flex-col items-center justify-center min-h-screen bg-mdb-teal px-8">
  <div class="w-16 h-16 bg-mdb-green rounded-mdb-xl flex items-center justify-center mb-8">
    <Wind size={30} color="#001e2b" />
  </div>

  <h2 class="text-xl font-semibold text-mdb-on-dark mb-2">Route wird berechnet</h2>
  <p class="text-mdb-on-dark-muted text-sm text-center mb-10">Windoptimierung läuft…</p>

  <div class="w-full max-w-xs space-y-4">
    {#each steps as step, i}
      <div class="flex items-center gap-3 transition-opacity duration-300" class:opacity-30={i > currentStep}>
        <div class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
          {i < currentStep ? 'bg-mdb-green' : i === currentStep ? 'bg-mdb-green animate-pulse' : 'bg-mdb-teal-mid border border-mdb-hairline-dark'}">
          {#if i < currentStep}
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l2.5 2.5L9 1" stroke="#001e2b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </div>
        <span class="text-sm {i <= currentStep ? 'text-mdb-on-dark font-medium' : 'text-mdb-on-dark-muted'}">{step}</span>
      </div>
    {/each}
  </div>
</div>
