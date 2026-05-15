<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Map as MaplibreMap } from 'maplibre-gl';
  import type { RoutePoint } from '$lib/services/routing';

  let { coordinates, origin, lineColor = '#007AFF' }: { coordinates: RoutePoint[]; origin: RoutePoint; lineColor?: string } = $props();

  let mapContainer: HTMLDivElement;
  let map: MaplibreMap | null = null;

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
      const geojson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: coordinates.map(p => [p.lon, p.lat])
        }
      };

      map!.addSource('route', { type: 'geojson', data: geojson });
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

      const minLon = coordinates.reduce((m, p) => Math.min(m, p.lon), Infinity);
      const maxLon = coordinates.reduce((m, p) => Math.max(m, p.lon), -Infinity);
      const minLat = coordinates.reduce((m, p) => Math.min(m, p.lat), Infinity);
      const maxLat = coordinates.reduce((m, p) => Math.max(m, p.lat), -Infinity);
      map!.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        { padding: 40, duration: 800 }
      );
    });
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-t-2xl overflow-hidden" aria-label="Routenkarte" role="img"></div>
