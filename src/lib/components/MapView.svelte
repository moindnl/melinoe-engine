<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
  import type { RoutePoint } from '$lib/services/routing';

  let { coordinates, origin, lineColor = '#007AFF' }: { coordinates: RoutePoint[]; origin: RoutePoint; lineColor?: string } = $props();

  let mapContainer: HTMLDivElement;
  let map: MaplibreMap | null = null;
  let styleLoaded = false;

  function buildGeoJSON(coords: RoutePoint[]) {
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coords.map(p => [p.lon, p.lat])
      }
    };
  }

  function fitRoute(coords: RoutePoint[]) {
    if (!map) return;
    const minLon = coords.reduce((m, p) => Math.min(m, p.lon), Infinity);
    const maxLon = coords.reduce((m, p) => Math.max(m, p.lon), -Infinity);
    const minLat = coords.reduce((m, p) => Math.min(m, p.lat), Infinity);
    const maxLat = coords.reduce((m, p) => Math.max(m, p.lat), -Infinity);
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 600 });
  }

  // Update route line when coordinates change (route switch)
  $effect(() => {
    const coords = coordinates; // track reactively
    if (!map || !styleLoaded) return;
    const source = map.getSource('route') as GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJSON(coords));
      fitRoute(coords);
    }
  });

  onMount(async () => {
    const ml = await import('maplibre-gl');
    const maplibregl = ml.default;

    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [origin.lon, origin.lat],
      zoom: 11,
      attributionControl: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      styleLoaded = true;

      map!.addSource('route', { type: 'geojson', data: buildGeoJSON(coordinates) });
      map!.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': lineColor, 'line-width': 4, 'line-opacity': 0.9 }
      });

      const el = document.createElement('div');
      el.style.cssText = `width:20px;height:20px;background:${lineColor};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)`;
      new maplibregl.Marker({ element: el })
        .setLngLat([origin.lon, origin.lat])
        .addTo(map!);

      fitRoute(coordinates);
    });
  });

  onDestroy(() => {
    styleLoaded = false;
    map?.remove();
    map = null;
  });
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-t-2xl overflow-hidden" aria-label="Routenkarte" role="img"></div>
