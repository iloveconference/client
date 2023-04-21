<script lang="ts">
	import IconLoading from '~icons/eos-icons/bubble-loading'

	let loading = false

	function clear() {
		loading = true
	}
</script>

<h1 class="header">Welcome to I Love Conference!</h1>
<p class="subheader">
	This is a Question-Answering site on
	<a href="https://www.churchofjesuschrist.org/study/general-conference">General Conference talks</a
	>
	from 1980-2023 of The Church of Jesus Christ of Latter-day Saints. We intend to add features and improve
	the results over time.
</p>
<form action="/search" on:submit={clear}>
	<input type="search" class={loading ? 'loading' : ''} placeholder="Ask a question" name="q" />
</form>

{#if !loading}
	<p>For example:</p>
	<ul>
		<li><a href="/search?q=How+can+I+be+happy">How can I be happy</a>?</li>
		<li>
			<a href="/search?q=What+blessings+are+promised+youth+if+they+do+family+history"
				>What blessings are promised youth if they do family history</a
			>?
		</li>
		<li>
			<a href="/search?q=What+blessings+do+I+get+from+reading+general+conference+talks"
				>What blessings do I get from reading general conference talks</a
			>?
		</li>
		<li>
			<a href="/search?q=where+did+we+come+from">Where did we come from</a>?
		</li>
		<li>
			<a href="/search?q=why+are+we+here">Why are we here</a>?
		</li>
		<li>
			<a href="/search?q=where+do+we+go+when+we+die%3F">Where do we go when we die</a>?
		</li>
	</ul>
{:else}
	<p>
		<IconLoading /> &nbsp; Please wait
	</p>
{/if}

<style>
	.subheader {
		margin-bottom: 3rem;
	}

	.loading {
		opacity: 0.5;
	}
</style>
