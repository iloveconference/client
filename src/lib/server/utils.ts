import type { RequestEvent } from '@sveltejs/kit'

function hash(str: string) {
	let hash = 5381
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) + hash + str.charCodeAt(i)
	}
	return hash
}

export function getUserId(event: RequestEvent) {
	// get real ip
	let ip
	const xForwardedFor = event.request.headers.get('x-forwarded-for')
	if (!xForwardedFor) {
		ip = event.getClientAddress()
	} else {
		const ips = xForwardedFor.split(',')
		// real ip is second-to-last if there are multiple because we have one proxy
		ip = (ips.length > 1 ? ips[ips.length - 2] : ips[0]).trim()
	}
	const userAgent = event.request.headers.get('user-agent')
	return hash(`${ip}-${userAgent}`)
}
