<script lang="ts">
	import { getWaitlists } from '$lib/remote/waitlist.remote';
	import { ListPlus } from '@lucide/svelte';
</script>

<section class="container mx-auto py-5">
	<div class="flex flex-row items-baseline justify-between">
		<h1 class="text-2xl font-semibold">Wait List Management</h1>
		<div class="tooltip" data-tip="New Waitlist">
			<a class="btn btn-success" href="/a/waitlist/create"><ListPlus /></a>
		</div>
	</div>
	<div class="divider my-0"></div>
	<p class="py-3">Please select a waitlist:</p>
	<ul class="flex flex-row flex-wrap gap-3">
		{#await getWaitlists()}
			<p>Loading Waitlists...</p>
		{:then waitlists}
			{#each waitlists as waitlist (waitlist.id)}
				<li class="text-lg">
					<a href="/a/waitlist/{waitlist.id}" class="btn btn-primary">
						<span class="font-bold">{waitlist.name}</span> - {waitlist.students.length} student{waitlist
							.students.length === 1
							? ''
							: 's'}
					</a>
				</li>
			{/each}
		{:catch error}
			<p>There was an error loading the waitlists: {error}</p>
		{/await}
	</ul>
</section>
