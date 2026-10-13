<script lang="ts">
	import '@picocss/pico'
	import '../app.css'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	onMount(() => {
		// Start the search Lambda now so its cold start is over before the visitor's first search.
		// /search skips this because it sends a search right away.
		if ($page.url.pathname !== '/search') {
			fetch('/api/warm', { cache: 'no-store' }).catch(() => {
				// Warming up is best effort.
			})
		}
	})
</script>

<slot />
