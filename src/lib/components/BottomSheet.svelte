<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  let { open = $bindable(false), title = '', children }: { open: boolean; title?: string; children?: any } = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <button
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm w-full h-full cursor-default"
    onclick={() => open = false}
    aria-label="Schließen"
  ></button>

  <!-- Sheet -->
  <div
    transition:fly={{ y: 400, duration: 380, easing: cubicOut }}
    class="fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] shadow-mdb-3 max-h-[80vh] flex flex-col"
    style="background: rgba(0, 30, 43, 0.93); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding-bottom: max(env(safe-area-inset-bottom), 24px)"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bottom-sheet-title"
  >

    <!-- Handle + close -->
    <div class="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
      <div class="w-8"></div>
      <div class="w-10 h-1 bg-white/40 rounded-full"></div>
      <button onclick={() => open = false} class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20" aria-label="Schließen">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    {#if title}
      <div class="px-5 pb-3 flex-shrink-0 border-b border-white/10">
        <h2 id="bottom-sheet-title" class="font-semibold text-white text-base">{title}</h2>
      </div>
    {/if}

    <div class="overflow-y-auto px-5 py-4">
      {@render children()}
    </div>
  </div>
{/if}
