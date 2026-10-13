import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	],
	server: {
		// In production CloudFront sends /api/* to the search Lambda. Locally, run the server repo's
		// FastAPI app on port 8000 (uvicorn server.main:app). `vite preview` uses this proxy too.
		proxy: {
			'/api': 'http://localhost:8000'
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
})
