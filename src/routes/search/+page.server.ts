import type { PageServerLoad } from './$types';
import { building } from "$app/environment";
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

    // rate limit
    const ip = event.getClientAddress();
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

    const requestUrl = `${env.SERVER_HOST}/search?q=${encodeURIComponent(q)}`
    console.log('requestUrl=', requestUrl)
    const res = await event.fetch(requestUrl)
    return res.json()
}