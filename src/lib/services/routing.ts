export interface RoutePoint {
  lat: number;
  lon: number;
}

export type SurfaceType = 'road' | 'mixed' | 'gravel';

export const surfaceLabels: Record<SurfaceType, string> = {
  road:   'Asphalt',
  mixed:  'Gemischt',
  gravel: 'Schotter',
};

export const orsProfile: Record<SurfaceType, string> = {
  road:   'cycling-road',
  mixed:  'cycling-regular',
  gravel: 'cycling-mountain',
};

// Steepness: how much to avoid steep terrain (ORS steepness_difficulty 0-3)
// Higher = flatter routes preferred
export type GradientLevel = 'flat' | 'moderate' | 'hilly' | 'any';

export const gradientLabels: Record<GradientLevel, string> = {
  flat:     'Flach',
  moderate: 'Moderat',
  hilly:    'Hügelig',
  any:      'Beliebig',
};

export const gradientSubLabels: Record<GradientLevel, string> = {
  flat:     '< 4 %',
  moderate: '< 8 %',
  hilly:    '< 12 %',
  any:      'egal',
};

// ORS steepness_difficulty: 3=avoid steep, 0=no preference
const steepnessDifficulty: Record<GradientLevel, number | null> = {
  flat:     3,
  moderate: 2,
  hilly:    1,
  any:      null, // omit param entirely
};

export interface ElevationPoint {
  distanceKm: number;  // cumulative distance from start
  elevationM: number;  // meters above sea level
}

export interface RouteResult {
  coordinates: RoutePoint[];
  elevationProfile: ElevationPoint[]; // sampled for chart
  distanceKm: number;
  durationMin: number;
  elevationGain: number;
  elevationLoss: number;
  surface: SurfaceType;
  gradient: GradientLevel;
  windScore: number; // 0-100
}

// ── API key resolution ──────────────────────────────────────────────────────

export function getOrsApiKey(): string | null {
  const env = import.meta.env.VITE_ORS_API_KEY;
  if (env && env !== 'your_key_here') return env;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('ors_api_key');
  }
  return null;
}

export function saveOrsApiKey(key: string) {
  localStorage.setItem('ors_api_key', key.trim());
}

// ── Wind scoring ────────────────────────────────────────────────────────────

function bearingDeg(from: RoutePoint, to: RoutePoint): number {
  const dLon = to.lon - from.lon;
  const dLat = to.lat - from.lat;
  return (Math.atan2(dLon, dLat) * 180) / Math.PI;
}

function scoreRouteByWind(coords: RoutePoint[], windFromDeg: number): number {
  // Wind blows FROM windFromDeg → tailwind when heading TOWARDS windFromDeg+180
  const windToDeg = (windFromDeg + 180) % 360;
  let score = 0;
  let totalLen = 0;
  const n = coords.length;

  for (let i = 1; i < n; i++) {
    const bearing = bearingDeg(coords[i - 1], coords[i]);
    const diff = ((bearing - windToDeg + 540) % 360) - 180; // -180..180
    const alignment = Math.cos((diff * Math.PI) / 180); // 1=tailwind, -1=headwind
    const segLen = Math.hypot(coords[i].lon - coords[i - 1].lon, coords[i].lat - coords[i - 1].lat);
    // Weight the second half of the route more (we want tailwind coming home)
    const posWeight = 0.5 + (i / n) * 0.5;
    score += alignment * segLen * posWeight;
    totalLen += segLen * posWeight;
  }
  return totalLen > 0 ? ((score / totalLen + 1) / 2) * 100 : 50; // normalise 0-100
}

// ── ORS data type ─────────────────────────────────────────────────────────────

interface OrsRouteData {
  coords: RoutePoint[];
  elevations: number[]; // meters, one per coord
}

// ── Round-trip with wind optimisation ────────────────────────────────────────
//
// Strategy: request 5 ORS round-trips with different seeds from the same
// origin, score each by wind alignment, return the best one.
// ORS round_trip option generates genuine loops (not back-and-forth).

