import type { WeatherData } from './weather';
import type { RouteResult } from './routing';


export function generateRouteTips(weather: WeatherData, route: RouteResult): string[] {
  const tips: string[] = [];

  // Wind tip
  if (route.windScore >= 65) {
    tips.push(`Optimale Windnutzung: ${route.windScore}% Rückenwind auf der Rückfahrt. Starte zügig gegen den Wind.`);
  } else if (route.windScore >= 40) {
    tips.push(`Mäßiger Rückenwind (${route.windScore}%) auf der Rückfahrt. Halte ein gleichmäßiges Tempo.`);
  } else {
    tips.push('Windbedingungen wenig optimal heute. Wähle eine windgeschützte Route entlang von Wäldern.');
  }

  // Temperature tip
  if (weather.temperature < 10) {
    tips.push('Unter 10 °C: Thermo-Trikot, Finger- und Zehenwärmer empfohlen. Aufwärmen dauert länger.');
  } else if (weather.temperature < 16) {
    tips.push('Kühl: Arm- und Beinlinge mitgenommen? Windweste für die Abfahrten nicht vergessen.');
  } else if (weather.temperature > 28) {
    tips.push('Hitze: Mindestens 750 ml pro Stunde trinken. Sonnencreme auf Arme und Nacken.');
  } else {
    tips.push(`Angenehme ${weather.temperature} °C — ideale Rennradbedingungen. Kurztrikot reicht.`);
  }

  // Wind speed tip
  if (weather.windSpeed > 35) {
    tips.push('Böiger Wind über 35 km/h: Aero-Position beibehalten, seitliche Windböen beim Überholen beachten.');
  } else if (weather.windSpeed > 20) {
    tips.push(`${weather.windSpeed} km/h Wind: Kettenring eine Stufe kleiner gegen den Wind, Energie für die Rückfahrt einteilen.`);
  } else {
    tips.push(`Leichter Wind (${weather.windSpeed} km/h) — gute Bedingungen für Intervalle oder Tempo-Einheiten.`);
  }

  // Gradient tip
  if (route.gradient === 'flat') {
    tips.push('Flachroute: Aero-Position und hohes Tempo möglich. Gute Gelegenheit für Intervalle oder Tempoarbeit.');
  } else if (route.gradient === 'hilly') {
    tips.push(`Hügelige Strecke mit ~${route.elevationGain} Hm: Gleichmäßige Wattleistung an den Anstiegen, nicht überpacen.`);
  }

  // Surface tip
  if (route.surface === 'gravel') {
    tips.push(`Schotterroute: Reifendruck auf 2,5–3,5 bar senken. Tubeless empfohlen. ${route.elevationGain} Hm einplanen — mehr Körner als auf Asphalt.`);
  } else if (route.surface === 'mixed') {
    tips.push(`Gemischte Strecke: Asphalt-Reifen ≥ 28 mm sinnvoll. Schotterpässe können nach Regen rutschig sein.`);
  }

  return tips;
}
