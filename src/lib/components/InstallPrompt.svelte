<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import BottomSheet from './BottomSheet.svelte';

  let open = $state(false);
  let isIos = $state(false);
  let deferredPrompt = $state<any>(null);

  const DISMISS_KEY = 'tb_install_dismissed';
  const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  function wasDismissed(): boolean {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    if (v === 'permanent') return true;
    return Date.now() - parseInt(v) < DISMISS_TTL;
  }

  onMount(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;
    if (wasDismissed()) return;

    isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIos) {
      setTimeout(() => open = true, 2000);
    } else {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => open = true, 2000);
      });
    }
  });

  function dismiss() {
    open = false;
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    open = false;
    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, 'permanent');
  }
</script>

{#if isIos}
  <!-- iOS: BottomSheet with manual instructions -->
  <BottomSheet bind:open title="Zum Homescreen hinzufügen">
    <div class="space-y-4">
      <ol class="space-y-3 text-sm text-white/70">
        <li class="flex gap-3 items-start">
          <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">1</span>
          <p>Tippe auf <strong class="text-white">Teilen</strong>
            <svg class="inline mb-0.5 mx-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            in der Safari-Menüleiste.</p>
        </li>
        <li class="flex gap-3 items-start">
          <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">2</span>
          <p>Wähle <strong class="text-white">„Zum Home-Bildschirm"</strong>.</p>
        </li>
        <li class="flex gap-3 items-start">
          <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">3</span>
          <p>Tippe oben rechts auf <strong class="text-white">„Hinzufügen"</strong>.</p>
        </li>
      </ol>
      <button onclick={dismiss} class="w-full py-3 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm">
        Nicht jetzt
      </button>
    </div>
  </BottomSheet>

{:else if open}
  <!-- Android/Chrome: fixed banner above header -->
  <div
    transition:fly={{ y: -48, duration: 300 }}
    class="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-4 bg-mdb-teal border-b border-white/10"
    style="padding-top: env(safe-area-inset-top, 0px); padding-bottom: 10px; min-height: calc(env(safe-area-inset-top, 0px) + 48px)"
  >
    <!-- Icon -->
    <svg viewBox="0 0 32 32" class="w-8 h-8 flex-shrink-0 rounded-lg">
      <rect width="32" height="32" rx="7" fill="#001e2b"/>
      <line x1="3.5" y1="16" x2="28.5" y2="16" stroke="#00ed64" stroke-width="0.6" stroke-opacity="0.5"/>
      <path d="M 3.5 16 C 5.5 13 7.75 10 9.75 10 C 11.75 10 14 13 16 16 C 18 19 20.25 22 22.25 22 C 24.25 22 26.5 19 28.5 16" fill="none" stroke="#00ed64" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <!-- Label -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-white leading-tight">souplesse Ultra</p>
      <p class="text-xs text-white/50 leading-tight">Als App installieren</p>
    </div>

    <!-- Install button -->
    <button
      onclick={install}
      class="flex-shrink-0 px-4 py-1.5 rounded-full bg-mdb-green text-mdb-ink text-xs font-bold active:opacity-70 transition-opacity"
    >
      Installieren
    </button>

    <!-- Dismiss -->
    <button
      onclick={dismiss}
      aria-label="Schließen"
      class="flex-shrink-0 w-7 h-7 flex items-center justify-center text-white/40 active:text-white/80 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
      </svg>
    </button>
  </div>
{/if}