function assertFinite(label: string, v: number) {
  if (!Number.isFinite(v)) throw new Error(`Koordinate ungültig: ${label} = ${v}`);
}

async function fetchOrsRoundTrip(
  apiKey: string,
  profile: string,
  origin: RoutePoint,
  lengthM: number,
  seed: number,
  gradient: GradientLevel,
): Promise<OrsRouteData> {
  if (!Number.isFinite(origin.lon) || !Number.isFinite(origin.lat)) {
    throw new Error(`Ungültige Koordinate: lon=${origin.lon}, lat=${origin.lat}`);
  }

  const profilesToTry = profile === 'cycling-regular'
    ? ['cycling-regular', 'cycling-road']
    : [profile, 'cycling-regular'];

  const difficulty = steepnessDifficulty[gradient];
  const body: Record<string, unknown> = {
    coordinates: [[origin.lon, origin.lat]],
    elevation: true,
    options: {
      round_trip: { length: lengthM, points: 3, seed },
    },
  };
  if (difficulty !== null) {
    body.profile_params = { weightings: { steepness_difficulty: difficulty } };
  }

  for (const p of profilesToTry) {
    const url = `https://api.openrouteservice.org/v2/directions/${p}/geojson`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 404) continue;

    if (!res.ok) {
      const text = await res.text();
      console.warn(`ORS ${p} ${res.status}:`, text);
      throw new Error(`ORS ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const geom: [number, number, number?][] = data.features[0].geometry.coordinates;
    return {
      coords:     geom.map(([lon, lat]) => ({ lat, lon })),
      elevations: geom.map(([,, ele]) => ele ?? 0),
    };
  }

  throw new Error(`ORS: kein Profil verfügbar (${profilesToTry.join(', ')})`);
}

async function generateWithOrs(
  apiKey: string,
  origin: RoutePoint,
  targetDistanceKm: number,
  targetDurationMin: number,
  windDirection: number,
  surface: SurfaceType,
  gradient: GradientLevel,
): Promise<RouteResult> {
  assertFinite('origin.lat', origin.lat);
  assertFinite('origin.lon', origin.lon);
  assertFinite('targetDistanceKm', targetDistanceKm);

  const profile = orsProfile[surface];
  const lengthM = targetDistanceKm * 1000;
  const seeds = [1, 2, 3, 4, 5];

  const results = await Promise.allSettled(
    seeds.map(seed => fetchOrsRoundTrip(apiKey, profile, origin, lengthM, seed, gradient))
  );

  // Collect successful routes
  const routes: OrsRouteData[] = results
    .filter((r): r is PromiseFulfilledResult<OrsRouteData> => r.status === 'fulfilled')
    .map(r => r.value);

  if (routes.length === 0) throw new Error('Alle ORS-Anfragen fehlgeschlagen.');

  // Score each and pick winner
  const scored = routes.map(r => ({
    data: r,
    score: scoreRouteByWind(r.coords, windDirection),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].data;

  // Compute actual distance + elevation gain/loss from coordinates
  let distM = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  const cumDist: number[] = [0];

  for (let i = 1; i < best.coords.length; i++) {
    const dlat = (best.coords[i].lat - best.coords[i - 1].lat) * 111000;
    const dlon = (best.coords[i].lon - best.coords[i - 1].lon) * 111000 * Math.cos((best.coords[i].lat * Math.PI) / 180);
    distM += Math.hypot(dlat, dlon);
    cumDist.push(distM);

    const dEle = best.elevations[i] - best.elevations[i - 1];
    if (dEle > 0) elevationGain += dEle;
    else elevationLoss += Math.abs(dEle);
  }

  const distanceKm = Math.round(distM / 100) / 10;

  // Sample elevation profile to ~100 points for the chart
  const elevationProfile = buildProfile(best.coords, best.elevations, cumDist, 100);

  const durFactor = surface === 'gravel' ? 1.15 : surface === 'mixed' ? 1.05 : 0.95;
  const durationMin = Math.round(targetDurationMin * durFactor);

  return {
    coordinates: best.coords,
    elevationProfile,
    distanceKm,
    durationMin,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    windScore: Math.round(scored[0].score),
    surface,
    gradient,
  };
}

function buildProfile(
  coords: RoutePoint[],
  elevations: number[],
  cumDist: number[],
  samples: number,
): ElevationPoint[] {
  if (coords.length === 0) return [];
  const totalM = cumDist[cumDist.length - 1];
  const step = totalM / samples;
  const profile: ElevationPoint[] = [];
  let j = 0;
  for (let s = 0; s <= samples; s++) {
    const targetM = s * step;
    while (j < cumDist.length - 2 && cumDist[j + 1] < targetM) j++;
    const t = cumDist[j + 1] > cumDist[j]
      ? (targetM - cumDist[j]) / (cumDist[j + 1] - cumDist[j])
      : 0;
    const ele = elevations[j] + t * (elevations[j + 1] - elevations[j]);
    profile.push({ distanceKm: Math.round(targetM / 100) / 10, elevationM: Math.round(ele) });
  }
  return profile;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function generateMock(
  origin: RoutePoint,
  targetDistanceKm: number,
  targetDurationMin: number,
  windDirection: number,
  surface: SurfaceType,
  gradient: GradientLevel,
): RouteResult {
  const radiusKm = targetDistanceKm / (2 * Math.PI);
  const radiusDeg = radiusKm / 111;
  const towardWindRad = (windDirection * Math.PI) / 180;
  const offsetLat = Math.cos(towardWindRad) * radiusDeg * 0.25;
  const offsetLon = Math.sin(towardWindRad) * radiusDeg * 0.25;
  const points: RoutePoint[] = [origin];
  for (let i = 0; i <= 24; i++) {
    const angle = (i / 24) * 2 * Math.PI;
    points.push({
      lat: origin.lat + offsetLat + Math.cos(angle) * radiusDeg,
      lon: origin.lon + offsetLon + Math.sin(angle) * radiusDeg * 1.3,
    });
  }
  points.push({ ...origin });
  const elevFactor = surface === 'gravel' ? 14 : surface === 'mixed' ? 10 : 8.5;
  const durFactor  = surface === 'gravel' ? 1.15 : surface === 'mixed' ? 1.05 : 0.95;
  const distanceKm = Math.round(targetDistanceKm * 0.97 * 10) / 10;
  const elevationGain = Math.round(distanceKm * elevFactor);

  // Simulate a plausible elevation profile
  const samples = 60;
  const elevationProfile: ElevationPoint[] = Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const angle = t * 2 * Math.PI;
    const base = 300;
    const amp = elevationGain / 4;
    return {
      distanceKm: Math.round(distanceKm * t * 10) / 10,
      elevationM: Math.round(base + amp * Math.sin(angle) + amp * 0.4 * Math.sin(angle * 3)),
    };
  });

  return {
    coordinates: points,
    elevationProfile,
    distanceKm,
    durationMin:  Math.round(targetDurationMin * durFactor),
    elevationGain,
    elevationLoss: elevationGain,
    windScore: Math.round(scoreRouteByWind(points, windDirection)),
    surface,
    gradient,
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function generateOptimalLoop(
  origin: RoutePoint,
  targetDistanceKm: number,
  targetDurationMin: number,
  windDirection: number,
  _windSpeed: number,
  surface: SurfaceType = 'road',
  gradient: GradientLevel = 'any',
): Promise<RouteResult> {
  const apiKey = getOrsApiKey();
  if (apiKey) {
    try {
      return await generateWithOrs(apiKey, origin, targetDistanceKm, targetDurationMin, windDirection, surface, gradient);
    } catch (e) {
      console.error('ORS fehlgeschlagen, Fallback auf Mock:', e);
    }
  }
  await new Promise(r => setTimeout(r, 1200));
  return generateMock(origin, targetDistanceKm, targetDurationMin, windDirection, surface, gradient);
}
