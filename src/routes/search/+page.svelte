<script lang="ts">
	import type { PageData } from './$types'

	export let data: PageData
</script>

<form>
	<input type="text" name="q" value={data.q} />
	<button type="submit">Go</button>
</form>

<h4>Computer-generated answer</h4>
<p>{data.answer}</p>

<h4>Results</h4>
{#each data.results as result}
	<div>
		<a href="/">{result.title}</a><br />
		<p>{result.text}</p>
	</div>
{/each}

<pre>{JSON.stringify(data, null, 2)}</pre>
