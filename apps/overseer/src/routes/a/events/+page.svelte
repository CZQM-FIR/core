<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	let filtered = $state(data.events);

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
				<Icon icon="mdi:search" class="opacity-50" />
				<input type="search" class="grow" placeholder="Search" bind:value={search} />
			</label>
			<a href="/a/events/create" class="btn btn-primary">
				<Icon icon="mdi:plus" class="text-xl" />
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
				{#each filtered as event}
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
								<Icon icon="mdi:edit-box-outline" class="text-xl" />
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
