import { env } from '$env/dynamic/private'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
	const requestUrl = `${env.SERVER_HOST}/health`
	return await fetch(requestUrl)
}
