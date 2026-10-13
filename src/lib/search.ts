/** One talk excerpt in a search response. */
export type SearchResult = {
	id: string
	title: string
	author: string
	year: string
	month: string
	url: string
	text: string
}

/** The body of a successful GET /api/search. */
export type SearchResponse = {
	q: string
	session: number
	answer: string
	results: SearchResult[]
}

/** What a search shows: the answer and results, or a message saying why there are none. */
export type SearchOutcome =
	| { ok: true; answer: string; results: SearchResult[] }
	| { ok: false; error: string }

/** The messages shown when a search fails. The first three match the API's error bodies. */
export const messages = {
	rateLimited:
		'Too many requests. Generating answers is somewhat expensive so currently we set a limit on how many queries can be performed each day. Please try again after this time tomorrow.',
	busy: 'The site is getting more questions than usual today. Please try again later.',
	unavailable: 'Search is temporarily unavailable. Please try again later.',
	tooLong: 'Please enter a shorter question.'
}

/**
 * The search API URL for the question q. Besides what encodeURIComponent encodes, this encodes
 * ! ' ( ) and *, so the query string already has the canonical form that CloudFront signs (SigV4)
 * when it forwards the request to the search function.
 */
export function searchUrl(q: string): string {
	const encoded = encodeURIComponent(q).replace(
		/[!'()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
	)
	return '/api/search?q=' + encoded
}

/**
 * The message for a failed search, given the HTTP status and the parsed JSON body (null when the
 * body isn't JSON, such as a CloudFront error page).
 */
export function errorMessage(status: number, body: unknown): string {
	if (status === 429) {
		// The API's 429s say {"error": "rate_limited"} (this client's daily limit) or
		// {"error": "busy"} (the site's daily limit). A 429 without "error" comes from Lambda
		// throttling (reserved concurrency), which also means the site is busy.
		return errorCode(body) === 'rate_limited' ? messages.rateLimited : messages.busy
	}
	if (status === 422) {
		// FastAPI rejected q. The page never sends an empty q, so it was over 100 characters.
		return messages.tooLong
	}
	// 503 {"error": "unavailable"}, CloudFront 502/504, and anything else.
	return messages.unavailable
}

/**
 * Search for q. Resolves with the outcome to show, including for HTTP and network errors, and
 * rejects only when signal is aborted.
 */
export async function search(
	q: string,
	signal: AbortSignal,
	fetchFn: typeof fetch = fetch
): Promise<SearchOutcome> {
	let response: Response
	try {
		response = await fetchFn(searchUrl(q), { signal })
	} catch (e) {
		if (signal.aborted) throw e
		return { ok: false, error: messages.unavailable }
	}

	let body: unknown = null
	try {
		body = await response.json()
	} catch (e) {
		if (signal.aborted) throw e
	}

	if (response.ok && isSearchResponse(body)) {
		return { ok: true, answer: body.answer, results: body.results }
	}
	return { ok: false, error: errorMessage(response.status, body) }
}

function errorCode(body: unknown): unknown {
	return typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : undefined
}

function isSearchResponse(body: unknown): body is SearchResponse {
	if (typeof body !== 'object' || body === null) return false
	const { answer, results } = body as Partial<SearchResponse>
	return typeof answer === 'string' && Array.isArray(results)
}
