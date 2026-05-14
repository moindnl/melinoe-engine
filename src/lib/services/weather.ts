export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number; // degrees 0-360, meteorological (where wind comes FROM)
  condition: 'sunny' | 'cloudy' | 'rainy' | 'windy';
}

// WMO weather code → condition
function wmoToCondition(code: number): WeatherData['condition'] {
  if (code === 0 || code === 1) return 'sunny';
  if (code <= 3) return 'cloudy';
  if (code >= 51 && code <= 82) return 'rainy';
  if (code >= 85 && code <= 86) return 'rainy';
  if (code >= 95) return 'rainy';
  if (code >= 71 && code <= 77) return 'rainy';
  return 'cloudy';
}

export async function fetchWeather(lat: number, lon: number, startTime: Date): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(6));
  url.searchParams.set('longitude', lon.toFixed(6));
  url.searchParams.set('hourly', 'temperature_2m,windspeed_10m,winddirection_10m,weathercode');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '3');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
  const data = await res.json();

  // Find index of closest hour to startTime
  const target = startTime.toISOString().slice(0, 13); // "2024-01-15T14"
  let idx = data.hourly.time.findIndex((t: string) => t.startsWith(target));
  if (idx < 0) {
    // clamp to nearest available
    const now = new Date().toISOString().slice(0, 13);
    idx = data.hourly.time.findIndex((t: string) => t.startsWith(now));
    if (idx < 0) idx = 0;
  }

  return {
    temperature:   Math.round(data.hourly.temperature_2m[idx]),
    windSpeed:     Math.round(data.hourly.windspeed_10m[idx]),
    windDirection: Math.round(data.hourly.winddirection_10m[idx]),
    condition:     wmoToCondition(data.hourly.weathercode[idx])
  };
}

export function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}
