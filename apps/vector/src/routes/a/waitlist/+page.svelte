<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section class="container mx-auto py-5">
	<h1 class="text-2xl font-semibold">Wait List Management</h1>
	<div class="divider my-0"></div>
	<p class="py-3">Please select a waitlist:</p>
	<ul class="flex flex-row gap-3">
		{#each data.waitlists as waitlist (waitlist.id)}
			<li class="text-lg">
				<a href="/a/waitlist/{waitlist.id}" class="btn btn-primary">
					<span class="font-bold">{waitlist.name}</span> - {waitlist.students.length} student{waitlist
						.students.length === 1
						? ''
						: 's'}
				</a>
			</li>
		{/each}
	</ul>
</section>
