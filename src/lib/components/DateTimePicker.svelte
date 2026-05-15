<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

  let { value = $bindable(''), open = $bindable(false), onconfirm = () => {} }: { value: string; open: boolean; onconfirm?: () => void } = $props();

  let selected = $state(new Date(value || Date.now()));

  $effect(() => {
    if (open) {
      const d = value ? new Date(value) : new Date();
      d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
      selected = d;
    }
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  function sameDay(a: Date, b: Date) {
    return a.toDateString() === b.toDateString();
  }

  function pickDay(day: Date) {
    const d = new Date(selected);
    d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    selected = d;
  }

  function stepHour(delta: number) {
    const d = new Date(selected);
    d.setHours((d.getHours() + delta + 24) % 24);
    selected = d;
  }

  function stepMinute(delta: number) {
    const d = new Date(selected);
    d.setMinutes((d.getMinutes() + delta + 60) % 60);
    selected = d;
  }

  function confirm() {
    const pad = (n: number) => String(n).padStart(2, '0');
    value = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}T${pad(selected.getHours())}:${pad(selected.getMinutes())}`;
    open = false;
    onconfirm();
  }

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
</script>

<BottomSheet bind:open title="Startzeit">
  <div class="space-y-6">

    <!-- Day chips -->
    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style="scrollbar-width: none">
      {#each days as day}
        <button
          onclick={() => pickDay(day)}
          class="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl border transition-colors min-w-[56px]
            {sameDay(day, selected)
              ? 'bg-mdb-green border-mdb-green'
              : 'bg-white/5 border-white/15 active:bg-white/10'}"
        >
          <span class="text-[10px] font-medium {sameDay(day, selected) ? 'text-mdb-ink' : 'text-white/50'}">
            {dayNames[day.getDay()]}
          </span>
          <span class="text-base font-bold {sameDay(day, selected) ? 'text-mdb-ink' : 'text-white'}">
            {day.getDate()}
          </span>
          <span class="text-[10px] {sameDay(day, selected) ? 'text-mdb-ink/70' : 'text-white/60'}">
            {monthNames[day.getMonth()]}
          </span>
        </button>
      {/each}
    </div>

    <!-- Time stepper -->
    <div class="flex items-center justify-center gap-4">

      <!-- Hour -->
      <div class="flex flex-col items-center gap-2">
        <button
          onclick={() => stepHour(1)}
          class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
          aria-label="Stunde erhöhen"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 10l5-5 5 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="text-5xl font-bold text-white tabular-nums w-20 text-center">
          {String(selected.getHours()).padStart(2, '0')}
        </span>
        <button
          onclick={() => stepHour(-1)}
          class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
          aria-label="Stunde verringern"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <span class="text-4xl font-bold text-white/60 mb-1">:</span>

      <!-- Minute -->
      <div class="flex flex-col items-center gap-2">
        <button
          onclick={() => stepMinute(5)}
          class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
          aria-label="Minute erhöhen"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 10l5-5 5 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="text-5xl font-bold text-white tabular-nums w-20 text-center">
          {String(selected.getMinutes()).padStart(2, '0')}
        </span>
        <button
          onclick={() => stepMinute(-5)}
          class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
          aria-label="Minute verringern"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

    </div>

    <!-- Confirm -->
    <button
      onclick={confirm}
      class="w-full py-3.5 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm"
    >
      Übernehmen
    </button>

  </div>
</BottomSheet>
