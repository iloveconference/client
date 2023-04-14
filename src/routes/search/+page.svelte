<script lang="ts">
	import IconLoading from '~icons/eos-icons/bubble-loading'
	import IconThumbsDown from '~icons/uil/thumbs-down'
	import IconThumbsUp from '~icons/uil/thumbs-up'
	import type { PageData } from './$types'

	export let data: PageData

	let searchRef: HTMLInputElement

	type SearchResult = {
		ratedUp: boolean
		ratedDown: boolean
		id: number
	}

	function clear() {
		data.answer = null
		data.results = null
		data.loading = true
	}

	function reset() {
		data.q = ''
		searchRef.focus()
	}

	async function rate(resultId: number, score: number) {
		await fetch('/api/rate', {
			method: 'POST',
			body: JSON.stringify({
				session: data.session,
				result: resultId,
				score: score
			})
		})
	}

	function rateUp(ratedUp: boolean, ratedDown: boolean): [number, boolean, boolean] {
		let score: number
		if (ratedUp) {
			score = -1
			ratedUp = false
		} else if (ratedDown) {
			score = 2
			ratedDown = false
			ratedUp = true
		} else {
			score = 1
			ratedUp = true
		}
		return [score, ratedUp, ratedDown]
	}

	function rateDown(ratedUp: boolean, ratedDown: boolean): [number, boolean, boolean] {
		let score: number
		if (ratedDown) {
			score = 1
			ratedDown = false
		} else if (ratedUp) {
			score = -2
			ratedUp = false
			ratedDown = true
		} else {
			score = -1
			ratedDown = true
		}
		return [score, ratedUp, ratedDown]
	}

	async function rateUpResult(result: SearchResult) {
		let score: number
		let ratedUp: boolean
		let ratedDown: boolean
		;[score, ratedUp, ratedDown] = rateUp(result.ratedUp, result.ratedDown)
		await rate(result.id, score)
		result.ratedUp = ratedUp
		result.ratedDown = ratedDown
		data.results = data.results
	}

	async function rateDownResult(result: SearchResult) {
		let score: number
		let ratedUp: boolean
		let ratedDown: boolean
		;[score, ratedUp, ratedDown] = rateDown(result.ratedUp, result.ratedDown)
		await rate(result.id, score)
		result.ratedUp = ratedUp
		result.ratedDown = ratedDown
		data.results = data.results
	}

	async function rateUpAnswer() {
		let score: number
		let ratedUp: boolean
		let ratedDown: boolean
		;[score, ratedUp, ratedDown] = rateUp(data.answerRatedUp, data.answerRatedDown)
		await rate(0, score)
		data.answerRatedUp = ratedUp
		data.answerRatedDown = ratedDown
	}

	async function rateDownAnswer() {
		let score: number
		let ratedUp: boolean
		let ratedDown: boolean
		;[score, ratedUp, ratedDown] = rateDown(data.answerRatedUp, data.answerRatedDown)
		await rate(0, score)
		data.answerRatedUp = ratedUp
		data.answerRatedDown = ratedDown
	}
</script>

<h4 class="header"><a href="/">I Love Conference</a></h4>
<form on:submit={clear}>
	<div id="search-wrapper">
		<input
			id="search"
			type="search"
			class={data.loading ? 'loading' : ''}
			placeholder="Ask a question"
			name="q"
			bind:this={searchRef}
			bind:value={data.q}
		/>
		{#if data.q}
			<span tabindex="0" role="button" class="reset" on:keypress={reset} on:click={reset}
				>&nbsp;</span
			>
		{/if}
	</div>
</form>

{#if data.answer}
	<h4>Computer-generated answer</h4>
	<div class="answer-header">
		Computer-generated answers may be incorrect. Please review the results below.
	</div>
	<div>{data.answer}</div>
	<div>
		<span
			class="rating"
			class:rated-up={data.answerRatedUp}
			title="Good Answer"
			on:keypress={rateUpAnswer}
			on:click={rateUpAnswer}><IconThumbsUp /></span
		>
		<span
			class="rating"
			class:rated-down={data.answerRatedDown}
			title="Answer Needs Work"
			on:keypress={rateDownAnswer}
			on:click={rateDownAnswer}><IconThumbsDown /></span
		>
	</div>
{/if}
{#if data.results}
	<h4>Results</h4>
	{#each data.results as result}
		<div class="result">
			<a href={result.url}>{result.title}</a><br />
			<div class="author-date">{result.author} {result.month}/{result.year}</div>
			<div>{result.text}</div>
			<div>
				<span
					class="rating"
					class:rated-up={result.ratedUp}
					title="Relevant"
					on:keypress={() => rateUpResult(result)}
					on:click={() => rateUpResult(result)}><IconThumbsUp /></span
				>
				<span
					class="rating"
					class:rated-down={result.ratedDown}
					title="Less Relevant"
					on:keypress={() => rateDownResult(result)}
					on:click={() => rateDownResult(result)}><IconThumbsDown /></span
				>
			</div>
		</div>
	{/each}
{/if}
{#if data.loading}
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

	.rating {
		cursor: pointer;
	}
	.rated-up {
		color: rgb(0, 224, 0);
	}
	.rated-down {
		color: red;
	}
</style>
