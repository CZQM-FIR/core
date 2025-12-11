<script lang="ts">
	import { Plus, Search, SquarePen, Trash2 } from '@lucide/svelte';
	import { formatUtcTime } from '@czqm/common/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	let filtered = $derived.by(() => {
		if (search === '') return data.events;
		return data.events.filter((event) => {
			return (
				event.name.toLowerCase().includes(search.toLowerCase()) ||
				event.description.toLowerCase().includes(search.toLowerCase())
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
							{formatUtcTime(event.start)}</td
						>
						<td
							>{event.end.toLocaleString('en-GB', { timeZone: 'UTC' })}
							{formatUtcTime(event.end)}</td
						>
						<td class="flex flex-row items-center justify-end gap-3">
							<a href={`/a/events/${event.id}`}>
								<SquarePen class="text-xl" size="15" />
							</a>
							<form method="post">
								<input type="hidden" name="id" value={event.id} />
								<button type="submit">
									<Trash2 size="15" class="text-error cursor-pointer" />
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
