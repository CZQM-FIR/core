<script lang="ts">
	import { Search, SquarePen } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let search = $state('');

	let filtered = $derived(data.users);

	$effect(() => {
		filtered =
			search == ''
				? data.users
				: data.users.filter((user) => {
						return (
							user.name_full.toLowerCase().includes(search.toLowerCase()) ||
							user.cid.toString().includes(search)
						);
					});
	});
</script>

<section>
	<div class="container mx-auto mb-8">
		<h1 class="pt-6 text-2xl font-semibold">User Management</h1>
		<div class="divider"></div>

		<label class="input">
			<Search class="opacity-50" size="15" />
			<input type="search" class="grow" placeholder="Search" bind:value={search} />
		</label>

		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Name</th>
					<th>CID</th>
					<th>Rating</th>
					<th>Role</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as user (user.cid)}
					<tr>
						<td>{user.name_full}</td>
						<td>{user.cid}</td>
						<td>{user.rating.long}</td>
						<td>{user.role}</td>
						<td>
							<a href={`/a/users/${user.cid}`}>
								<SquarePen class="text-xl" size="15" />
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
