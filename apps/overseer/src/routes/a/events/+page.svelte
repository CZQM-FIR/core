<script lang="ts">
	import { Plus, Search, SquarePen, Trash2 } from '@lucide/svelte';
	import { deleteEvent, getEvents } from '$lib/remote/events.remote';

	let search = $state('');
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

		{#await getEvents()}
			<p class="mt-4">Loading events...</p>
		{:then events}
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
					{#each search === '' ? events : events.filter((event) => {
								return event.name.toLowerCase().includes(search.toLowerCase()) || event.description
										.toString()
										.includes(search);
							}) as event (event.id)}
						<tr>
							<td>{event.name}</td>
							<td
								>{event.start.toLocaleDateString('en-GB', { timeZone: 'UTC' })}
								{event.start.getUTCHours().toString().padStart(2, '0')}:{event.start
									.getUTCMinutes()
									.toString()
									.padStart(2, '0')}z</td
							>
							<td
								>{event.end.toLocaleDateString('en-GB', { timeZone: 'UTC' })}
								{event.end.getUTCHours().toString().padStart(2, '0')}:{event.end
									.getUTCMinutes()
									.toString()
									.padStart(2, '0')}z</td
							>
							<td class="flex flex-row items-center justify-end gap-3">
								<a href={`/a/events/${event.id}`}>
									<SquarePen class="text-xl" size="15" />
								</a>
								<button type="button" onclickcapture={() => deleteEvent(event.id)}>
									<Trash2 size="15" class="text-error cursor-pointer" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load events.'}</p>
		{/await}
	</div>
</section>
