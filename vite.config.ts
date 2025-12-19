import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			srcDir: 'src',
			filename: 'sw.ts',
			strategies: 'injectManifest',
			injectManifest: {
				swSrc: 'src/sw.ts',
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
			},
			manifest: {
				name: 'BodyMetrics',
				short_name: 'BodyMetrics',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: 'favicon.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'favicon.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	]
});
