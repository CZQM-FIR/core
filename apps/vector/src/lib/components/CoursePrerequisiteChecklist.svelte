<script lang="ts">
	import type { CoursePrerequisiteResult } from '@czqm/common';

	let {
		results
	}: {
		results: CoursePrerequisiteResult[];
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
					<li class="bg-base-100 flex items-start gap-2 rounded-lg px-3 py-2 shadow-sm">
						<span
							class="badge badge-sm mt-0.5 shrink-0 {result.met
								? 'badge-success'
								: 'badge-error text-black'}"
							aria-label={result.met ? 'Prerequisite met' : 'Prerequisite not met'}
						>
							{result.met ? '✓' : '×'}
						</span>
						<div class="min-w-0">
							<p class="text-sm">{result.description}</p>
							<p class="text-xs opacity-70">{result.progress}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
