import type { PageServerLoad } from './$types';
import { dev, building } from "$app/environment";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from '$env/dynamic/private'
import { error } from "@sveltejs/kit";

let redis: Redis;
let ratelimit: Ratelimit;

if (!building) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, "86400 s")
  });
}

export const load : PageServerLoad = async (event) => {
    const q = event.url.searchParams.get('q')

    if (!q) {
        return {q: '', results: []}
    }

    // get ip
    let ip = event.getClientAddress();
    const xForwardedFor = event.request.headers.get('x-forwarded-for')
    if (xForwardedFor) {
        const ips = xForwardedFor.split(',')
        // real ip is second-to-last if there are multiple because we have one proxy
        ip = (ips.length > 1 ? ips[ips.length-2] : ips[0]).trim()
        console.log('ip', ip, 'x-forwarded-for', xForwardedFor, 'ips', ips)
    }

    if (!dev) {
        // rate limit
        const rateLimitAttempt = await ratelimit.limit(ip);
        if (!rateLimitAttempt.success) {
        //   const timeRemaining = Math.floor(
        //     (rateLimitAttempt.reset - new Date().getTime()) / 1000
        //   );
        throw error(429, `
            Too many requests. 
            Generating answers is somewhat expensive 
            so currently we set a limit on how many queries can be performed each day.
            Please try again after this time tomorrow.
        `)
        }
    }

    const requestUrl = `${env.SERVER_HOST}/search?q=${encodeURIComponent(q)}`
    console.log('requestUrl=', requestUrl)
    // const res = await event.fetch(requestUrl)
    const results = Array.from(event.request.headers.entries(), ([key, value]) => { 
        return {"title": key, "text": value} 
    })
    return { "answer": ip, "results": results }
    // return res.json()
}