<script lang="ts">
  import { Lightbulb } from 'lucide-svelte';
  let { tips }: { tips: string[] } = $props();
</script>

<div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
  <div class="flex items-center gap-2 mb-3">
    <Lightbulb size={13} color="#fa6e39" />
    <span class="text-xs font-semibold text-mdb-stone uppercase tracking-wider">Tipps für diese Tour</span>
  </div>
  <ul class="space-y-3">
    {#each tips as tip, i}
      <li class="flex gap-3">
        <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold mt-0.5">
          {i + 1}
        </span>
        <p class="text-sm text-mdb-slate leading-snug">{tip}</p>
      </li>
    {/each}
  </ul>
</div>
