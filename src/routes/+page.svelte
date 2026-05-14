<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Navigation, Loader, Wind, Download,
    Timer, MoveUp, Gauge, Lightbulb, Sun, Cloud, CloudRain, Clock, BookOpen, Droplet
  } from 'lucide-svelte';
  import { fetchWeather, windDirectionLabel, type WeatherData } from '$lib/services/weather';
  import { generateOptimalLoop, surfaceLabels, gradientLabels, gradientSubLabels, getOrsApiKey, saveOrsApiKey, type RouteResult, type SurfaceType, type GradientLevel } from '$lib/services/routing';
  import { generateRouteTips } from '$lib/services/optimizer';
  import { downloadGPX } from '$lib/services/gpx';
  import MapView from '$lib/components/MapView.svelte';
  import ElevationChart from '$lib/components/ElevationChart.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';
  import DateTimePicker from '$lib/components/DateTimePicker.svelte';

  // --- Build ---
  const VERSION = '1.0';
  const BUILD_NAME = 'Eddy';
  const RIDERS: Record<string, { nickname: string; nationality: string; years: string; specialty: string; bio: string; wins: string[] }> = {
    'Eddy': {
      nickname:    'Der Kannibale',
      nationality: '🇧🇪 Belgien',
      years:       '1965 – 1978',
      specialty:   'Allrounder',
      bio:         'Eddy Merckx gilt als der größte Radfahrer aller Zeiten. Er dominierte den Sport in einer Weise, die kein anderer Fahrer je wiederholt hat — 525 Karrieresiege, Siege auf allen Terrains, in allen Klassikern und allen Grand Tours.',
      wins: [
        '5× Tour de France (1969–72, 1974)',
        '5× Giro d\'Italia (1968, 1970, 1972–74)',
        '1× Vuelta a España (1973)',
        '3× Lüttich–Bastogne–Lüttich',
        '3× Mailand–San Remo',
        '2× Paris–Roubaix',
        '2× Flandern-Rundfahrt',
        '2× Weltmeister (1971, 1974)',
        'Stundenweltrekord (1972)',
      ],
    },
  };

  const CHANGELOG: string[] = [
    'Wind-optimierte Rundenplanung — 4 Kandidaten, bester Rückenwind gewinnt.',
    'Echtzeit-Wetterdaten via Open-Meteo für die gewählte Startzeit.',
    'Höhenprofil-Chart mit Aufstieg und Abstieg.',
    'GPX-Export direkt in Garmin, Wahoo oder Komoot.',
    'Benutzerdefinierter Datum- & Uhrzeitpicker.',
    'Personalisierung mit Name und Begrüßung.',
    'Nacht-Theme (23–5 Uhr) und Regen-Easter-Egg.',
    'PWA — zum Homescreen hinzufügbar.',
  ];

  // --- State ---
  let distanceKm = $state(60);
  let durationMin = $state(120);
  function nowString() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  let startTime = $state(nowString());
  let surface = $state<SurfaceType>('road');
  let gradient = $state<GradientLevel>('any');
  let location = $state<{ lat: number; lon: number } | null>(null);
  let locating = $state(false);
  let locError = $state('');
  let loading = $state(false);
  let calcError = $state('');
  let weather = $state<WeatherData | null>(null);
  let route = $state<RouteResult | null>(null);
  let tips = $state<string[]>([]);
  let timePicked = $state(false);
  let timePickerOpen = $state(false);
  let orsKey = $state('');
  let hasOrsKey = $state(false);
  let anleitungOpen = $state(false);
  let impressumOpen = $state(false);
  let changelogOpen = $state(false);
  let riderOpen = $state(false);
  let showWhatsNew = $state(false);
  let profileOpen = $state(false);
  let nameInputOpen = $state(false);
  let userName = $state('');
  let nameInput = $state('');

  function greeting() {
    const h = new Date().getHours();
    if (h >= 5  && h < 11) return 'Guten Morgen';
    if (h >= 11 && h < 17) return 'Guten Tag';
    if (h >= 17 && h < 22) return 'Guten Abend';
    return 'Hallo';
  }

  function dismissChangelog() {
    changelogOpen = false;
    showWhatsNew = false;
    localStorage.setItem('tb-seen-build', BUILD_NAME);
  }

  onMount(() => {
    const saved = localStorage.getItem('tb_user_name');
    if (saved) userName = saved;
    if (localStorage.getItem('tb-seen-build') !== BUILD_NAME) showWhatsNew = true;
  });

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    userName = n;
    localStorage.setItem('tb_user_name', n);
    nameInput = '';
    nameInputOpen = false;
    profileOpen = false;
  }

  $effect(() => {
    hasOrsKey = !!getOrsApiKey();
  });


  function submitKey() {
    if (orsKey.trim()) {
      saveOrsApiKey(orsKey.trim());
      hasOrsKey = true;
      orsKey = '';
    }
  }

  $effect(() => {
    if (timePicked) return;
    startTime = nowString();
    const t = setInterval(() => { startTime = nowString(); }, 60_000);
    return () => clearInterval(t);
  });

  function fmt(min: number) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')} h` : `${m} min`;
  }

  async function locateMe() {
    locating = true; locError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      locError = 'GPS nicht verfügbar.';
    } finally {
      locating = false;
    }
  }

  async function calculate() {
    if (!location) { locError = 'Bitte zuerst Standort ermitteln.'; return; }
    loading = true; route = null; weather = null; tips = []; calcError = '';
    try {
      const w = await fetchWeather(location.lat, location.lon, new Date(startTime));
      const r = await generateOptimalLoop(location, distanceKm, durationMin, w.windDirection, w.windSpeed, surface, gradient);
      weather = w; route = r; tips = generateRouteTips(w, r);
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      calcError = e instanceof Error ? e.message : 'Unbekannter Fehler.';
      console.error('calculate:', e);
    } finally {
      loading = false;
    }
  }

  const conditionIcon = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, windy: Wind };
  const conditionLabel: Record<string, string> = { sunny: 'Sonnig', cloudy: 'Bewölkt', rainy: 'Regen', windy: 'Windig' };
  const conditionColor: Record<string, string> = { sunny: '#fa6e39', cloudy: '#5c6c7a', rainy: '#00ed64', windy: '#7b3ff2' };

  // loading steps animation
  const steps = ['Wetterdaten…', 'Windrichtung…', 'Route berechnet…', 'Finalisieren…'];
  let stepIdx = $state(0);
  $effect(() => {
    if (!loading) { stepIdx = 0; return; }
    const t = setInterval(() => { stepIdx = Math.min(stepIdx + 1, steps.length - 1); }, 700);
    return () => clearInterval(t);
  });

  const avgSpeed = $derived(route ? Math.round((route.distanceKm / route.durationMin) * 60 * 10) / 10 : 0);
  const arrowRot = $derived(weather ? (weather.windDirection + 180) % 360 : 0);
  const isNight = $derived((() => { const h = new Date().getHours(); return h >= 23 || h < 5; })());

  const stars = [
    { top: '12%', left: '7%',  size: 2, dur: '2.1s', delay: '0s'    },
    { top: '28%', left: '18%', size: 1, dur: '3.0s', delay: '0.4s'  },
    { top: '8%',  left: '33%', size: 2, dur: '2.4s', delay: '0.9s'  },
    { top: '40%', left: '45%', size: 1, dur: '1.8s', delay: '0.2s'  },
    { top: '15%', left: '58%', size: 3, dur: '2.7s', delay: '0.6s'  },
    { top: '35%', left: '70%', size: 1, dur: '3.2s', delay: '1.1s'  },
    { top: '20%', left: '82%', size: 2, dur: '2.0s', delay: '0.3s'  },
    { top: '50%', left: '91%', size: 1, dur: '2.5s', delay: '0.8s'  },
    { top: '5%',  left: '50%', size: 2, dur: '1.9s', delay: '1.4s'  },
    { top: '45%', left: '25%', size: 1, dur: '3.5s', delay: '0.7s'  },
    { top: '30%', left: '60%', size: 2, dur: '2.2s', delay: '0.5s'  },
    { top: '18%', left: '75%', size: 1, dur: '2.8s', delay: '1.2s'  },
  ];

  const scoreColor = $derived(route
    ? route.windScore >= 60 ? '#00ed64' : route.windScore >= 40 ? '#fa6e39' : '#e74c3c'
    : '#00ed64');
