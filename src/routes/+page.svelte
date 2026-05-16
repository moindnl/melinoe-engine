<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import {
    Navigation, Loader, Wind, Download, Route, Share2, Utensils,
    Timer, MoveUp, Gauge, Lightbulb, Sun, Cloud, CloudRain, Clock, Droplet,
    UserRound, UserRoundPlus, X, Info, Check, ChevronLeft, ChevronRight, Plus, ArrowUp,
    MapPin, Search, BarChart2, Star, Globe, WifiOff, Bookmark, Venus, Zap, Flame, Cookie
  } from 'lucide-svelte';
  import { fetchWeather, windDirectionLabel, type WeatherData } from '$lib/services/weather';
  import { generateOptimalLoop, surfaceLabels, gradientLabels, gradientSubLabels, getOrsApiKey, saveOrsApiKey, type RouteResult, type SurfaceType, type GradientLevel } from '$lib/services/routing';
  import { generateRouteTips } from '$lib/services/optimizer';
  import { downloadGPX, generateGPX } from '$lib/services/gpx';
  import MapView from '$lib/components/MapView.svelte';
  import ElevationChart from '$lib/components/ElevationChart.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';
  import DateTimePicker from '$lib/components/DateTimePicker.svelte';

  // --- Build ---
  const VERSION = '1.9';
  const BUILD_NAME = 'Marianne';
  const RIDERS: Record<string, { fullName: string; nationality: string; years: string; specialty: string; bio: string; wins: string[] }> = {
    'Marianne': {
      fullName:    'Marianne Vos',
      nationality: 'Niederlande',
      years:       '2004 – heute',
      specialty:   'Allrounderin',
      bio:         'Marianne Vos ist die dominierende Figur des Frauenradsports — über zwei Jahrzehnte auf Weltklasse-Niveau, auf Straße, Bahn, Cyclocross und MTB. Kein anderes Profil im Peloton ist so breit, kein Palmares vergleichbar.',
      wins: [
        '8× Weltmeisterin Straße & Bahn',
        '3× Olympiasiegerin (2008, 2012, 2020)',
        '3× Giro Donne',
        '1× Tour de France Femmes (2022)',
        'La Flèche Wallonne, Gent–Wevelgem, Strade Bianche',
        'Über 200 Profi-Siege',
      ],
    },
    'Demi': {
      fullName:    'Demi Vollering',
      nationality: 'Niederlande',
      years:       '2018 – heute',
      specialty:   'Klettern & Rundfahrten',
      bio:         'Demi Vollering ist die Kletterin ihrer Generation. 2023 gewann sie die Tour de France Femmes souverän und zeigte dabei eine Dominanz am Berg, die an die besten Männer-Kletterer erinnert. Schnell, taktisch klug, konstant auf höchstem Niveau.',
      wins: [
        '1× Tour de France Femmes (2023)',
        '1× Giro Donne (2024)',
        '2× La Flèche Wallonne',
        'Strade Bianche 2023',
        'Liège–Bastogne–Liège 2023',
      ],
    },
    'Lotte': {
      fullName:    'Lotte Kopecky',
      nationality: 'Belgien',
      years:       '2015 – heute',
      specialty:   'Klassiker & Sprint',
      bio:         'Lotte Kopecky ist das Gesicht des belgischen Frauenradsports — technisch versiert auf Kopfsteinpflaster, stark im Sprint, mit dem Instinkt einer geborenen Klassikerin. 2024 gewann sie Ronde van Vlaanderen und Paris–Roubaix im gleichen Frühling.',
      wins: [
        '2× Ronde van Vlaanderen (2022, 2024)',
        '1× Paris–Roubaix Femmes (2024)',
        '2× Strade Bianche (2022, 2023)',
        '1× Weltmeisterin Straße (2024)',
        'Gent–Wevelgem 2022',
      ],
    },
    'Kasia': {
      fullName:    'Katarzyna Niewiadoma',
      nationality: 'Polen',
      years:       '2013 – heute',
      specialty:   'Klettern',
      bio:         'Katarzyna Niewiadoma ist Polens größte Radsport-Heldin. Jahrelang Podium-Anwärterin bei großen Rennen, gewann sie 2024 die Tour de France Femmes in einer dramatischen Schlussetappe — der erste polnische Sieg in einem Grand Tour der Frauen.',
      wins: [
        '1× Tour de France Femmes (2024)',
        'La Flèche Wallonne 2017',
        'Liège–Bastogne–Liège 2022',
        'Múltiple Podien bei Grand Tours',
      ],
    },
    'Longo': {
      fullName:    'Elisa Longo Borghini',
      nationality: 'Italien',
      years:       '2012 – heute',
      specialty:   'Klassiker & Klettern',
      bio:         'Elisa Longo Borghini ist eine der konstantesten Fahrerinnen im Peloton — bereit für harte Klassiker genauso wie für Bergankünfte. 2024 gewann sie Paris–Roubaix und zeigte damit ihre Vielseitigkeit auf höchstem Niveau.',
      wins: [
        '1× Paris–Roubaix Femmes (2022)',
        '2× Giro Donne (2023, 2024)',
        'Tour of Flanders 2021',
        'Liège–Bastogne–Liège 2020',
        'Strade Bianche 2020',
      ],
    },
    'Cecilie': {
      fullName:    'Cecilie Uttrup Ludwig',
      nationality: 'Dänemark',
      years:       '2015 – heute',
      specialty:   'Klettern & Attacken',
      bio:         'Cecilie Uttrup Ludwig ist die Entertainerin des Pelotons — angreifend, leidenschaftlich, immer auf der Suche nach Ausreißern. Ihre offene Art und ihr unerschrockenes Fahren haben ihr eine riesige Fangemeinde eingebracht, die weit über den Radsport hinausgeht.',
      wins: [
        'La Flèche Wallonne 2022',
        'Liège–Bastogne–Liège 2024',
        'Múltiple Etappensiege Tour de France Femmes',
        'Bergwertung Tour de France Femmes 2022',
      ],
    },
    'Grace': {
      fullName:    'Grace Brown',
      nationality: 'Australien',
      years:       '2017 – heute',
      specialty:   'Zeitfahren & Klassiker',
      bio:         'Grace Brown krönte 2024 ihre Karriere mit dem Olympiagold im Zeitfahren in Paris — vor heimischem Publikum ihres Teams, in einer Fahrt der Klasse. Dazu gewann sie in der gleichen Saison die Tour de France Femmes. Ein Jahr, das Geschichte schrieb.',
      wins: [
        '1× Olympiasiegerin Zeitfahren (Paris 2024)',
        '1× Tour de France Femmes (2024)',
        'Paris–Roubaix Femmes 2023',
        'Mehrfache Zeitfahr-Spitzenleistungen',
      ],
    },
    'Chloe': {
      fullName:    'Chloé Dygert',
      nationality: 'USA',
      years:       '2017 – heute',
      specialty:   'Zeitfahren',
      bio:         'Chloé Dygert hält den Weltrekord im Einzelzeitfahren und ist auf dieser Distanz die schnellste Frau aller Zeiten. Nach einem schweren Sturz bei der WM 2020, bei dem sie fast ihre Karriere verlor, kämpfte sie sich zurück — und ist seitdem noch stärker.',
      wins: [
        '5× Weltmeisterin Zeitfahren (2018–2023)',
        'Weltrekord Einzelzeitfahren',
        '1× Olympiagold Teamverfolgung (Tokio 2020)',
        'Comeback nach schwerem Sturz 2020',
      ],
    },
    'Kristen': {
      fullName:    'Kristen Faulkner',
      nationality: 'USA',
      years:       '2020 – heute',
      specialty:   'Straße & Ausdauer',
      bio:         'Kristen Faulkner begann erst spät mit dem Profi-Radsport — vorher war sie Harvard-Absolventin und Venture-Capital-Investorin. 2024 in Paris gewann sie Olympiagold im Straßenrennen und Teamverfolgung: zwei Goldmedaillen, eine Karriere wie im Film.',
      wins: [
        '2× Olympiagold Paris 2024 (Straße & Teamverfolgung)',
        'US-Meisterin Straße 2024',
        'Mehrere Etappensiege auf WorldTour-Niveau',
      ],
    },
    'Pauline': {
      fullName:    'Pauline Ferrand-Prévot',
      nationality: 'Frankreich',
      years:       '2012 – heute',
      specialty:   'Straße, MTB & Cyclocross',
      bio:         'Pauline Ferrand-Prévot ist die einzige Fahrerin, die gleichzeitig Weltmeisterin auf Straße, im Mountainbike und im Cyclocross war. 2024 gewann sie Olympiagold im MTB — ein Beweis, dass ihr Talent keine Grenzen kennt.',
      wins: [
        'Weltmeisterin Straße (2014)',
        '3× Weltmeisterin MTB XC (2015, 2022, 2023)',
        '2× Weltmeisterin Cyclocross (2015, 2016)',
        'Weltmeisterin Gravel (2022)',
        '1× Olympiasiegerin MTB (Paris 2024)',
      ],
    },
    'Puck': {
      fullName:    'Puck Pieterse',
      nationality: 'Niederlande',
      years:       '2021 – heute',
      specialty:   'MTB & Straßenklassiker',
      bio:         'Puck Pieterse ist das größte Talent im Frauenradsport der Gegenwart. Mit 22 Jahren bereits MTB-Weltmeisterin, Siegerin von Strade Bianche und Amstel Gold Race — auf Straße wie im Gelände auf Weltklasse-Niveau. Ihre Entwicklung ist noch längst nicht abgeschlossen.',
      wins: [
        '1× MTB XC Weltmeisterin (2023)',
        'Strade Bianche 2024',
        'Amstel Gold Race 2024',
        'Olympia Bronze MTB (Paris 2024)',
        'Múltiple Cyclocross-Podien auf Elite-Niveau',
      ],
    },
    'Shirin': {
      fullName:    'Shirin van Anrooij',
      nationality: 'Niederlande',
      years:       '2021 – heute',
      specialty:   'CX & Straße',
      bio:         'Shirin van Anrooij ist Cyclocross-Weltmeisterin und hat gleichzeitig auf der Straße ihr Potenzial als Klassikerin gezeigt. Sie steht für die neue Generation niederländischer Fahrerinnen, die ohne Grenzen zwischen Disziplinen denken.',
      wins: [
        '1× Cyclocross-Weltmeisterin (2023)',
        'Mehrfache CX-Weltcup-Siege',
        'Top-Ergebnisse bei Frühjahrsklassikern',
      ],
    },
    'Elisa': {
      fullName:    'Elisa Balsamo',
      nationality: 'Italien',
      years:       '2018 – heute',
      specialty:   'Sprint & Klassiker',
      bio:         'Elisa Balsamo wurde 2021 als 23-Jährige Weltmeisterin im Straßenrennen — ein Sprintsieg, der sie sofort in die Elite katapultierte. Seitdem zählt sie zu den stärksten Sprinterinnen im Peloton und gewinnt regelmäßig auf WorldTour-Niveau.',
      wins: [
        '1× Weltmeisterin Straße (2021)',
        '1× Olympiagold Teamverfolgung (Tokio 2020)',
        'Gent–Wevelgem 2022',
        'Múltiple Etappensiege auf WorldTour-Niveau',
      ],
    },
    'Ashleigh': {
      fullName:    'Ashleigh Moolman',
      nationality: 'Südafrika',
      years:       '2010 – heute',
      specialty:   'Klettern',
      bio:         'Ashleigh Moolman ist die beste Radsportlerin, die Afrika je hervorgebracht hat. Jahrelang eine der konstantesten Kletterinnen im Peloton, kämpft sie für die Entwicklung des Frauenradsports auf dem afrikanischen Kontinent und darüber hinaus.',
      wins: [
        'Olympia Bronze Zeitfahren (Tokio 2020)',
        'Múltiple Top-Ergebnisse bei Grand Tours',
        'Afrikameisterin mehrfach',
        'Langzeitige WorldTour-Präsenz auf Spitzenniveau',
      ],
    },
    'Lizzie': {
      fullName:    'Lizzie Deignan',
      nationality: 'Großbritannien',
      years:       '2008 – heute',
      specialty:   'Klassiker',
      bio:         'Lizzie Deignan gewann Paris–Roubaix Femmes 2021 in der allerersten Auflage des Rennens — solo, mit riesigem Vorsprung, im Regen. Dieses Bild steht für alles, wofür der Frauenradsport der letzten Jahre gekämpft hat.',
      wins: [
        '1× Weltmeisterin Straße (2015)',
        'Paris–Roubaix Femmes 2021 (erste Ausgabe)',
        'La Flèche Wallonne 2021',
        'Strade Bianche 2016',
        'Olympia Silber 2012',
      ],
    },
    'Pfeiffer': {
      fullName:    'Pfeiffer Georgi',
      nationality: 'Großbritannien',
      years:       '2020 – heute',
      specialty:   'Klettern & Rundfahrten',
      bio:         'Pfeiffer Georgi gehört zu den aufregendsten britischen Nachwuchstalenten im Frauenradsport. Stark am Berg, mit wachsender Reife in taktischen Situationen, entwickelt sie sich stetig zu einer ernsthaften Rundfahrerin auf WorldTour-Niveau.',
      wins: [
        'Etappensiege auf WorldTour-Niveau',
        'Tour de Suisse Femmes 2023',
        'Konstante Top-Ergebnisse bei Rundfahrten',
      ],
    },
    'Niamh': {
      fullName:    'Niamh Fisher-Black',
      nationality: 'Neuseeland',
      years:       '2020 – heute',
      specialty:   'Klettern',
      bio:         'Niamh Fisher-Black ist Neuseelands größte Radsport-Hoffnung — eine reine Kletterin mit dem Talent, eines Tages Grand Tours zu gewinnen. Bei SD Worx umgeben von den Besten der Welt wächst sie jede Saison deutlich.',
      wins: [
        'Neuseeland-Meisterin',
        'Top-Ergebnisse bei Bergankünften WorldTour',
        'Aufsteigerin der Saison 2022/2023',
      ],
    },
    'Juliette': {
      fullName:    'Juliette Labous',
      nationality: 'Frankreich',
      years:       '2018 – heute',
      specialty:   'Klettern',
      bio:         'Juliette Labous ist Frankreichs stärkste Kletterin der aktuellen Generation — präzise in der Bergankuft, gefürchtet in langen Aufstiegen. Sie zählt regelmäßig zu den besten Fahrerinnen bei Grand Tours und Hügelklassikern.',
      wins: [
        'Múltiple Top-5-Platzierungen Grand Tours',
        'Etappensiege WorldTour',
        'Französische Meisterin',
      ],
    },
    'Marlen': {
      fullName:    'Marlen Reusser',
      nationality: 'Schweiz',
      years:       '2019 – heute',
      specialty:   'Zeitfahren',
      bio:         'Marlen Reusser ist eine der explosivsten Zeitfahrerinnen im Peloton — wenn sie einen guten Tag hat, ist niemand schneller. Zweimal Olympia-Silber im Zeitfahren, mehrfache Weltmeisterschaftsmedaillen und eine Siegerin, die das Potenzial für Gold in sich trägt.',
      wins: [
        '2× Olympia Silber Zeitfahren (Tokio 2020, Paris 2024)',
        '1× Weltmeisterin Zeitfahren (2022)',
        'Paris–Roubaix Femmes 2022',
        'Gent–Wevelgem 2022',
      ],
    },
    'Clara': {
      fullName:    'Clara Copponi',
      nationality: 'Frankreich',
      years:       '2019 – heute',
      specialty:   'Sprint & Bahn',
      bio:         'Clara Copponi ist Frankreichs schnellste Sprinterin und eine der stärksten Bahnfahrerinnen der Welt. Olympiasiegerin in der Mannschaftsverfolgung, zählt sie auf der Straße zu den gefährlichsten Finisherinnen im Peloton.',
      wins: [
        '1× Olympiasiegerin Teamverfolgung (Paris 2024)',
        'Weltmeisterin Omnium (2022)',
        'Múltiple Weltcup-Siege Bahn',
        'Etappensiege WorldTour Straße',
      ],
    },
  };

  const CHANGELOG: string[] = [
    'Watch The Femmes — jedes Major Release trägt den Namen einer aktiven Profi-Fahrerin als Hommage an die Frauen des Radsports.',
    'Distanzabweichung sichtbar — kleines +/− Badge zeigt wie weit die Route vom Zielwert abweicht.',
    'FAQ im Footer — häufige Fragen zu Distanzabweichung, Routenfehler und Rückenwind-Score.',
    'Scroll-Verhalten verbessert — nach Berechnung springt die Ansicht direkt zur Karte statt zu den Stats.',
    'Formular-State bleibt nach App-Neustart erhalten — Distanz, Untergrund, Steigung werden lokal gespeichert.',
    'Install-Hinweis wird 30 Tage ausgeblendet nach Ablehnen — erscheint nicht mehr bei jedem Start.',
    'Routenvergleich: alle berechneten Routen sortiert nach Rückenwind — Empfehlung auf einen Blick.',
    'Adresssuche: Startpunkt per Adresseingabe setzen — als Alternative zu GPS.',
    'Wetter und Wind werden jetzt für die geplante Startzeit abgerufen — nicht für den aktuellen Moment.',
    'Roadmap: geplante Features direkt in der App einsehbar (Footer → Roadmap).',
    'Barrierefreiheit: Kontraste und Schriftgrößen auf WCAG 2.1 AA angehoben.',
  ];

  // --- State ---
  type PlanMode = 'distance' | 'duration';

  let userSpeeds = $state<Record<SurfaceType, number>>({ road: 28, mixed: 24, gravel: 20 });
  let defaultSurface = $state<SurfaceType>('road');
  let defaultGradient = $state<GradientLevel>('any');
  let defaultDistance = $state(60);

  function nowString() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  let planMode = $state<PlanMode>('distance');
  let distanceKm = $state(60);
  let durationMin = $state(120);
  let startTime = $state(nowString());
  let surface = $state<SurfaceType>('road');
  let gradient = $state<GradientLevel>('any');

  const targetDistanceKm = $derived(
    planMode === 'distance'
      ? distanceKm
      : Math.round(userSpeeds[surface] * durationMin / 60)
  );

  let location = $state<{ lat: number; lon: number } | null>(null);
  let locationLabel = $state<string | null>(null);
  let locating = $state(false);
  let locError = $state('');

  // --- Address search ---
  interface NominatimAddress {
    road?: string; house_number?: string;
    city?: string; town?: string; village?: string; suburb?: string;
    county?: string; state?: string;
  }
  interface NominatimResult {
    lat: string; lon: string;
    display_name: string;
    address?: NominatimAddress;
  }
  let searchQuery = $state('');
  let searchResults = $state<NominatimResult[]>([]);
  let searchLoading = $state(false);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  function formatNominatimLabel(r: NominatimResult): string {
    const a = r.address;
    if (!a) return r.display_name.split(',').slice(0, 2).join(', ');
    const street = a.road
      ? (a.house_number ? `${a.road} ${a.house_number}` : a.road)
      : null;
    const city = a.city || a.town || a.village || a.suburb || a.county;
    if (street && city) return `${street}, ${city}`;
    if (city) return city;
    if (street) return street;
    return r.display_name.split(',').slice(0, 2).join(', ');
  }

  function onSearchInput() {
    if (searchDebounce) clearTimeout(searchDebounce);
    const q = searchQuery.trim();
    if (q.length < 3) { searchResults = []; return; }
    searchDebounce = setTimeout(async () => {
      searchLoading = true;
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', q);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '5');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('accept-language', 'de');
        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': 'TrailBlazerUltra/1.4' }
        });
        searchResults = await res.json();
      } catch { searchResults = []; }
      finally { searchLoading = false; }
    }, 300);
  }

  function selectSearchResult(r: NominatimResult) {
    location = { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
    locationLabel = formatNominatimLabel(r);
    searchQuery = '';
    searchResults = [];
    locError = '';
  }

  // --- Route state ---
  let loading = $state(false);
  let calcError = $state('');
  let weather = $state<WeatherData | null>(null);
  let allRoutes = $state<RouteResult[]>([]);
  let routeIndex = $state(0);
  let loadingMore = $state(false);
  let bearingOffset = $state(0);
  let slideDir = $state(1);
  let shared = $state(false);
  const route = $derived(allRoutes[routeIndex] ?? null);
  let tips = $state<string[]>([]);

  // --- UI state ---
  let timePicked = $state(false);
  let timePickerOpen = $state(false);
  let orsKey = $state('');
  let hasOrsKey = $state(!!getOrsApiKey());
  let anleitungOpen = $state(false);
  let impressumOpen = $state(false);
  let splashOpen = $state(false);
  let changelogOpen = $state(false);
  let riderOpen = $state(false);
  let roadmapOpen = $state(false);
  let profileOpen = $state(false);
  let faqOpen = $state(false);
  let compareOpen = $state(false);
  let userName = $state('');
  let nameInput = $state('');

  function greeting() {
    const h = new Date().getHours();
    if (h >= 5  && h < 11) return 'Guten Morgen';
    if (h >= 11 && h < 17) return 'Guten Tag';
    if (h >= 17 && h < 22) return 'Guten Abend';
    return 'Hallo';
  }

  function saveSettings() {
    localStorage.setItem('tb_settings', JSON.stringify({
      userSpeeds: { ...userSpeeds },
      defaultSurface,
      defaultGradient,
      defaultDistance,
    }));
  }

  function saveSession() {
    try {
      sessionStorage.setItem('tb_session', JSON.stringify({
        allRoutes, weather, location, routeIndex,
        surface, gradient, distanceKm, durationMin, planMode, startTime, timePicked,
      }));
    } catch { /* ignore quota errors */ }
  }

  onMount(() => {
    console.log('%c"Ride as much or as little, as long or as short as you feel. But ride."\n— Eddy Merckx', 'color:#00ed64;font-style:italic;font-size:13px');
    console.log('%cFor Jannik and Lukas — my Ballerina-Ride-Buddies', 'color:#5c6c7a;font-size:11px');

    if (!localStorage.getItem(`tb_welcome_${VERSION}`)) splashOpen = true;
    if (splashOpen) document.body.style.overflow = 'hidden';

    const savedName = localStorage.getItem('tb_user_name');
    if (savedName) userName = savedName;

    const savedSettings = localStorage.getItem('tb_settings');
    if (savedSettings) {
      try {
        const s = JSON.parse(savedSettings);
        if (s.userSpeeds) userSpeeds = s.userSpeeds;
        if (s.defaultSurface) { defaultSurface = s.defaultSurface; surface = s.defaultSurface; }
        if (s.defaultGradient) { defaultGradient = s.defaultGradient; gradient = s.defaultGradient; }
        if (s.defaultDistance) { defaultDistance = s.defaultDistance; distanceKm = s.defaultDistance; }
      } catch { /* ignore corrupt data */ }
    }

    const savedForm = localStorage.getItem('tb_form');
    if (savedForm) {
      try {
        const f = JSON.parse(savedForm);
        if (Number.isFinite(f.distanceKm)) distanceKm = f.distanceKm;
        if (Number.isFinite(f.durationMin)) durationMin = f.durationMin;
        if (f.surface) surface = f.surface;
        if (f.gradient) gradient = f.gradient;
        if (f.planMode) planMode = f.planMode;
      } catch { /* ignore corrupt data */ }
    }

    const savedSession = sessionStorage.getItem('tb_session');
    if (savedSession) {
      try {
        const s = JSON.parse(savedSession);
        if (s.allRoutes?.length && s.allRoutes.every(isValidRoute)) {
          allRoutes = s.allRoutes;
          weather = s.weather;
          location = s.location;
          routeIndex = s.routeIndex ?? 0;
          surface = s.surface ?? surface;
          gradient = s.gradient ?? gradient;
          distanceKm = s.distanceKm ?? distanceKm;
          durationMin = s.durationMin ?? durationMin;
          planMode = s.planMode ?? planMode;
          startTime = s.startTime ?? startTime;
          timePicked = s.timePicked ?? false;
          tips = generateRouteTips(s.weather, s.allRoutes[s.routeIndex ?? 0]);
        }
      } catch { /* ignore corrupt session */ }
    }
  });

  $effect(() => { if (profileOpen) nameInput = userName; });

  function deleteName() {
    userName = '';
    localStorage.removeItem('tb_user_name');
  }

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    userName = n;
    localStorage.setItem('tb_user_name', n);
  }

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

  $effect(() => {
    try {
      localStorage.setItem('tb_form', JSON.stringify({ distanceKm, surface, gradient, planMode, durationMin }));
    } catch { /* ignore quota errors */ }
  });

  function fmt(min: number) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')} h` : `${m} min`;
  }

  function windArrow(score: number): string {
    if (score >= 80) return '↑↑';
    if (score >= 60) return '↑';
    if (score >= 40) return '→';
    return '↓';
  }

  function isValidRoute(r: RouteResult): boolean {
    return (
      r != null &&
      Number.isFinite(r.elevationGain) &&
      Number.isFinite(r.elevationLoss) &&
      Number.isFinite(r.distanceKm) &&
      Number.isFinite(r.durationMin) &&
      Number.isFinite(r.windScore) &&
      Number.isFinite(r.startBearing) &&
      Array.isArray(r.elevationProfile) &&
      Array.isArray(r.elevations)
    );
  }

  async function locateMe() {
    locating = true; locError = '';
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      locationLabel = null;
    } catch {
      locError = 'GPS nicht verfügbar.';
    } finally {
      locating = false;
    }
  }

  async function calculate() {
    if (!location) { locError = 'Bitte zuerst Standort ermitteln.'; return; }
    loading = true; allRoutes = []; routeIndex = 0; bearingOffset = 0; weather = null; tips = []; calcError = '';
    try {
      const w = await fetchWeather(location.lat, location.lon, new Date(startTime));
      const routes = await generateOptimalLoop(location, targetDistanceKm, userSpeeds[surface], w.windDirection, surface, gradient, 0);
      const validRoutes = routes.filter(isValidRoute);
      weather = w; allRoutes = validRoutes; routeIndex = 0;
      tips = generateRouteTips(w, validRoutes[0]);
      saveSession();
      await tick();
      requestAnimationFrame(() => {
        (document.getElementById('result-map') ?? document.getElementById('results'))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      calcError = e instanceof Error ? e.message : 'Unbekannter Fehler.';
    } finally {
      loading = false;
    }
  }

  async function loadMoreRoutes() {
    if (!location || !weather) return;
    loadingMore = true; calcError = '';
    try {
      const offset = (bearingOffset + 22.5) % 360;
      const routes = await generateOptimalLoop(location, targetDistanceKm, userSpeeds[surface], weather.windDirection, surface, gradient, offset);
      bearingOffset = offset;
      allRoutes = [...allRoutes, ...routes.filter(isValidRoute)];
    } catch (e) {
      calcError = e instanceof Error ? e.message : 'Unbekannter Fehler.';
    } finally {
      loadingMore = false;
    }
  }

  async function shareRoute() {
    if (!route) return;
    const name = `Tour_${new Date().toISOString().slice(0, 10)}`;
    const text = `${route.distanceKm} km · ${route.elevationGain} Hm · Start ${windDirectionLabel(route.startBearing)} · ${route.windScore}% Rückenwind — geplant mit TrailBlazer Ultra`;

    try {
      if (navigator.canShare) {
        const gpx = generateGPX(route, name);
        const file = new File([gpx], `${name}.gpx`, { type: 'application/gpx+xml' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'TrailBlazer Ultra Route', text });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: 'TrailBlazer Ultra Route', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      shared = true;
      setTimeout(() => { shared = false; }, 2000);
    } catch {
      // user cancelled share — no-op
    }
  }

  function errorHints(msg: string): string[] {
    if (msg.includes('API-Key')) return [
      'ORS-API-Key in den Einstellungen eintragen (grüner Schlüssel-Link unten).',
      'Kostenlos registrieren auf openrouteservice.org.',
    ];
    if (msg.includes('429')) return [
      'API-Limit erreicht — kurz warten und erneut versuchen.',
      'ORS Free-Tier erlaubt 40 Anfragen/Minute.',
    ];
    if (msg.includes('403')) return [
      'API-Key ungültig oder abgelaufen.',
      'Neuen Key auf openrouteservice.org erstellen und hier eintragen.',
    ];
    if (msg.includes('GPS') || msg.includes('Standort')) return [
      'GPS-Zugriff im Browser erlauben.',
      'Einstellungen → Datenschutz → Standort → TrailBlazer Ultra zulassen.',
    ];
    // No-route-found (most common)
    return [
      'Distanz reduzieren — kurze Strecken haben mehr Routen-Optionen.',
      'Steigung auf "Beliebig" setzen — strenge Filter schließen viele Wege aus.',
      'Untergrund wechseln: "Gemischt" findet oft mehr Verbindungen als "Asphalt".',
      '"Weitere Routen anzeigen" antippen — andere Richtungen könnten klappen.',
    ];
  }

  const conditionLabel: Record<string, string> = { sunny: 'Sonnig', cloudy: 'Bewölkt', rainy: 'Regen', windy: 'Windig' };
  const conditionColor: Record<string, string> = { sunny: '#fa6e39', cloudy: '#5c6c7a', rainy: '#00ed64', windy: '#7b3ff2' };

  const steps = ['Wetterdaten…', 'Windrichtung…', 'Route berechnet…', 'Finalisieren…'];
  let stepIdx = $state(0);
  $effect(() => {
    if (!loading) { stepIdx = 0; return; }
    const t = setInterval(() => { stepIdx = Math.min(stepIdx + 1, steps.length - 1); }, 700);
    return () => clearInterval(t);
  });

  $effect(() => { if (route && weather) tips = generateRouteTips(weather, route); });
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

  const distDevKm = $derived(route
    ? Math.round((route.distanceKm - targetDistanceKm) * 10) / 10
    : 0);

  const nutrition = $derived.by(() => {
    if (!route) return null;
    const hours = route.durationMin / 60;
    const sf = surface === 'gravel' ? 1.15 : surface === 'mixed' ? 1.08 : 1.0;
    const water = Math.round(hours * 0.65 * sf * 10) / 10;
    const gels = route.durationMin >= 60 ? Math.floor(route.durationMin / 45) : 0;
    const bars = route.durationMin >= 90 ? Math.floor(route.durationMin / 90) : 0;
    const elevExtra = route.elevationGain * 0.1;
    const kcalLow  = Math.round((hours * 500 * sf + elevExtra) / 100) * 100;
    const kcalHigh = Math.round((hours * 750 * sf + elevExtra) / 100) * 100;
    return { water, gels, bars, kcalLow, kcalHigh };
  });

</script>

<svelte:head><title>TrailBlazer Ultra</title></svelte:head>

<div class="min-h-screen bg-mdb-surface font-sans">

  <!-- ── Header ── -->
  <div class="px-5 pb-8 relative overflow-hidden transition-colors duration-1000 rounded-b-[2rem]"
    style="padding-top: calc(env(safe-area-inset-top) + 1.25rem); background: {isNight ? 'linear-gradient(160deg, #020812 0%, #050d1f 60%, #001e2b 100%)' : '#001e2b'}; box-shadow: 0 4px 24px rgba(0,0,0,0.35)">

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

    <!-- Header row: Avatar | Title | Spacer -->
    <div class="flex items-center justify-between mb-2">

      <!-- Avatar left -->
      <button
        onclick={() => profileOpen = true}
        aria-label="Profil"
        class="w-9 h-9 rounded-full border border-mdb-green/40 flex items-center justify-center active:opacity-70 transition-opacity flex-shrink-0"
      style="background: rgba(0,237,100,0.15)"
      >
        {#if userName}
          <UserRound size={16} color="white" strokeWidth={2} aria-hidden="true" />
        {:else}
          <UserRoundPlus size={16} color="white" strokeWidth={2} aria-hidden="true" />
        {/if}
      </button>

      <!-- Title center -->
      <h1 class="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
        TrailBlazer
        <div style="
          border-radius: 22.4%;
          overflow: hidden;
          width: 36px; height: 36px;
          flex-shrink: 0;
          box-shadow: 0 0 0 1.5px rgba(0,237,100,0.45), 0 2px 8px rgba(0,0,0,0.5);
        " class={isNight ? 'bolt-glow' : ''}>
          <svg width="36" height="36" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
            <defs>
              <radialGradient id="hdr-bg" cx="40%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#013a2a"/>
                <stop offset="100%" stop-color="#001018"/>
              </radialGradient>
              <radialGradient id="hdr-amb" cx="50%" cy="20%" r="50%">
                <stop offset="0%" stop-color="#00ed64" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="#00ed64" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="hdr-glass" cx="50%" cy="-10%" r="75%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stop-color="white" stop-opacity="0.28"/>
                <stop offset="55%"  stop-color="white" stop-opacity="0.05"/>
                <stop offset="100%" stop-color="white" stop-opacity="0"/>
              </radialGradient>
              <filter id="hdr-bloom" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <clipPath id="hdr-clip">
                <rect width="512" height="512" rx="115" ry="115"/>
              </clipPath>
            </defs>
            <g clip-path="url(#hdr-clip)">
              <rect width="512" height="512" fill="url(#hdr-bg)"/>
              <rect width="512" height="512" fill="url(#hdr-amb)"/>
              <path d="M280 88 L168 272 H240 L216 424 L344 240 H272 L280 88Z" fill="#00ed64" fill-opacity="0.28" filter="url(#hdr-bloom)"/>
              <path d="M280 88 L168 272 H240 L216 424 L344 240 H272 L280 88Z" fill="#00ed64"/>
              <rect width="512" height="512" fill="url(#hdr-glass)"/>
              <rect width="512" height="2.5" fill="white" fill-opacity="0.18"/>
            </g>
            <rect width="512" height="512" rx="115" ry="115" fill="none" stroke="white" stroke-opacity="0.10" stroke-width="3"/>
          </svg>
        </div>
        <span class="text-mdb-green">Ultra</span>
      </h1>

      <!-- Spacer right (balances avatar) -->
      <div class="w-9 h-9 flex-shrink-0"></div>

    </div>

    <!-- Greeting -->
    {#if userName}
      <p class="text-center text-sm text-white/60 mt-2">
        {greeting()}, <span class="text-white font-medium">{userName}</span>
      </p>
    {/if}

  </div>

  <div class="px-4 py-5 space-y-3 max-w-lg mx-auto">

    <!-- ── Standort + Startzeit ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline relative">

      <!-- GPS + Zeit row -->
      <div class="flex items-center overflow-hidden rounded-t-mdb-lg">

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
            {:else if locationLabel}
              <MapPin size={16} color="#00684a" />
            {:else}
              <Navigation size={16} color={location ? '#00684a' : '#3d4f5b'} />
            {/if}
          </div>
          <div class="text-left min-w-0">
            <p class="text-xs font-semibold {location ? 'text-mdb-green-dark' : 'text-mdb-ink'}">{locationLabel ? 'Startpunkt' : 'GPS-Standort'}</p>
            {#if locating}
              <p class="text-xs text-mdb-steel">Wird ermittelt…</p>
            {:else if location && locationLabel}
              <p class="text-xs text-mdb-green-dark truncate">{locationLabel}</p>
            {:else if location}
              <p class="text-xs text-mdb-green-dark tabular-nums truncate">
                {location.lat.toFixed(4)}° · {location.lon.toFixed(4)}°
              </p>
            {:else if locError}
              <p class="text-xs text-red-500">{locError}</p>
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
            <p class="text-xs text-mdb-steel">
              {new Date(startTime).toLocaleDateString('de', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </button>

      </div>

      <!-- Address search row -->
      <div class="border-t border-mdb-hairline flex items-center gap-2 px-4 py-2.5">
        {#if searchLoading}
          <Loader size={14} color="#3d4f5b" class="animate-spin flex-shrink-0" />
        {:else}
          <Search size={14} color="#3d4f5b" class="flex-shrink-0" />
        {/if}
        <input
          type="text"
          bind:value={searchQuery}
          oninput={onSearchInput}
          placeholder="Adresse suchen…"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          class="flex-1 bg-transparent text-xs text-mdb-ink placeholder:text-mdb-steel outline-none"
        />
        {#if searchQuery}
          <button
            onclick={() => { searchQuery = ''; searchResults = []; }}
            aria-label="Suche löschen"
            class="flex-shrink-0 text-mdb-steel active:text-mdb-ink"
          >
            <X size={14} />
          </button>
        {/if}
      </div>

      <!-- Search dropdown -->
      {#if searchResults.length > 0}
        <ul class="absolute left-0 right-0 top-full mt-1 z-50 bg-mdb-canvas border border-mdb-hairline rounded-mdb-lg overflow-hidden shadow-lg">
          {#each searchResults as r}
            <li class="border-t border-mdb-hairline first:border-t-0">
              <button
                onclick={() => selectSearchResult(r)}
                class="w-full text-left px-4 py-3 text-xs text-mdb-ink active:bg-mdb-surface transition-colors truncate"
              >
                {r.display_name}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

    </div>

    <!-- ── Distanz / Dauer ── -->
    <div class="bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4">
      <!-- Mode toggle -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex bg-mdb-surface rounded-full p-0.5 border border-mdb-hairline">
          {#each ([['distance', 'Distanz'], ['duration', 'Dauer']] as [PlanMode, string][]) as [mode, label]}
            {#key planMode === mode}
              <button
                onclick={() => planMode = mode}
                class="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors pill-active
                  {planMode === mode ? 'bg-mdb-green text-mdb-ink' : 'text-mdb-steel'}"
              >{label}</button>
            {/key}
          {/each}
        </div>
        <span class="text-2xl font-semibold text-mdb-ink">
          {#if planMode === 'distance'}
            {distanceKm}<span class="text-sm font-normal text-mdb-steel ml-1">km</span>
          {:else}
            {fmt(durationMin)}
          {/if}
        </span>
      </div>

      {#if planMode === 'distance'}
        <input type="range" min="20" max="200" step="5" bind:value={distanceKm} class="w-full" aria-label="Distanz in Kilometern" />
        <div class="flex justify-between text-xs text-mdb-steel mt-1">
          <span>20 km</span>
          <span>200 km</span>
        </div>
      {:else}
        <input type="range" min="30" max="360" step="15" bind:value={durationMin} class="w-full" aria-label="Dauer in Minuten" />
        <div class="flex justify-between text-xs text-mdb-steel mt-1">
          <span>30 min</span>
          <span>6 h</span>
        </div>
      {/if}
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
        {#each (['any', 'flat', 'moderate', 'hilly'] as GradientLevel[]) as g}
          {#key gradient === g}
            <button
              onclick={() => gradient = g}
              class="py-2 px-1 rounded-full text-center border transition-colors
                {gradient === g
                  ? 'bg-mdb-green text-mdb-ink border-mdb-green pill-active'
                  : 'bg-transparent text-mdb-slate border-mdb-hairline-strong'}"
            >
              <div class="text-xs font-semibold leading-tight">{gradientLabels[g]}</div>
              <div class="text-xs leading-tight {gradient === g ? 'text-mdb-ink/70' : 'text-mdb-slate'}">{gradientSubLabels[g]}</div>
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
      {:else if planMode === 'distance' && distanceKm === 200 && gradient === 'any'}
        <Route size={15} />Tadej? Bist du es?
      {:else}
        <Route size={15} />Route berechnen
      {/if}
    </button>

    {#if calcError}
      <div class="rounded-mdb-lg border border-red-900/40 bg-mdb-canvas p-4 space-y-3">
        <div class="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <Info size={16} />
          Keine Route gefunden
        </div>
        <p class="text-xs text-mdb-steel leading-relaxed">{calcError}</p>
        <div class="border-t border-mdb-hairline pt-3 space-y-2">
          <p class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Was tun?</p>
          <ul class="space-y-1.5">
            {#each errorHints(calcError) as hint}
              <li class="flex items-start gap-2 text-xs text-mdb-slate leading-snug">
                <span class="w-1.5 h-1.5 rounded-full bg-mdb-green flex-shrink-0 mt-1.5"></span>
                {hint}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}

    <!-- ── Loading Steps ── -->
    {#if loading}
      <div class="bg-mdb-teal rounded-mdb-lg p-5 space-y-3">
        {#each steps as step, i}
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
              {i < stepIdx ? 'bg-mdb-green' : i === stepIdx ? 'bg-mdb-green animate-pulse' : 'bg-mdb-teal-mid border border-mdb-hairline-dark'}">
              {#if i < stepIdx}
                <Check size={8} color="#001e2b" strokeWidth={2.5} />
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
          {#key routeIndex}
            <div id="result-map" class="result-card rounded-mdb-lg overflow-hidden border border-mdb-hairline" style="height: 42vw; min-height: 200px; max-height: 300px; animation-delay: 0ms"
              transition:fade={{ duration: 200 }}>
              <MapView coordinates={route.coordinates} origin={location} lineColor="#00ed64" />
            </div>
          {/key}
        {/if}

        <!-- Route navigation -->
        <div class="result-card flex items-center gap-2" style="animation-delay: 40ms">
          <button
            onclick={() => { if (routeIndex > 0) { slideDir = -1; routeIndex--; } }}
            disabled={routeIndex === 0}
            class="w-9 h-9 rounded-full border border-mdb-hairline flex items-center justify-center text-mdb-steel disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Vorherige Route"
          >
            <ChevronLeft size={16} />
          </button>

          <div class="flex-1 flex flex-col items-center gap-2">
            <span class="text-xs text-mdb-steel">Route {routeIndex + 1} von {allRoutes.length}</span>
            <div class="flex items-center justify-center gap-1.5">
              {#each allRoutes as _, i}
                <button
                  onclick={() => { slideDir = i > routeIndex ? 1 : -1; routeIndex = i; }}
                  class="rounded-full transition-all {i === routeIndex ? 'w-4 h-2 bg-mdb-green' : 'w-2 h-2 bg-mdb-steel/30'}"
                  aria-label="Route {i + 1}"
                ></button>
              {/each}
            </div>
          </div>

          {#if allRoutes.length > 1}
            <button
              onclick={() => compareOpen = true}
              aria-label="Routen vergleichen"
              class="w-9 h-9 rounded-full border border-mdb-hairline flex items-center justify-center text-mdb-steel active:scale-95 transition-transform"
            >
              <BarChart2 size={16} />
            </button>
          {/if}

          <button
            onclick={() => { if (routeIndex < allRoutes.length - 1) { slideDir = 1; routeIndex++; } }}
            disabled={routeIndex === allRoutes.length - 1}
            class="w-9 h-9 rounded-full border border-mdb-hairline flex items-center justify-center text-mdb-steel disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Nächste Route"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <!-- Load more routes -->
        <button
          onclick={loadMoreRoutes}
          disabled={loadingMore}
          class="result-card w-full flex items-center justify-center gap-2 py-3 rounded-mdb-lg border border-mdb-hairline text-mdb-steel text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          style="animation-delay: 40ms"
        >
          {#if loadingMore}
            <Loader size={14} class="animate-spin" />Weitere Routen werden berechnet…
          {:else}
            <Plus size={14} />Weitere Routen anzeigen
          {/if}
        </button>

        <!-- Sliding cards: stats, elevation, wind, weather, tips -->
        {#key routeIndex}
        <div class="space-y-3" in:fly={{ x: slideDir * 60, duration: 240, easing: cubicOut }}>

        <!-- Stats -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 80ms">
          <div class="grid grid-cols-2 gap-y-4">
            <div class="flex flex-col items-center gap-1 border-r border-mdb-hairline">
              <Gauge size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{route.distanceKm}</span>
              {#if Math.abs(distDevKm) >= 1}
                <span class="text-[10px] tabular-nums {Math.abs(distDevKm) > targetDistanceKm * 0.2 ? 'text-amber-400' : 'text-mdb-steel/70'}">
                  {distDevKm > 0 ? '+' : ''}{distDevKm} km
                </span>
              {:else}
                <span class="text-xs text-mdb-steel">km</span>
              {/if}
            </div>
            <div class="flex flex-col items-center gap-1">
              <Timer size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{fmt(route.durationMin)}</span>
              <span class="text-xs text-mdb-steel">Dauer</span>
            </div>
            <div class="flex flex-col items-center gap-1 border-r border-t border-mdb-hairline pt-4">
              <MoveUp size={15} color="#5c6c7a" />
              <span class="text-xl font-semibold text-mdb-ink">{route.elevationGain}</span>
              <span class="text-xs text-mdb-steel">m Hm</span>
            </div>
            <div class="flex flex-col items-center gap-1 border-t border-mdb-hairline pt-4">
              <!-- Rotating compass arrow -->
              <ArrowUp size={15} color="#5c6c7a"
                style="transform: rotate({route.startBearing}deg); transition: transform 0.4s ease" />
              <span class="text-xl font-semibold text-mdb-ink">{windDirectionLabel(route.startBearing)}</span>
              <span class="text-xs text-mdb-steel">Startrichtung</span>
            </div>
          </div>
        </div>

        <!-- Elevation Chart -->
        {#if route.elevationProfile?.length > 1}
          <ElevationChart
            profile={route.elevationProfile}
            gain={Number.isFinite(route.elevationGain) ? route.elevationGain : 0}
            loss={Number.isFinite(route.elevationLoss) ? route.elevationLoss : 0}
          />
        {/if}

        <!-- Wind -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 160ms">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Wind</div>
            <div class="text-xs text-mdb-steel tabular-nums">
              {new Date(startTime).toLocaleDateString('de', { weekday: 'short', day: 'numeric', month: 'short' })}
              · {new Date(startTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
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
              <div class="font-semibold text-mdb-ink">Wind aus {windDirectionLabel(weather.windDirection)} · {weather.windSpeed} km/h</div>
              <div class="text-sm text-mdb-steel mt-0.5">{route.windScore}% Rückenwind auf Rückfahrt</div>
              <div class="mt-2 h-1.5 bg-mdb-surface rounded-full overflow-hidden border border-mdb-hairline">
                <div class="h-full rounded-full transition-all duration-700" style="width:{route.windScore}%;background:{scoreColor}"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weather -->
        <div class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4" style="animation-delay: 240ms">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Wetter zur Startzeit</div>
            <div class="text-xs text-mdb-steel tabular-nums">
              {new Date(startTime).toLocaleDateString('de', { weekday: 'short', day: 'numeric', month: 'short' })}
              · {new Date(startTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
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
                  <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">{i + 1}</span>
                  <p class="text-sm text-mdb-slate leading-snug">{tip}</p>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        </div>
        {/key}

        <!-- Nutrition -->
        <div
          class="result-card bg-mdb-canvas rounded-mdb-lg border border-mdb-hairline p-4 space-y-3"
          style="animation-delay: 360ms"
        >
          {#if nutrition}
            <div class="flex items-center gap-2">
              <Utensils size={15} class="text-mdb-green flex-shrink-0" />
              <p class="text-xs font-semibold text-mdb-steel uppercase tracking-wider">Verpflegung</p>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div class="bg-black/[0.04] rounded-xl p-3 flex flex-col gap-1.5">
                <Droplet size={14} class="text-mdb-green" />
                <p class="text-base font-bold text-mdb-ink tabular-nums">{nutrition.water.toFixed(1)} L</p>
                <p class="text-[10px] text-mdb-steel uppercase tracking-wide">Wasser</p>
              </div>
              <div class="bg-black/[0.04] rounded-xl p-3 flex flex-col gap-1.5 {nutrition.gels === 0 ? 'opacity-30' : ''}">
                <Zap size={14} class="text-mdb-green" />
                <p class="text-base font-bold text-mdb-ink tabular-nums">{nutrition.gels}</p>
                <p class="text-[10px] text-mdb-steel uppercase tracking-wide">Gels</p>
              </div>
              <div class="bg-black/[0.04] rounded-xl p-3 flex flex-col gap-1.5 {nutrition.bars === 0 ? 'opacity-30' : ''}">
                <Cookie size={14} class="text-mdb-green" />
                <p class="text-base font-bold text-mdb-ink tabular-nums">{nutrition.bars}</p>
                <p class="text-[10px] text-mdb-steel uppercase tracking-wide">Riegel</p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 bg-black/[0.04] rounded-xl px-3 py-2.5">
              <Flame size={14} class="text-mdb-green flex-shrink-0" />
              <div>
                <p class="text-sm font-semibold text-mdb-ink">ca. {nutrition.kcalLow.toLocaleString('de')} – {nutrition.kcalHigh.toLocaleString('de')} kcal</p>
                <p class="text-[10px] text-mdb-steel mt-0.5">Richtwerte · abhängig von Gewicht & Intensität</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Share + GPX Export -->
        <div class="result-card grid grid-cols-2 gap-2" style="animation-delay: 400ms">
          <button
            onclick={shareRoute}
            class="flex items-center justify-center gap-2 py-4 rounded-full border border-mdb-hairline-strong text-mdb-slate text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            {#if shared}
              <Check size={15} color="#00ed64" />
              <span class="text-mdb-green">Kopiert!</span>
            {:else}
              <Share2 size={15} />Teilen
            {/if}
          </button>
          <button
            onclick={() => route && downloadGPX(route, `Tour_${new Date().toISOString().slice(0,10)}`)}
            class="bg-mdb-teal text-white font-semibold rounded-full py-4 text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Download size={15} />GPX
          </button>
        </div>

        <!-- Reset -->
        <button
          onclick={() => { allRoutes = []; routeIndex = 0; weather = null; tips = []; location = null; timePicked = false; sessionStorage.removeItem('tb_session'); }}
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
  <div class="mt-6 bg-mdb-canvas border-t border-mdb-hairline footer-bottom">
    <div class="px-5 pt-5 pb-2">
      <!-- App name -->
      <div class="flex items-center justify-center mb-4">
        <span class="text-base font-bold text-mdb-ink tracking-tight flex items-center gap-1.5">
          TrailBlazer
          <div style="
            border-radius: 22.4%;
            overflow: hidden;
            width: 22px; height: 22px;
            flex-shrink: 0;
            box-shadow: 0 0 0 1.5px rgba(0,237,100,0.45), 0 2px 6px rgba(0,0,0,0.4);
          ">
            <svg width="22" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
              <defs>
                <radialGradient id="ftr-bg" cx="40%" cy="30%" r="70%">
                  <stop offset="0%" stop-color="#013a2a"/>
                  <stop offset="100%" stop-color="#001018"/>
                </radialGradient>
                <radialGradient id="ftr-amb" cx="50%" cy="20%" r="50%">
                  <stop offset="0%" stop-color="#00ed64" stop-opacity="0.18"/>
                  <stop offset="100%" stop-color="#00ed64" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="ftr-glass" cx="50%" cy="-10%" r="75%" gradientUnits="objectBoundingBox">
                  <stop offset="0%"   stop-color="white" stop-opacity="0.24"/>
                  <stop offset="55%"  stop-color="white" stop-opacity="0.04"/>
                  <stop offset="100%" stop-color="white" stop-opacity="0"/>
                </radialGradient>
                <filter id="ftr-bloom" x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <clipPath id="ftr-clip">
                  <rect width="512" height="512" rx="115" ry="115"/>
                </clipPath>
              </defs>
              <g clip-path="url(#ftr-clip)">
                <rect width="512" height="512" fill="url(#ftr-bg)"/>
                <rect width="512" height="512" fill="url(#ftr-amb)"/>
                <path d="M280 88 L168 272 H240 L216 424 L344 240 H272 L280 88Z" fill="#00ed64" fill-opacity="0.28" filter="url(#ftr-bloom)"/>
                <path d="M280 88 L168 272 H240 L216 424 L344 240 H272 L280 88Z" fill="#00ed64"/>
                <rect width="512" height="512" fill="url(#ftr-glass)"/>
                <rect width="512" height="2.5" fill="white" fill-opacity="0.18"/>
              </g>
            </svg>
          </div>
          <span class="text-mdb-green-mid">Ultra</span>
        </span>
      </div>
      <!-- Links + copyright -->
      <div class="flex items-center justify-center gap-3">
        <button
          onclick={() => anleitungOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors"
        >Anleitung</button>
        <span class="text-mdb-hairline-strong text-xs">|</span>
        <button
          onclick={() => faqOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors"
        >FAQ</button>
        <span class="text-mdb-hairline-strong text-xs">|</span>
        <button
          onclick={() => impressumOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors"
        >Impressum</button>
        <span class="text-mdb-hairline-strong text-xs">|</span>
        <button
          onclick={() => roadmapOpen = true}
          class="text-xs text-mdb-steel hover:text-mdb-slate transition-colors"
        >Roadmap</button>
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
      <p class="text-center text-[10px] text-mdb-steel/50 italic mt-4 px-6 leading-relaxed">
        „Ride as much or as little, as long or as short as you feel. But ride."
      </p>
    </div>
  </div>


</div>

<!-- Watch The Femmes Splash -->
{#if splashOpen}
  {@const rider = RIDERS[BUILD_NAME]}
  <div
    class="fixed inset-0 z-[100] flex flex-col items-center justify-between px-6 py-10 safe-top"
    style="background: #001e2b; animation: fadeSlideIn 0.4s ease-out both"
  >
    <div class="flex-1 flex flex-col items-center justify-center gap-6 text-center max-w-xs w-full">

      <Venus size={28} strokeWidth={1.5} class="text-mdb-green/30" />

      <h1 class="text-3xl font-bold text-white tracking-tight">Watch The Femmes</h1>
      <p class="text-sm text-white/60 leading-relaxed -mt-4">
        Jedes Major Release dieser App trägt den Namen einer aktiven Profi-Fahrerin —
        als Hommage an die Frauen des Radsports.
      </p>

      <div class="w-10 h-px bg-mdb-green/40"></div>

      <div class="w-full space-y-4 text-left bg-white/[0.08] border border-white/10 rounded-2xl p-4">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-widest text-mdb-green/70 mb-1">v{VERSION} · {rider.fullName}</p>
          <p class="text-xs font-semibold text-white/40 uppercase tracking-wider">Was ist neu</p>
        </div>
        <ul class="space-y-2">
          {#each CHANGELOG.slice(0, 3) as item}
            <li class="flex items-start gap-2.5">
              <span class="w-1.5 h-1.5 rounded-full bg-mdb-green flex-shrink-0 mt-1.5"></span>
              <span class="text-xs text-white/75 leading-snug">{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="w-full max-w-xs pt-6 safe-bottom">
      <button
        onclick={() => { localStorage.setItem(`tb_welcome_${VERSION}`, '1'); splashOpen = false; document.body.style.overflow = ''; }}
        class="w-full py-4 rounded-full bg-mdb-green text-mdb-ink font-bold text-base active:opacity-70 transition-opacity"
      >
        Los geht's
      </button>
    </div>
  </div>
{/if}

<InstallPrompt />

<!-- Profil & Einstellungen -->
<BottomSheet bind:open={profileOpen} title="Profil & Einstellungen">
  <div class="space-y-4">

    <!-- Name -->
    <div class="flex items-center gap-2">
      <input
        type="text"
        bind:value={nameInput}
        placeholder="Dein Name"
        maxlength="30"
        onblur={saveName}
        onkeydown={(e) => e.key === 'Enter' && (saveName(), (e.target as HTMLInputElement).blur())}
        class="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 outline-none focus:border-mdb-green text-sm"
      />
      {#if userName}
        <button onclick={deleteName} aria-label="Name löschen"
          class="w-9 h-9 flex items-center justify-center text-white/60 active:text-red-400 transition-colors flex-shrink-0">
          <X size={15} />
        </button>
      {/if}
    </div>

    <div class="border-t border-white/10"></div>

    <!-- Route-Defaults -->
    <p class="text-xs font-semibold text-white/60 uppercase tracking-wider">Route-Defaults</p>

    <!-- Untergrund: label left, pills right -->
    <div class="flex items-center gap-3">
      <span class="text-xs text-white/60 w-20 flex-shrink-0">Untergrund</span>
      <div class="flex gap-1.5 flex-1">
        {#each (['road', 'mixed', 'gravel'] as SurfaceType[]) as s}
          <button
            onclick={() => { defaultSurface = s; surface = s; saveSettings(); }}
            class="flex-1 py-1.5 rounded-full text-xs font-semibold border transition-colors
              {defaultSurface === s ? 'bg-mdb-green text-mdb-ink border-mdb-green' : 'bg-transparent text-white/60 border-white/20'}"
          >{surfaceLabels[s]}</button>
        {/each}
      </div>
    </div>

    <!-- Steigung: label left, pills right -->
    <div class="flex items-center gap-3">
      <span class="text-xs text-white/60 w-20 flex-shrink-0">Steigung</span>
      <div class="flex gap-1 flex-1">
        {#each (['any', 'flat', 'moderate', 'hilly'] as GradientLevel[]) as g}
          <button
            onclick={() => { defaultGradient = g; gradient = g; saveSettings(); }}
            class="flex-1 py-1.5 rounded-full text-xs font-semibold border transition-colors
              {defaultGradient === g ? 'bg-mdb-green text-mdb-ink border-mdb-green' : 'bg-transparent text-white/60 border-white/20'}"
          >{gradientLabels[g]}</button>
        {/each}
      </div>
    </div>

    <!-- Distanz: label + value + slider -->
    <div class="flex items-center gap-3">
      <span class="text-xs text-white/60 w-20 flex-shrink-0">Distanz</span>
      <input type="range" min="20" max="200" step="5"
        bind:value={defaultDistance}
        oninput={() => { distanceKm = defaultDistance; saveSettings(); }}
        class="flex-1" />
      <span class="text-xs font-semibold text-white w-12 text-right">{defaultDistance} km</span>
    </div>

    <div class="border-t border-white/10"></div>

    <!-- Geschwindigkeit -->
    <p class="text-xs font-semibold text-white/60 uppercase tracking-wider">Ø Geschwindigkeit</p>

    {#each ([['road', 'Asphalt'], ['mixed', 'Gemischt'], ['gravel', 'Schotter']] as [SurfaceType, string][]) as [s, label]}
      <div class="flex items-center gap-3">
        <span class="text-xs text-white/60 w-20 flex-shrink-0">{label}</span>
        <input type="range" min="10" max="45" step="1"
          value={userSpeeds[s]}
          oninput={(e) => { userSpeeds = { ...userSpeeds, [s]: +(e.target as HTMLInputElement).value }; saveSettings(); }}
          class="flex-1" />
        <span class="text-xs font-semibold text-white w-12 text-right">{userSpeeds[s]} km/h</span>
      </div>
    {/each}

  </div>
</BottomSheet>

<DateTimePicker
  bind:value={startTime}
  bind:open={timePickerOpen}
  onconfirm={() => timePicked = true}
/>

<BottomSheet bind:open={riderOpen} title={RIDERS[BUILD_NAME]?.fullName ?? BUILD_NAME}>
  {#if RIDERS[BUILD_NAME]}
    {@const r = RIDERS[BUILD_NAME]}
    <div class="space-y-5">
      <div>
        <p class="text-xs text-white/60">{r.nationality} · {r.years} · {r.specialty}</p>
      </div>
      <p class="text-sm text-white/85 leading-relaxed">{r.bio}</p>
      <div>
        <p class="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Palmares</p>
        <ul class="space-y-1.5">
          {#each r.wins as win}
            <li class="flex items-start gap-2.5">
              <span class="w-1.5 h-1.5 rounded-full bg-mdb-green flex-shrink-0 mt-1.5"></span>
              <span class="text-sm text-white/85">{win}</span>
            </li>
          {/each}
        </ul>
      </div>
      <button
        onclick={() => { riderOpen = false; changelogOpen = true; }}
        class="w-full py-3 rounded-full bg-mdb-green text-mdb-ink text-sm font-semibold active:opacity-70 transition-opacity"
      >
        Was ist neu in v{VERSION}?
      </button>
    </div>
  {/if}
</BottomSheet>

<BottomSheet bind:open={changelogOpen} title="Was ist neu">
  <div class="space-y-4">
    <p class="text-xs text-white/60 font-semibold uppercase tracking-wider">v{VERSION} · {BUILD_NAME}</p>
    <ul class="space-y-3">
      {#each CHANGELOG as item}
        <li class="flex items-start gap-3">
          <span class="w-1.5 h-1.5 rounded-full bg-mdb-green flex-shrink-0 mt-1.5"></span>
          <span class="text-sm text-white/80 leading-snug">{item}</span>
        </li>
      {/each}
    </ul>
    <button
      onclick={() => changelogOpen = false}
      class="w-full py-3.5 rounded-full bg-mdb-green text-mdb-ink font-semibold text-sm mt-2"
    >
      Verstanden
    </button>
  </div>
</BottomSheet>

<BottomSheet bind:open={impressumOpen} title="Impressum">
  <div class="space-y-4 text-sm text-white/70">
    <div>
      <p class="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Angaben gemäß § 5 TMG</p>
      <p class="text-white">Daniel Muschinski</p>
      <p>Freudenbergstraße 4</p>
      <p>28213 Bremen</p>
    </div>
    <div>
      <p class="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Kontakt</p>
      <a href="mailto:moindnl@proton.me" class="text-mdb-green">moindnl@proton.me</a>
    </div>
    <div>
      <p class="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Externe Dienste</p>
      <p>Diese App nutzt folgende externe APIs:</p>
      <ul class="mt-1 space-y-1 list-disc list-inside">
        <li><span class="text-white">Open-Meteo</span> — Wetterdaten (GPS-Koordinaten, Zeitstempel)</li>
        <li><span class="text-white">OpenRouteService</span> — Routenberechnung (GPS-Koordinaten)</li>
        <li><span class="text-white">OpenFreeMap</span> — Kartendarstellung</li>
      </ul>
      <p class="mt-2 text-white/60 text-xs">Es werden keine personenbezogenen Daten gespeichert oder weitergegeben. Name und API-Key werden ausschließlich lokal auf dem Gerät gespeichert.</p>
    </div>
  </div>
</BottomSheet>

<BottomSheet bind:open={compareOpen} title="Routen vergleichen">
  {#if allRoutes.length > 1}
    {@const sorted = [...allRoutes]
      .map((r, i) => ({ r, i }))
      .sort((a, b) => b.r.windScore - a.r.windScore)}
    <p class="text-xs text-white/60 mb-3">Sortiert nach Rückenwind auf dem Rückweg — je höher, desto angenehmer die Heimfahrt.</p>
    <div class="space-y-2">
      {#each sorted as { r, i }, rank}
        <button
          onclick={() => { slideDir = i > routeIndex ? 1 : -1; routeIndex = i; compareOpen = false; }}
          class="w-full text-left rounded-2xl border transition-colors active:scale-[0.98] active:transition-none
            {rank === 0
              ? 'border-mdb-green bg-mdb-green/10'
              : 'border-white/12 bg-white/4'}"
        >
          <div class="px-4 py-3">
            <!-- Top row: rank + wind score -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                {#if rank === 0}
                  <Star size={13} color="#00ed64" />
                  <span class="text-xs font-semibold text-mdb-green">Empfehlung</span>
                {:else}
                  <span class="text-xs text-white/60">#{rank + 1}</span>
                {/if}
              </div>
              <span class="text-sm font-bold {rank === 0 ? 'text-mdb-green' : 'text-white/70'}">
                {windArrow(r.windScore)} {r.windScore}%
              </span>
            </div>
            <!-- Stats row -->
            <div class="flex items-center gap-4 text-xs text-white/70">
              <span>{r.distanceKm} km</span>
              <span class="text-white/30">·</span>
              <span>{fmt(r.durationMin)}</span>
              <span class="text-white/30">·</span>
              <span>{r.elevationGain} Hm</span>
              <span class="text-white/30">·</span>
              <span>Start {windDirectionLabel(r.startBearing)}</span>
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</BottomSheet>

<BottomSheet bind:open={roadmapOpen} title="Roadmap">
  <div class="space-y-2">
    <p class="text-xs text-white/60 mb-3">Was als nächstes kommt — keine Versprechen, keine Deadlines.</p>
    {#each [
      { icon: Route,    label: 'Route-Farbe nach Untergrund', detail: 'Grün · Gelb · Orange auf der Karte' },
      { icon: Bookmark, label: 'Route speichern',             detail: 'Letzte Touren wiederfinden' },
      { icon: Globe,    label: 'Sprach-Switch DE/EN',         detail: 'Englische Oberfläche' },
      { icon: WifiOff,  label: 'Offline-Modus',               detail: 'App startet ohne Netz' },
    ] as item}
      {@const Icon = item.icon}
      <div class="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
        <div class="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center flex-shrink-0">
          <Icon size={16} color="rgba(255,255,255,0.5)" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-white/85 font-medium">{item.label}</p>
          <p class="text-xs text-white/60 mt-0.5">{item.detail}</p>
        </div>
      </div>
    {/each}
  </div>
</BottomSheet>

<BottomSheet bind:open={faqOpen} title="FAQ">
  <ul class="space-y-3 text-sm text-white/70">
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">?</span>
      <p><strong class="text-white">Warum weicht die Distanz ab?</strong> — Echte Straßen, keine Luftlinie. Schleifen können nicht exakt auf den Meter geplant werden — ±15 % sind normal.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">?</span>
      <p><strong class="text-white">Warum wird keine Route gefunden?</strong> — Distanz erhöhen, Steigung auf „Beliebig" oder Untergrund auf „Gemischt" wechseln. Engere Filter schließen viele Wege aus.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">?</span>
      <p><strong class="text-white">Was bedeutet der Rückenwind-%?</strong> — Anteil der geschätzten Rückweg-Zeit mit günstigem Wind (±60°). 100 % = voller Rückenwind nach Hause.</p>
    </li>
  </ul>
</BottomSheet>

<BottomSheet bind:open={anleitungOpen} title="Anleitung">
  <ul class="space-y-3 text-sm text-white/70">
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">1</span>
      <p><strong class="text-white">Profil & Einstellungen</strong> — Avatar-Icon oben links: Name hinterlegen, Standard-Untergrund, Steigung, Distanz und Durchschnittsgeschwindigkeit festlegen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">2</span>
      <p><strong class="text-white">Startpunkt & Startzeit</strong> — Standort per GPS ermitteln oder Adresse eingeben. Startzeit wählen — Wetter und Wind werden exakt für diesen Zeitpunkt abgerufen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">3</span>
      <p><strong class="text-white">Distanz & Dauer</strong> — Zielwerte per Schieberegler einstellen. Umschalten zwischen km-Ziel und Zeitbudget.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">4</span>
      <p><strong class="text-white">Untergrund & Steigung</strong> — Belag und maximale Bergigkeit wählen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">5</span>
      <p><strong class="text-white">Route berechnen</strong> — Wind-optimierte Schleife mit Wetter, Höhenprofil und Tipps. Zwischen Routen wechseln, weitere laden oder per Vergleichs-Icon alle Routen nach Rückenwind sortiert sehen.</p>
    </li>
    <li class="flex gap-3 items-start">
      <span class="w-5 h-5 rounded-full bg-mdb-green flex-shrink-0 flex items-center justify-center text-mdb-ink text-xs font-bold">6</span>
      <p><strong class="text-white">Teilen & GPX</strong> — Route teilen oder als GPX-Datei exportieren — direkt in Garmin, Wahoo oder Komoot importierbar.</p>
    </li>
  </ul>
</BottomSheet>
