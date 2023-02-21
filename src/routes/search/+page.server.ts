import { env } from '$env/dynamic/private'
import type { PageServerLoad } from './$types';

export const load : PageServerLoad = async ({ fetch, url }) => {
    const q = url.searchParams.get('q')

    if (!q) {
        return {q: '', results: []}
    }

    const requestUrl = `${env.SERVER_HOST}/search?q=${encodeURIComponent(q)}`
    console.log('requestUrl=', requestUrl)
    const res = await fetch(requestUrl)
    return res.json()
}