<script lang="ts">
  import type { ElevationPoint } from '$lib/services/routing';

  let { profile, gain, loss }: {
    profile: ElevationPoint[];
    gain: number;
    loss: number;
  } = $props();

  const W = 320;
  const H = 100;
  const padL = 36;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const minEle = $derived(Math.min(...profile.map(p => p.elevationM)));
  const maxEle = $derived(Math.max(...profile.map(p => p.elevationM)));
  const eleRange = $derived(Math.max(maxEle - minEle, 10));
  const maxDist  = $derived(profile[profile.length - 1]?.distanceKm ?? 1);

  function px(p: ElevationPoint): string {
    const x = padL + (p.distanceKm / maxDist) * chartW;
    const y = padT + chartH - ((p.elevationM - minEle) / eleRange) * chartH;
    return `${x},${y}`;
  }

  const linePath = $derived(
    profile.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p)}`).join(' ')
  );

  const fillPath = $derived(
    `${linePath} L${padL + chartW},${padT + chartH} L${padL},${padT + chartH} Z`
  );

  // Y-axis labels (3 marks)
  const yLabels = $derived([
    { y: padT + chartH,       val: minEle },
    { y: padT + chartH / 2,   val: Math.round(minEle + eleRange / 2) },
    { y: padT,                val: maxEle },
  ]);

  // X-axis labels (4 marks)
  const xLabels = $derived(
    [0, 0.33, 0.66, 1].map(t => ({
      x: padL + t * chartW,
      val: Math.round(maxDist * t * 10) / 10,
    }))
  );
</script>

<div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-semibold text-mdb-stone uppercase tracking-wider">Höhenprofil</span>
    <div class="flex gap-3 text-xs text-mdb-steel">
      <span class="text-mdb-green font-semibold">↑ {gain} m</span>
      <span class="text-mdb-stone">↓ {loss} m</span>
    </div>
  </div>

  <svg
    viewBox="0 0 {W} {H}"
    class="w-full"
    style="height: 100px"
    aria-label="Höhenprofil"
  >
    <defs>
      <linearGradient id="ele-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00ed64" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#00ed64" stop-opacity="0.03" />
      </linearGradient>
    </defs>

    <!-- Grid lines -->
    {#each yLabels as { y }}
      <line x1={padL} y1={y} x2={padL + chartW} y2={y}
        stroke="#e1e5e8" stroke-width="0.5" />
    {/each}

    <!-- Fill -->
    <path d={fillPath} fill="url(#ele-fill)" />

    <!-- Line -->
    <path d={linePath} fill="none" stroke="#00ed64" stroke-width="1.5"
      stroke-linejoin="round" stroke-linecap="round" />

    <!-- Y labels -->
    {#each yLabels as { y, val }}
      <text x={padL - 4} y={y + 3.5} text-anchor="end"
        font-size="8" fill="#7c8c9a" font-family="system-ui">{val}</text>
    {/each}

    <!-- X labels -->
    {#each xLabels as { x, val }}
      <text x={x} y={H - 4} text-anchor="middle"
        font-size="8" fill="#7c8c9a" font-family="system-ui">{val} km</text>
    {/each}
  </svg>
</div>
