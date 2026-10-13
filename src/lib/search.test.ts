import { describe, expect, it, vi } from 'vitest'
import { errorMessage, messages, search, searchUrl, type SearchResponse } from './search'

const searchResponse: SearchResponse = {
	q: 'why are we here',
	session: 12345,
	answer: 'To gain a body and be tested.',
	results: [
		{
			id: 'talk-1',
			title: 'The Plan of Salvation',
			author: 'An Apostle',
			year: '2019',
			month: '10',
			url: 'https://www.churchofjesuschrist.org/study/general-conference/2019/10/talk#p1',
			text: 'We are here to learn and grow.'
		}
	]
}

/** A fetch that answers every request with the given status and body. */
function respondWith(status: number, body: string, contentType = 'application/json') {
	return vi.fn(
		async () => new Response(body, { status, headers: { 'Content-Type': contentType } })
	) as unknown as typeof fetch
}

describe('searchUrl', () => {
	it('encodes the question as the q parameter', () => {
		expect(searchUrl('where do we go when we die?')).toBe(
			'/api/search?q=where%20do%20we%20go%20when%20we%20die%3F'
		)
		expect(searchUrl('faith & works #1 + é')).toBe(
			'/api/search?q=faith%20%26%20works%20%231%20%2B%20%C3%A9'
		)
	})

	it("also encodes the characters encodeURIComponent leaves: ! ' ( ) *", () => {
		expect(searchUrl("what's (really) true!*")).toBe(
			'/api/search?q=what%27s%20%28really%29%20true%21%2A'
		)
		expect(searchUrl('a-b_c.d~e')).toBe('/api/search?q=a-b_c.d~e')
	})
})

describe('errorMessage', () => {
	it('maps each error to the message the page shows', () => {
		expect(errorMessage(429, { error: 'rate_limited', message: 'x' })).toBe(messages.rateLimited)
		expect(errorMessage(429, { error: 'busy', message: 'x' })).toBe(messages.busy)
		// Lambda throttling (reserved concurrency): a 429 without our "error" field.
		expect(errorMessage(429, { Message: 'Rate Exceeded.' })).toBe(messages.busy)
		expect(errorMessage(429, null)).toBe(messages.busy)
		expect(errorMessage(422, { detail: [{ loc: ['query', 'q'] }] })).toBe(messages.tooLong)
		expect(errorMessage(503, { error: 'unavailable', message: 'x' })).toBe(messages.unavailable)
		expect(errorMessage(400, { error: 'bad_request', message: 'x' })).toBe(messages.unavailable)
		expect(errorMessage(502, null)).toBe(messages.unavailable)
		expect(errorMessage(504, null)).toBe(messages.unavailable)
	})
})

describe('search', () => {
	it('returns the answer and results', async () => {
		const fetchFn = respondWith(200, JSON.stringify(searchResponse))
		const signal = new AbortController().signal

		const outcome = await search('why are we here', signal, fetchFn)

		expect(outcome).toEqual({
			ok: true,
			answer: searchResponse.answer,
			results: searchResponse.results
		})
		expect(fetchFn).toHaveBeenCalledWith('/api/search?q=why%20are%20we%20here', { signal })
	})

	it('reads the error code from the JSON body', async () => {
		const body = JSON.stringify({ error: 'rate_limited', message: 'Too many requests.' })
		const outcome = await search('q', new AbortController().signal, respondWith(429, body))
		expect(outcome).toEqual({ ok: false, error: messages.rateLimited })
	})

	it('treats a non-JSON error page as unavailable', async () => {
		const fetchFn = respondWith(502, '<html>Bad Gateway</html>', 'text/html')
		const outcome = await search('q', new AbortController().signal, fetchFn)
		expect(outcome).toEqual({ ok: false, error: messages.unavailable })
	})

	it('treats a 200 without a search response as unavailable', async () => {
		const fetchFn = respondWith(200, '<html></html>', 'text/html')
		const outcome = await search('q', new AbortController().signal, fetchFn)
		expect(outcome).toEqual({ ok: false, error: messages.unavailable })
	})

	it('treats a network error as unavailable', async () => {
		const fetchFn = vi.fn(async () => {
			throw new TypeError('Failed to fetch')
		}) as unknown as typeof fetch
		const outcome = await search('q', new AbortController().signal, fetchFn)
		expect(outcome).toEqual({ ok: false, error: messages.unavailable })
	})

	it('rejects when aborted', async () => {
		const fetchFn = vi.fn(
			(_url: string, init: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(new DOMException('The operation was aborted.', 'AbortError'))
					)
				})
		) as unknown as typeof fetch
		const controller = new AbortController()

		const outcome = search('q', controller.signal, fetchFn)
		controller.abort()

		await expect(outcome).rejects.toThrow('aborted')
	})
})
