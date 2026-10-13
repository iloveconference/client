<script lang="ts">
	import { onDestroy } from 'svelte'
	import { page } from '$app/stores'
	import IconLoading from '~icons/eos-icons/bubble-loading'
	import { search, type SearchResult } from '$lib/search'

	let q = ''
	let answer: string | null = null
	let results: SearchResult[] | null = null
	let loading = false
	let error: string | null = null

	let searchRef: HTMLInputElement
	let controller: AbortController | null = null

	// Search whenever q in the URL changes: a form submit, back/forward, or a shared link. This runs
	// in the component, not in a load function, so hovering over a search link never starts a search.
	$: urlQ = $page.url.searchParams.get('q') ?? ''
	$: show(urlQ)

	function show(query: string) {
		q = query
		run(query)
	}

	async function run(query: string) {
		controller?.abort()
		controller = null
		answer = null
		results = null
		error = null
		loading = false
		if (!query.trim()) return

		const current = new AbortController()
		controller = current
		loading = true
		try {
			const outcome = await search(query, current.signal)
			if (current.signal.aborted) return
			if (outcome.ok) {
				answer = outcome.answer
				results = outcome.results
			} else {
				error = outcome.error
			}
		} catch {
			// Aborted by a newer search or by leaving the page.
		} finally {
			if (controller === current) {
				controller = null
				loading = false
			}
		}
	}

	function submit() {
		// Any other q changes the URL, which runs show(). Submitting the q that's already in the URL
		// doesn't, so retry here if its search failed. Don't search again while it's still running or
		// after it worked: an aborted request still finishes (and costs) on the server.
		if (q === urlQ && error) run(q)
	}

	function reset() {
		q = ''
		searchRef.focus()
	}

	onDestroy(() => controller?.abort())
</script>

<h4 class="header"><a href="/">I Love Conference</a></h4>
<form action="/search" on:submit={submit}>
	<div id="search-wrapper">
		<input
			id="search"
			type="search"
			class={loading ? 'loading' : ''}
			placeholder="Ask a question"
			name="q"
			bind:this={searchRef}
			bind:value={q}
		/>
		{#if q}
			<span tabindex="0" role="button" class="reset" on:keypress={reset} on:click={reset}
				>&nbsp;</span
			>
		{/if}
	</div>
</form>

{#if error}
	<p class="error" role="alert">{error}</p>
{/if}
{#if answer}
	<h4>Computer-generated answer</h4>
	<div class="answer-header">
		Computer-generated answers may be incorrect. Please review the results below.
	</div>
	<div>{answer}</div>
{/if}
{#if results}
	<h4>Results</h4>
	{#each results as result}
		<div class="result">
			<a href={result.url}>{result.title}</a><br />
			<div class="author-date">{result.author} {result.month}/{result.year}</div>
			<div>{result.text}</div>
		</div>
	{/each}
{/if}
{#if loading}
	<p>
		<IconLoading /> &nbsp; Please wait
	</p>
{/if}

<style>
	.author-date {
		font-size: smaller;
	}
	.answer-header {
		margin-top: -2rem;
		margin-bottom: 2rem;
		font-size: smaller;
	}
	.result {
		margin-bottom: 1rem;
	}

	#search-wrapper {
		position: relative;
	}

	#search-wrapper .reset {
		position: absolute;
		right: 1em;
		padding: var(--form-element-spacing-vertical) var(--form-element-spacing-horizontal);
		background-image: var(--icon-close);
		background-position: center left 1.125rem;
		background-size: 1rem auto;
		background-repeat: no-repeat;
		opacity: 0.5;
		cursor: pointer;
		background-color: inherit;
		border: inherit;
	}

	#search {
		display: inline-block;
		width: 100%;
	}

	.loading {
		opacity: 0.5;
	}

	.error {
		color: var(--del-color);
	}
</style>
