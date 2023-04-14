import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import { getUserId } from '$lib/server/utils'

export const POST: RequestHandler = async (event) => {
	const data = await event.request.json()
	const userId = getUserId(event)

	const res = await event.fetch(`${env.SERVER_HOST}/rate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			session: data.session,
			result: data.result,
			score: data.score,
			user: userId
		})
	})
	return res
}