</script>

<svelte:head><title>TrailBlazer Ultra</title></svelte:head>

<div class="min-h-screen bg-mdb-surface font-sans">

  <!-- ── Header ── -->
  <div class="px-5 pb-8 relative overflow-hidden transition-colors duration-1000"
    style="padding-top: calc(env(safe-area-inset-top) + 4rem); background: {isNight ? 'linear-gradient(160deg, #020812 0%, #050d1f 60%, #001e2b 100%)' : '#001e2b'}">

    <!-- Night sky easter egg -->
    {#if isNight}
      {#each stars as s}
        <span class="star" style="top:{s.top}; left:{s.left}; width:{s.size}px; height:{s.size}px; animation-duration:{s.dur}; animation-delay:{s.delay}"></span>
      {/each}
    {/if}

    <!-- Rain easter egg -->
    {#if weather?.condition === 'rainy'}
      {#each [
        { left: '8%',  delay: '0s',    size: 12 },
        { left: '22%', delay: '0.3s',  size: 10 },
        { left: '38%', delay: '0.7s',  size: 14 },
        { left: '54%', delay: '0.15s', size: 11 },
        { left: '68%', delay: '0.5s',  size: 13 },
        { left: '82%', delay: '0.9s',  size: 10 },
        { left: '92%', delay: '0.2s',  size: 12 },
      ] as drop}
        <span class="rain-drop" style="left:{drop.left}; top:0; animation-delay:{drop.delay}; color:#00ed64; opacity:0.5">
          <Droplet size={drop.size} fill="#00ed64" />
        </span>
      {/each}
    {/if}

    <!-- Profile avatar -->
    <button
      onclick={() => profileOpen = true}
      aria-label="Profil"
      class="absolute right-5 top-0 w-9 h-9 rounded-full bg-mdb-green flex items-center justify-center active:opacity-70 transition-opacity"
      style="top: calc(env(safe-area-inset-top) + 1rem)"
    >
      {#if userName}
        <span class="text-sm font-bold text-mdb-ink">{userName[0].toUpperCase()}</span>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001e2b" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      {/if}
    </button>

    <!-- Title -->
    <div class="flex items-center justify-center gap-3">
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true" role="presentation"
        style="overflow: visible"
        class={isNight ? 'bolt-glow' : ''}
      >
        <rect x="4" y="4" width="32" height="32" rx="10" fill="#00ed64" fill-opacity="0.12" stroke="#00ed64" stroke-width="1.5"/>
        <path d="M22 8 L14 21 H20 L18 32 L26 19 H20 L22 8Z" fill="white"/>
        <path d="M22 8 L14 21 H20 L18 32 L26 19 H20 L22 8Z" fill="#00ed64" fill-opacity="0.3"/>
      </svg>
      <h1 class="text-3xl font-bold text-white tracking-tight">TrailBlazer <span class="text-mdb-green">Ultra</span></h1>
    </div>

    <!-- Greeting -->
    {#if userName}
      <p class="text-center text-sm text-white/60 mt-2">
        {greeting()}, <span class="text-white font-medium">{userName}</span>
      </p>
    {/if}

    <!-- What's new -->
    {#if showWhatsNew}
      <div class="flex justify-center mt-3">
        <button
          onclick={() => changelogOpen = true}
          class="inline-flex items-center gap-1.5 text-xs text-mdb-green border border-mdb-green/30 bg-mdb-green/10 rounded-full px-3 py-1 active:opacity-70 transition-opacity"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-mdb-green animate-pulse flex-shrink-0"></span>
          Neu in v{VERSION} · {BUILD_NAME}
        </button>
      </div>
    {/if}

  </div>

  <div class="px-4 py-5 space-y-3 max-w-lg mx-auto">

    <!-- ── Standort + Startzeit ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline overflow-hidden">
      <div class="flex items-center">

        <!-- GPS area -->
        <button
          onclick={locateMe}
          disabled={locating}
          aria-label="Standort ermitteln"
          class="flex-1 flex items-center gap-3 px-4 py-3 active:bg-mdb-surface transition-colors disabled:opacity-40 min-w-0"
        >
          <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors
            {location ? 'bg-mdb-surface-feature border-mdb-green' : 'bg-mdb-surface border-mdb-hairline-strong'}">
            {#if locating}
              <Loader size={16} color={location ? '#00684a' : '#3d4f5b'} class="animate-spin" />
            {:else}
              <Navigation size={16} color={location ? '#00684a' : '#3d4f5b'} />
            {/if}
          </div>
          <div class="text-left min-w-0">
            {#if locating}
              <p class="text-xs text-mdb-steel">Wird ermittelt…</p>
            {:else if location}
              <p class="text-xs font-medium text-mdb-green-dark tabular-nums truncate">
                {location.lat.toFixed(5)}°
              </p>
              <p class="text-xs font-medium text-mdb-green-dark tabular-nums truncate">
                {location.lon.toFixed(5)}°
              </p>
            {:else if locError}
              <p class="text-xs text-red-500">{locError}</p>
            {:else}
              <p class="text-xs text-mdb-steel">Kein Standort</p>
            {/if}
          </div>
        </button>

        <!-- Divider -->
        <div class="w-px self-stretch bg-mdb-hairline flex-shrink-0"></div>

        <!-- Time area -->
        <button
          onclick={() => timePickerOpen = true}
          aria-label="Startzeit auswählen"
          class="flex-1 flex items-center gap-3 px-4 py-3 active:bg-mdb-surface transition-colors min-w-0"
        >
          <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors
            {timePicked ? 'bg-mdb-surface-feature border-mdb-green' : 'bg-mdb-surface border-mdb-hairline-strong'}">
            <Clock size={16} color={timePicked ? '#00684a' : '#3d4f5b'} />
          </div>
          <div class="text-left">
            <p class="text-xs font-semibold text-mdb-ink tabular-nums">
              {new Date(startTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p class="text-[10px] text-mdb-steel">
              {new Date(startTime).toLocaleDateString('de', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </button>

      </div>
    </div>

    <!-- ── Distanz ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="flex justify-between items-baseline mb-3">
        <span class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Distanz</span>
        <span class="text-2xl font-semibold text-mdb-ink">{distanceKm}<span class="text-sm font-normal text-mdb-steel ml-1">km</span></span>
      </div>
      <input type="range" min="20" max="200" step="5" bind:value={distanceKm} class="w-full" aria-label="Distanz in Kilometern" />
      <div class="flex justify-between text-xs text-mdb-steel mt-1"><span>20 km</span><span>200 km</span></div>
    </div>

    <!-- ── Dauer ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="flex justify-between items-baseline mb-3">
        <span class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Dauer</span>
        <span class="text-2xl font-semibold text-mdb-ink">{fmt(durationMin)}</span>
      </div>
      <input type="range" min="30" max="360" step="15" bind:value={durationMin} class="w-full" aria-label="Dauer in Minuten" />
      <div class="flex justify-between text-xs text-mdb-steel mt-1"><span>30 min</span><span>6 h</span></div>
    </div>

    <!-- ── Untergrund ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider mb-3">Untergrund</div>
      <div class="grid grid-cols-3 gap-2">
        {#each (['road', 'mixed', 'gravel'] as SurfaceType[]) as s}
          {#key surface === s}
            <button
              onclick={() => surface = s}
              class="py-2.5 px-1 rounded-full text-sm font-semibold border transition-colors
                {surface === s
                  ? 'bg-mdb-green text-mdb-ink border-mdb-green pill-active'
                  : 'bg-transparent text-mdb-slate border-mdb-hairline-strong'}"
            >
              {surfaceLabels[s]}
            </button>
          {/key}
        {/each}
      </div>
    </div>

    <!-- ── Steigung ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider mb-3">Max. Steigung</div>
      <div class="grid grid-cols-4 gap-1.5">
        {#each (['flat', 'moderate', 'hilly', 'any'] as GradientLevel[]) as g}
          {#key gradient === g}
            <button
              onclick={() => gradient = g}
              class="py-2 px-1 rounded-full text-center border transition-colors
                {gradient === g
                  ? 'bg-mdb-green text-mdb-ink border-mdb-green pill-active'
                  : 'bg-transparent text-mdb-slate border-mdb-hairline-strong'}"
            >
              <div class="text-xs font-semibold leading-tight">{gradientLabels[g]}</div>
              <div class="text-[10px] leading-tight {gradient === g ? 'text-mdb-ink/70' : 'text-mdb-slate'}">{gradientSubLabels[g]}</div>
            </button>
          {/key}
        {/each}
      </div>
    </div>

    <!-- ── ORS API Key ── -->
    {#if !hasOrsKey}
      <div class="bg-mdb-teal rounded-mdb-lg p-4 border border-mdb-hairline-dark">
        <div class="text-xs font-semibold text-mdb-on-dark-muted uppercase tracking-wider mb-1">OpenRouteService API-Key</div>
        <p class="text-xs text-mdb-on-dark-muted mb-3">
          Ohne Key: Mock-Routen. Mit Key: echte Cycling-Routen.<br/>
          Kostenlos registrieren auf <span class="text-mdb-green">openrouteservice.org</span>
        </p>
        <div class="flex gap-2">
          <input
            type="password"
            bind:value={orsKey}
            placeholder="5a2d...f8e1"
            class="flex-1 bg-mdb-teal-mid border border-mdb-hairline-dark rounded-mdb-md px-3 py-2 text-sm text-white placeholder-mdb-on-dark-muted outline-none focus:border-mdb-green"
          />
          <button
            onclick={submitKey}
            disabled={!orsKey.trim()}
            class="bg-mdb-green text-mdb-ink font-semibold rounded-mdb-md px-4 py-2 text-sm disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>
    {/if}

    <!-- ── CTA ── -->
    <button
      onclick={calculate}
      disabled={loading}
      class="w-full bg-mdb-green text-mdb-ink font-semibold rounded-full py-4 text-sm active:scale-[0.97] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {#if loading}
        <Loader size={15} class="animate-spin" />Wird berechnet…
      {:else if distanceKm === 200 && gradient === 'any'}
        <Wind size={15} />Tadej? Bist du es?
      {:else}
        <Wind size={15} />Route berechnen
      {/if}
    </button>

    {#if calcError}
      <div class="bg-red-50 border border-red-200 rounded-mdb-lg px-4 py-3 text-xs text-red-700">{calcError}</div>
    {/if}

    <!-- ── Loading Steps ── -->
    {#if loading}
      <div class="bg-mdb-teal rounded-mdb-lg p-5 space-y-3">
        {#each steps as step, i}
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
              {i < stepIdx ? 'bg-mdb-green' : i === stepIdx ? 'bg-mdb-green animate-pulse' : 'bg-mdb-teal-mid border border-mdb-hairline-dark'}">
              {#if i < stepIdx}
                <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3l1.8 2L7 1" stroke="#001e2b" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
              {/if}
            </div>
            <span class="text-sm {i < stepIdx ? 'text-mdb-on-dark-muted' : i === stepIdx ? 'text-white font-medium' : 'text-mdb-on-dark-muted/60'}">{step}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Results ── -->
    {#if route && weather}
      <div id="results" class="space-y-3 pt-1">

        <!-- Map -->
        {#if location}
          <div class="result-card rounded-mdb-lg overflow-hidden border border-mdb-hairline" style="height: 42vw; min-height: 200px; max-height: 300px; animation-delay: 0ms">
            <MapView coordinates={route.coordinates} origin={location} lineColor="#00ed64" />
          </div>
        {/if}

        <!-- Stats -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 80ms">
          <div class="grid grid-cols-3 divide-x divide-mdb-hairline">
            <div class="flex flex-col items-center gap-1 px-2">
              <Gauge size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{route.distanceKm}</span>
              <span class="text-xs text-mdb-steel">km</span>
            </div>
            <div class="flex flex-col items-center gap-1 px-2">
              <Timer size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{fmt(route.durationMin)}</span>
              <span class="text-xs text-mdb-steel">Dauer</span>
            </div>
            <div class="flex flex-col items-center gap-1 px-2">
              <MoveUp size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{route.elevationGain}</span>
              <span class="text-xs text-mdb-steel">m Hm</span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-mdb-hairline text-center">
            <span class="text-xs text-mdb-steel">Ø {avgSpeed} km/h</span>
          </div>
        </div>

        <!-- Elevation Chart -->
        {#if route.elevationProfile.length > 1}
          <ElevationChart
            profile={route.elevationProfile}
            gain={route.elevationGain}
            loss={route.elevationLoss}
          />
        {/if}

        <!-- Wind -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 160ms">
          <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider mb-3">Wind</div>
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-mdb-surface border border-mdb-hairline flex items-center justify-center flex-shrink-0">
              <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Windrichtungskompass" role="img">
                <text x="26" y="10" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">N</text>
                <text x="26" y="48" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">S</text>
                <text x="8"  y="29" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">W</text>
                <text x="45" y="29" text-anchor="middle" font-size="7" fill="#7c8c9a" font-family="system-ui" font-weight="600">O</text>
                <g transform="rotate({arrowRot}, 26, 26)">
                  <polygon points="26,13 29,31 26,27 23,31" fill="#00ed64" />
                  <polygon points="26,39 29,21 26,25 23,21" fill="#1c2d38" />
                </g>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-mdb-ink">{windDirectionLabel(weather.windDirection)}wind · {weather.windSpeed} km/h</div>
              <div class="text-sm text-mdb-steel mt-0.5">{route.windScore}% Rückenwind auf Rückfahrt</div>
              <div class="mt-2 h-1.5 bg-mdb-surface rounded-full overflow-hidden border border-mdb-hairline">
                <div class="h-full rounded-full transition-all duration-700" style="width:{route.windScore}%;background:{scoreColor}"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weather -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 240ms">
          <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider mb-3">Wetter zur Startzeit</div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-mdb-lg flex items-center justify-center" style="background:{conditionColor[weather.condition]}18">
                {#if weather.condition === 'sunny'}<Sun size={20} color={conditionColor.sunny} />
                {:else if weather.condition === 'cloudy'}<Cloud size={20} color={conditionColor.cloudy} />
                {:else if weather.condition === 'rainy'}<CloudRain size={20} color={conditionColor.rainy} />
                {:else}<Wind size={20} color={conditionColor.windy} />
                {/if}
              </div>
              <div>
                <div class="font-semibold text-mdb-ink">{conditionLabel[weather.condition]}</div>
                <div class="text-xs text-mdb-steel">Gefühlt ca. {weather.temperature - 2} °C</div>
              </div>
            </div>
            <div class="text-3xl font-semibold text-mdb-ink">{weather.temperature}°</div>
          </div>
        </div>

        <!-- Tips -->
        {#if tips.length}
          <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 320ms">
            <div class="flex items-center gap-2 mb-3">
              <Lightbulb size={13} color="#fa6e39" />
              <span class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Tipps für diese Tour</span>
            </div>
            <ul class="space-y-3">
              {#each tips as tip, i}
                <li class="flex gap-3">
                  <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold mt-0.5">{i + 1}</span>
                  <p class="text-sm text-mdb-slate leading-snug">{tip}</p>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- GPX Export -->
        <button
          onclick={() => route && downloadGPX(route, `Tour_${new Date().toISOString().slice(0,10)}`)}
          class="result-card w-full bg-mdb-teal text-white font-semibold rounded-full py-4 text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style="animation-delay: 400ms"
        >
          <Download size={15} />Als GPX exportieren
        </button>

        <!-- Reset -->
        <button
          onclick={() => { route = null; weather = null; tips = []; location = null; timePicked = false; }}
          class="result-card w-full border border-mdb-hairline-strong text-mdb-steel rounded-full py-3.5 text-sm font-medium active:scale-[0.97] transition-transform"
          style="animation-delay: 480ms"
        >
          Neue Route planen
        </button>

        <div class="safe-bottom"></div>
      </div>
    {/if}

  </div>

  <!-- ── Footer ── -->
  <div class="mt-6 bg-mdb-canvas border-t border-mdb-hairline" style="padding-bottom: calc(env(safe-area-inset-bottom) + 32px)">
    <div class="px-5 pt-5 pb-2">
      <!-- App name -->
      <div class="flex items-center justify-center gap-2.5 mb-4">
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="32" height="32" rx="10" fill="#00ed64" fill-opacity="0.15" stroke="#00ed64" stroke-width="1.5"/>
          <path d="M22 8 L14 21 H20 L18 32 L26 19 H20 L22 8Z" fill="#001e2b"/>
          <path d="M22 8 L14 21 H20 L18 32 L26 19 H20 L22 8Z" fill="#00ed64" fill-opacity="0.5"/>
        </svg>
        <span class="text-base font-bold text-mdb-ink tracking-tight">TrailBlazer <span class="text-mdb-green-mid">Ultra</span></span>
      </div>
      <!-- Links + copyright -->
      <div class="flex items-center justify-center gap-3">
        <button
          onclick={() => anleitungOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors flex items-center gap-1"
        >
          <BookOpen size={12} />Anleitung
        </button>
        <span class="text-mdb-hairline-strong text-xs">|</span>
        <a href="https://moindaniel.de/" target="_blank" rel="noopener noreferrer" class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors">© {new Date().getFullYear()} Daniel Muschinski</a>
        <span class="text-mdb-hairline-strong text-xs">|</span>
        <button
          onclick={() => impressumOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors"
        >
          Impressum
        </button>
      </div>
      <div class="flex justify-center mt-3">
        <button
          onclick={() => riderOpen = true}
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mdb-surface border border-mdb-hairline-strong active:bg-mdb-canvas transition-colors"
        >
          <span class="text-xs font-medium text-mdb-steel">v{VERSION}</span>
          <span class="w-px h-3 bg-mdb-hairline-strong"></span>
          <span class="text-xs text-mdb-steel font-medium">{BUILD_NAME}</span>
        </button>
      </div>
    </div>
  </div>


</div>

<InstallPrompt />

<!-- Name onboarding -->
<BottomSheet bind:open={nameInputOpen} title="Wie heißt du?">
  <div class="space-y-4">
    <p class="text-sm text-white/60">Dein Name wird lokal gespeichert und nur auf diesem Gerät angezeigt.</p>
    <input
      type="text"
      bind:value={nameInput}
      placeholder="Dein Name"
      maxlength="30"
      onkeydown={(e) => e.key === 'Enter' && saveName()}
      class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-mdb-green text-sm"
    />
    <button
      onclick={saveName}
      disabled={!nameInput.trim()}
      class="w-full py-3.5 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm disabled:opacity-40"
    >
      Los geht's
    </button>
    <button onclick={() => nameInputOpen = false} class="w-full py-2 text-white/40 text-sm">
      Überspringen
    </button>
  </div>
</BottomSheet>

<!-- Profile sheet -->
<BottomSheet bind:open={profileOpen} title="Profil">
  <div class="space-y-5">
    {#if userName}
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-mdb-green flex items-center justify-center flex-shrink-0">
          <span class="text-2xl font-bold text-mdb-ink">{userName[0].toUpperCase()}</span>
        </div>
        <div>
          <p class="font-semibold text-white text-lg">{userName}</p>
          <p class="text-xs text-white/50">Lokal gespeichert</p>
        </div>
      </div>
      <div class="border-t border-white/10 pt-4 space-y-3">
        <p class="text-xs text-white/50 uppercase tracking-wider font-semibold">Name ändern</p>
        <input
          type="text"
          bind:value={nameInput}
          placeholder={userName}
          maxlength="30"
          onkeydown={(e) => e.key === 'Enter' && saveName()}
          class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-mdb-green text-sm"
        />
        <button
          onclick={saveName}
          disabled={!nameInput.trim()}
          class="w-full py-3 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    {:else}
      <input
        type="text"
        bind:value={nameInput}
        placeholder="Dein Name"
        maxlength="30"
        onkeydown={(e) => e.key === 'Enter' && saveName()}
        class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-mdb-green text-sm"
      />
      <button
        onclick={saveName}
        disabled={!nameInput.trim()}
        class="w-full py-3.5 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm disabled:opacity-40"
      >
        Speichern
      </button>
    {/if}
  </div>
</BottomSheet>

<DateTimePicker
  bind:value={startTime}
  bind:open={timePickerOpen}
  onconfirm={() => timePicked = true}
/>

<BottomSheet bind:open={riderOpen} title={BUILD_NAME}>
  {#if RIDERS[BUILD_NAME]}
    {@const r = RIDERS[BUILD_NAME]}
    <div class="space-y-5">
      <div>
        <p class="text-mdb-green font-semibold text-base">„{r.nickname}"</p>
        <p class="text-xs text-white/40 mt-0.5">{r.nationality} · {r.years} · {r.specialty}</p>
      </div>
      <p class="text-sm text-white/70 leading-relaxed">{r.bio}</p>
      <div>
        <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Palmares</p>
        <ul class="space-y-1.5">
          {#each r.wins as win}
            <li class="flex items-start gap-2.5">
              <span class="text-mdb-green font-bold flex-shrink-0">·</span>
              <span class="text-sm text-white/80">{win}</span>
            </li>
          {/each}
        </ul>
      </div>
      <button
        onclick={() => { riderOpen = false; changelogOpen = true; }}
        class="w-full py-3 rounded-full border border-mdb-green/30 text-mdb-green text-sm font-medium"
      >
        Was ist neu in v{VERSION}?
      </button>
    </div>
  {/if}
</BottomSheet>

<BottomSheet bind:open={changelogOpen} title="Was ist neu">
  <div class="space-y-4">
    <p class="text-xs text-white/40 font-semibold uppercase tracking-wider">v{VERSION} · {BUILD_NAME}</p>
    <ul class="space-y-3">
      {#each CHANGELOG as item}
        <li class="flex items-start gap-3">
          <span class="text-mdb-green font-bold flex-shrink-0 mt-0.5">·</span>
          <span class="text-sm text-white/80 leading-snug">{item}</span>
        </li>
      {/each}
    </ul>
    <button
      onclick={dismissChangelog}
      class="w-full py-3.5 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm mt-2"
    >
      Verstanden
    </button>
  </div>
</BottomSheet>

<BottomSheet bind:open={impressumOpen} title="Impressum">
  <div class="space-y-4 text-sm text-white/70">
    <div>
      <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Angaben gemäß § 5 TMG</p>
      <p class="text-white">Daniel Muschinski</p>
      <p>Freudenbergstraße 4</p>
      <p>28213 Bremen</p>
    </div>
    <div>
      <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Kontakt</p>
      <a href="mailto:moindnl@proton.me" class="text-mdb-green">moindnl@proton.me</a>
    </div>
    <div>
      <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Externe Dienste</p>
      <p>Diese App nutzt folgende externe APIs:</p>
      <ul class="mt-1 space-y-1 list-disc list-inside">
        <li><span class="text-white">Open-Meteo</span> — Wetterdaten (GPS-Koordinaten, Zeitstempel)</li>
        <li><span class="text-white">OpenRouteService</span> — Routenberechnung (GPS-Koordinaten)</li>
        <li><span class="text-white">OpenFreeMap</span> — Kartendarstellung</li>
      </ul>
      <p class="mt-2 text-white/50 text-xs">Es werden keine personenbezogenen Daten gespeichert oder weitergegeben. Name und API-Key werden ausschließlich lokal auf dem Gerät gespeichert.</p>
    </div>
  </div>
</BottomSheet>

<BottomSheet bind:open={anleitungOpen} title="Anleitung">
  <ul class="space-y-3 text-sm text-white/70">
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">1</span>
      <p><strong class="text-white">Profil</strong> — Tippe oben rechts auf dein Avatar-Icon um deinen Namen zu hinterlegen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">2</span>
      <p><strong class="text-white">GPS & Zeit</strong> — Linke Karte: Standort ermitteln. Rechte Karte: Startzeit wählen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">3</span>
      <p><strong class="text-white">Distanz & Dauer</strong> — Zielwerte per Schieberegler einstellen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">4</span>
      <p><strong class="text-white">Untergrund & Steigung</strong> — Belag und Bergigkeit wählen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">5</span>
      <p><strong class="text-white">Route berechnen</strong> — Wind-optimierte Schleife mit Wetter & Höhenprofil.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-[10px] font-bold mt-0.5">6</span>
      <p><strong class="text-white">GPX-Export</strong> — Direkt in Garmin, Wahoo oder Komoot importieren.</p>
    </li>
  </ul>
</BottomSheet>
