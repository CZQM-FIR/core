<script lang="ts">
	let {
		results
	}: {
		results: { description: string; met: boolean }[];
	} = $props();
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h2 class="card-title text-lg">Prerequisites</h2>
		{#if results.length === 0}
			<p class="text-sm">This course has no prerequisites.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each results as result, index (index)}
					<li class="bg-base-100 flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm">
						<span class="badge badge-sm shrink-0 {result.met ? 'badge-success' : 'badge-error'}">
							{result.met ? 'Met' : 'Unmet'}
						</span>
						<span class="text-sm">{result.description}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
