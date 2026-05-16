import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				// Split MapLibre into its own chunk so it can be excluded from SW precache
				manualChunks: (id) => {
					if (id.includes('maplibre-gl')) return 'maplibre';
				}
			}
		}
	},
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'TrailBlazer Ultra',
				short_name: 'TrailBlazer',
				description: 'Windoptimierte Rennrad-Routenplanung',
				theme_color: '#007AFF',
				background_color: '#F2F2F7',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'map-tiles',
							expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 }
						}
					},
					{
						// Cache MapLibre chunk after first load (lazy import in MapView)
						urlPattern: /\/assets\/maplibre.*\.js$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'maplibre',
							expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }
						}
					}
				]
			}
		})
	]
});
