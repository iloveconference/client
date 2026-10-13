// Prerender every page to static HTML for adapter-static. /search opts out of SSR (search/+page.ts).
export const prerender = true

// Write /static/about as static/about.html rather than static/about/index.html. The CloudFront
// Function in front of the site bucket appends ".html" to extensionless paths, so it relies on this.
export const trailingSlash = 'never'
