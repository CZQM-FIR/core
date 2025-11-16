<script lang="ts">
	import { goto } from '$app/navigation';
	import { deleteWaitlist, getWaitlist } from '$lib/remote/waitlist.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="container mx-auto py-5">
	<h1 class="text-3xl font-semibold">Delete Wait List</h1>
	<div class="divider mt-0"></div>

	{#await getWaitlist(data.id)}
		Loading Waitlist...
	{:then waitlist}
		<p>
			Are you sure you wish to delete the {waitlist.name} wait list? It will be irreversibly removed
			if you do.
		</p>
		<div class="mt-3 flex flex-row flex-wrap gap-3">
			<button
				class="btn btn-danger"
				onclickcapture={async () => {
					await deleteWaitlist(data.id);
					goto('/a/waitlist');
				}}>Yes, Delete</button
			>
			<a class="btn btn-primary" href="/a/waitlist/{waitlist.id}">No, Return to wait list</a>
		</div>
	{/await}
</section>
