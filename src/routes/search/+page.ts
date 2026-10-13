// Prerender /search as an empty shell; the page searches in the browser (see +page.svelte).
// Don't add a load function that searches: <body data-sveltekit-preload-data="hover"> runs load
// functions when someone hovers over a link, which would start a paid search.
export const ssr = false
