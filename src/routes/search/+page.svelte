<script lang="ts">
	import type { PageData } from './$types'

	export let data: PageData

	function clear() {
		data.answer = null
		data.results = null
	}
</script>

<h4 class="header"><a href="/">I Love Conference</a></h4>
<form on:submit={clear}>
	<input type="search" placeholder="Ask a question" name="q" value={data.q} />
</form>

{#if data.answer}
	<h4>Computer-generated answer</h4>
	<div class="answer-header">
		Computer-generated answers may be incorrect. Please review the results below.
	</div>
	<p>{data.answer}</p>
{/if}
{#if data.results}
	<h4>Results</h4>
	{#each data.results as result}
		<div>
			<a href={result.url}>{result.title}</a><br />
			<div class="author-date">{result.author} {result.month}/{result.year}</div>
			<p>{result.text}</p>
		</div>
	{/each}
{/if}

<style>
	.header {
		margin-top: 1rem;
	}
	.author-date {
		font-size: smaller;
	}
	.answer-header {
		margin-top: -2rem;
		margin-bottom: 2rem;
		font-size: smaller;
	}
</style>
