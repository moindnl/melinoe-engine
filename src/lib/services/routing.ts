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
  any:      null,
};

export interface ElevationPoint {
  distanceKm: number;
  elevationM: number;
}

export interface RouteResult {
  coordinates: RoutePoint[];
  elevationProfile: ElevationPoint[];
  distanceKm: number;
  durationMin: number;
  elevationGain: number;
  elevationLoss: number;
  surface: SurfaceType;
  gradient: GradientLevel;
  windScore: number;    // 0-100
  startBearing: number; // degrees 0-360, initial heading from origin
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
    const diff = ((bearing - windToDeg + 540) % 360) - 180;
    const alignment = Math.cos((diff * Math.PI) / 180); // 1=tailwind, -1=headwind
    const segLen = Math.hypot(coords[i].lon - coords[i - 1].lon, coords[i].lat - coords[i - 1].lat);
    // Weight second half more (tailwind home)
    const posWeight = 0.5 + (i / n) * 0.5;
    score += alignment * segLen * posWeight;
    totalLen += segLen * posWeight;
  }
  return totalLen > 0 ? ((score / totalLen + 1) / 2) * 100 : 50;
}

// ── Geodesy helpers ───────────────────────────────────────────────────────────

// Compute a waypoint at given bearing (degrees) and distance (km) from origin
function computeWaypoint(origin: RoutePoint, bearingDeg: number, distanceKm: number): RoutePoint {
  const R = 6371;
  const d = distanceKm / R;
  const b = (bearingDeg * Math.PI) / 180;
  const φ1 = (origin.lat * Math.PI) / 180;
  const λ1 = (origin.lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
}

// ── ORS data type ─────────────────────────────────────────────────────────────

interface OrsRouteData {
  coords: RoutePoint[];
  elevations: number[];
}

// ── Triangle waypoint routing ─────────────────────────────────────────────────
//
// Strategy: generate 4 candidate loops as triangles (NE / SE / SW / NW).
// Each triangle has 2 waypoints placed at specific bearings from origin.
// ORS routes origin → wp1 → wp2 → origin along the road network.
// Wind-score all successful routes, return best.
//
// This produces genuinely different loop shapes per distance and direction,
// unlike round_trip which always generates circular/elliptical geometry.

async function fetchOrsViaWaypoints(
  apiKey: string,
  profile: string,
  waypoints: RoutePoint[],
  gradient: GradientLevel,
): Promise<OrsRouteData> {
  const profilesToTry = profile === 'cycling-regular'
    ? ['cycling-regular', 'cycling-road']
    : [profile, 'cycling-regular'];

  const difficulty = steepnessDifficulty[gradient];
  const body: Record<string, unknown> = {
    coordinates: waypoints.map(p => [p.lon, p.lat]),
    elevation: true,
  };
  if (difficulty !== null) {
    body.options = { profile_params: { weightings: { steepness_difficulty: difficulty } } };
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

function orsDataToResult(
  r: OrsRouteData,
  windScore: number,
  speedKmh: number,
  surface: SurfaceType,
  gradient: GradientLevel,
): RouteResult {
  let distM = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  const cumDist: number[] = [0];

  for (let i = 1; i < r.coords.length; i++) {
    const dlat = (r.coords[i].lat - r.coords[i - 1].lat) * 111000;
    const dlon = (r.coords[i].lon - r.coords[i - 1].lon) * 111000 * Math.cos((r.coords[i].lat * Math.PI) / 180);
    distM += Math.hypot(dlat, dlon);
    cumDist.push(distM);
    const dEle = r.elevations[i] - r.elevations[i - 1];
    if (dEle > 0) elevationGain += dEle;
    else elevationLoss += Math.abs(dEle);
  }

  // Average bearing over first ~10% of route for a stable starting direction
  const lookAhead = Math.max(2, Math.floor(r.coords.length * 0.10));
  const startBearing = ((bearingDeg(r.coords[0], r.coords[Math.min(lookAhead, r.coords.length - 1)]) % 360) + 360) % 360;

  const distanceKm = Math.round(distM / 100) / 10;
  const elevationProfile = buildProfile(r.coords, r.elevations, cumDist, 100);
  const maxEle = Math.round(distanceKm * 30);

  return {
    coordinates: r.coords,
    elevationProfile,
    distanceKm,
    durationMin: Math.round(distanceKm / speedKmh * 60),
    elevationGain: Math.min(Math.round(elevationGain), maxEle),
    elevationLoss: Math.min(Math.round(elevationLoss), maxEle),
    windScore: Math.round(windScore),
    startBearing,
    surface,
    gradient,
  };
}

async function generateWithOrs(
  apiKey: string,
  origin: RoutePoint,
  targetDistanceKm: number,
  speedKmh: number,
  windDirection: number,
  surface: SurfaceType,
  gradient: GradientLevel,
  bearingOffset = 0,
): Promise<RouteResult[]> {
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
    throw new Error(`Ungültige Koordinate: lon=${origin.lon}, lat=${origin.lat}`);
  }
  if (!Number.isFinite(targetDistanceKm)) {
    throw new Error(`Ungültige Distanz: ${targetDistanceKm}`);
  }

  const profile = orsProfile[surface];
  const side = (targetDistanceKm / 3) * 0.70;

  const candidateWaypoints: RoutePoint[][] = [45, 135, 225, 315].map(theta => {
    const t = theta + bearingOffset;
    const wp1 = computeWaypoint(origin, t, side);
    const wp2 = computeWaypoint(origin, t + 60, side);
    return [origin, wp1, wp2, origin];
  });

  const results = await Promise.allSettled(
    candidateWaypoints.map(wps => fetchOrsViaWaypoints(apiKey, profile, wps, gradient))
  );

  const rawRoutes: OrsRouteData[] = results
    .filter((r): r is PromiseFulfilledResult<OrsRouteData> => r.status === 'fulfilled')
    .map(r => r.value);

  // Discard candidates with wildly wrong distance (mountain profiles can detour 3×)
  const minKm = targetDistanceKm * 0.4;
  const maxKm = targetDistanceKm * 1.6;
  const validRoutes = rawRoutes.filter(r => {
    let distM = 0;
    for (let i = 1; i < r.coords.length; i++) {
      const dlat = (r.coords[i].lat - r.coords[i - 1].lat) * 111000;
      const dlon = (r.coords[i].lon - r.coords[i - 1].lon) * 111000 * Math.cos((r.coords[i].lat * Math.PI) / 180);
      distM += Math.hypot(dlat, dlon);
    }
    return distM / 1000 >= minKm && distM / 1000 <= maxKm;
  });

  if (validRoutes.length === 0) throw new Error('Für diese Kombination aus Distanz, Untergrund und Steigung konnte keine Route berechnet werden. Bitte andere Einstellungen versuchen.');

  const scored = validRoutes
    .map(r => ({ data: r, score: scoreRouteByWind(r.coords, windDirection) }))
    .sort((a, b) => b.score - a.score);

  return scored.map(s => orsDataToResult(s.data, s.score, speedKmh, surface, gradient));
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

// ── Public entry point ────────────────────────────────────────────────────────

export async function generateOptimalLoop(
  origin: RoutePoint,
  targetDistanceKm: number,
  speedKmh: number,
  windDirection: number,
  surface: SurfaceType = 'road',
  gradient: GradientLevel = 'any',
  bearingOffset = 0,
): Promise<RouteResult[]> {
  const apiKey = getOrsApiKey();
  if (!apiKey) {
    throw new Error('Kein ORS-API-Key hinterlegt. Bitte in den Einstellungen eintragen.');
  }
  return generateWithOrs(apiKey, origin, targetDistanceKm, speedKmh, windDirection, surface, gradient, bearingOffset);
}
