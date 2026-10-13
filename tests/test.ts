import { expect, test, type Page, type Route } from '@playwright/test'

const answer = 'We are here to gain a body and to learn to choose the right.'
const searchResponse = {
	q: 'why are we here',
	session: 1,
	answer,
	results: [
		{
			id: '1',
			title: 'The Great Plan of Happiness',
			author: 'An Apostle',
			year: '2019',
			month: '10',
			url: 'https://www.churchofjesuschrist.org/study/general-conference/2019/10/example',
			text: 'We came to earth to learn and grow.'
		}
	]
}

type Respond = (route: Route) => Promise<void>

function json(status: number, body: unknown): Respond {
	return (route) =>
		route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

/** Answer the site's /api/* in the browser: searches with `search`, anything else with 204. */
async function mockApi(page: Page, search: Respond = json(200, searchResponse)) {
	const requests: string[] = []
	await page.route(
		(url) => url.pathname.startsWith('/api/') && url.hostname === 'localhost',
		async (route) => {
			const url = new URL(route.request().url())
			requests.push(url.pathname + url.search)
			if (url.pathname === '/api/search') await search(route)
			else await route.fulfill({ status: 204 })
		}
	)
	return requests
}

test.beforeEach(async ({ page }) => {
	// Keep test runs out of the site's Umami analytics.
	await page.route('https://analytics.umami.is/**', (route) => route.abort())
})

test('index page has expected h1', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('heading', { name: 'Welcome to I Love Conference!' })).toBeVisible()
})

test('every page has the GeneFun footer', async ({ page }) => {
	await mockApi(page)
	for (const path of ['/', '/search', '/static/about', '/static/terms', '/static/privacy']) {
		await page.goto(path)
		const footer = page.locator('footer')
		await expect(footer.getByRole('link', { name: 'GeneFun', exact: true })).toHaveAttribute(
			'href',
			'https://genefun.com'
		)
		await expect(footer).toContainText('© 2026 GeneFun, Inc.')
	}
})

test('the home page warms up the API, and hovering over a search link does not search', async ({
	page
}) => {
	const requests = await mockApi(page)
	await page.goto('/')
	await expect.poll(() => requests).toEqual(['/api/warm'])

	await page.getByRole('link', { name: 'Why are we here' }).hover()
	await page.waitForTimeout(500)
	expect(requests).toEqual(['/api/warm'])
})

test('a search link shows the answer and results', async ({ page }) => {
	const requests = await mockApi(page)
	await page.goto('/search?q=why+are+we+here')

	await expect(page.getByText(answer)).toBeVisible()
	await expect(page.getByRole('link', { name: 'The Great Plan of Happiness' })).toBeVisible()
	await expect(page.getByPlaceholder('Ask a question')).toHaveValue('why are we here')
	// /search doesn't warm up: the search itself starts the Lambda.
	expect(requests).toEqual(['/api/search?q=why%20are%20we%20here'])
})

test('asking a question shows "Please wait", then the answer, at a shareable URL', async ({
	page
}) => {
	let release!: () => void
	const released = new Promise<void>((resolve) => (release = resolve))
	await mockApi(page, async (route) => {
		await released
		await json(200, searchResponse)(route)
	})
	await page.goto('/')
	await page.getByPlaceholder('Ask a question').fill('where did we come from')
	await page.getByPlaceholder('Ask a question').press('Enter')

	await expect(page).toHaveURL(/\/search\?q=where\+did\+we\+come\+from$/)
	await expect(page.getByText('Please wait')).toBeVisible()
	release()
	await expect(page.getByText(answer)).toBeVisible()
	await expect(page.getByText('Please wait')).toBeHidden()
})

const errors: [string, Respond, string][] = [
	[
		'the per-client limit',
		json(429, { error: 'rate_limited', message: 'Too many requests.' }),
		'Please try again after this time tomorrow.'
	],
	[
		'the global limit',
		json(429, { error: 'busy', message: 'Busy.' }),
		'The site is getting more questions than usual today.'
	],
	[
		'Lambda throttling',
		json(429, { Message: 'Rate Exceeded.' }),
		'The site is getting more questions than usual today.'
	],
	[
		'an unavailable API',
		json(503, { error: 'unavailable', message: 'Unavailable.' }),
		'Search is temporarily unavailable.'
	],
	[
		'a CloudFront error page',
		(route) => route.fulfill({ status: 502, contentType: 'text/html', body: '<html>502</html>' }),
		'Search is temporarily unavailable.'
	],
	['a question over 100 characters', json(422, { detail: [] }), 'Please enter a shorter question.']
]

for (const [name, respond, message] of errors) {
	test(`search shows a message for ${name}`, async ({ page }) => {
		await mockApi(page, respond)
		await page.goto('/search?q=why+are+we+here')
		await expect(page.getByRole('alert')).toContainText(message)
		await expect(page.getByText('Please wait')).toBeHidden()
	})
}

test('submitting the same question again retries a failed search', async ({ page }) => {
	let calls = 0
	const requests = await mockApi(page, (route) =>
		++calls === 1
			? json(503, { error: 'unavailable', message: 'Unavailable.' })(route)
			: json(200, searchResponse)(route)
	)
	await page.goto('/search?q=why+are+we+here')
	await expect(page.getByRole('alert')).toContainText('Search is temporarily unavailable.')

	await page.getByPlaceholder('Ask a question').press('Enter')
	await expect(page.getByText(answer)).toBeVisible()
	await expect(page.getByRole('alert')).toBeHidden()
	expect(requests).toHaveLength(2)
})

test('submitting the same question again does not search again', async ({ page }) => {
	let release!: () => void
	const released = new Promise<void>((resolve) => (release = resolve))
	const requests = await mockApi(page, async (route) => {
		await released
		await json(200, searchResponse)(route)
	})
	await page.goto('/search?q=why+are+we+here')
	await expect(page.getByText('Please wait')).toBeVisible()
	await page.getByPlaceholder('Ask a question').press('Enter') // while it's searching

	release()
	await expect(page.getByText(answer)).toBeVisible()
	await page.getByPlaceholder('Ask a question').press('Enter') // after the answer
	await page.waitForTimeout(500)
	await expect(page.getByText(answer)).toBeVisible()
	expect(requests).toEqual(['/api/search?q=why%20are%20we%20here'])
})
