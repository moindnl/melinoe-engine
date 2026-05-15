<script lang="ts">
  import { onMount } from 'svelte';
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

<BottomSheet bind:open title="Zum Homescreen hinzufügen">
  <div class="space-y-4">
    {#if isIos}
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
      <button
        onclick={dismiss}
        class="w-full py-3 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm"
      >
        Nicht jetzt
      </button>
    {:else}
      <button
        onclick={install}
        class="w-full py-3 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm"
      >
        Zum Homescreen hinzufügen
      </button>
      <button
        onclick={dismiss}
        class="w-full py-2 text-white/50 text-sm"
      >
        Nicht jetzt
      </button>
    {/if}
  </div>
</BottomSheet>
