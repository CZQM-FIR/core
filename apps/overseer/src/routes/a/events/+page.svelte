<script lang="ts">
	import { Plus, Search, SquarePen } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	let filtered = $derived(data.events);

	$effect(() => {
		filtered =
			search == ''
				? data.events
				: data.events.filter((event) => {
						return (
							event.name.toLowerCase().includes(search.toLowerCase()) ||
							event.description.toString().includes(search)
						);
					});
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Event Management</h1>
		<div class="divider"></div>

		<div class="flex min-w-full flex-row">
			<label class="input mr-auto">
				<Search class="opacity-50" size="15" />
				<input type="search" class="grow" placeholder="Search" bind:value={search} />
			</label>
			<a href="/a/events/create" class="btn btn-primary">
				<Plus class="text-xl" size="15" />
			</a>
		</div>

		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Event Name</th>
					<th>Start</th>
					<th>End</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as event (event.id)}
					<tr>
						<td>{event.name}</td>
						<td
							>{event.start.toLocaleString('en-GB', { timeZone: 'UTC' })}
							{event.start.getUTCHours()}:{event.start.getUTCMinutes()}z</td
						>
						<td
							>{event.end.toLocaleString('en-GB', { timeZone: 'UTC' })}
							{event.end.getUTCHours()}:{event.end.getUTCMinutes()}z</td
						>
						<td>
							<a href={`/a/events/${event.id}`}>
								<SquarePen class="text-xl" size="15" />
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
