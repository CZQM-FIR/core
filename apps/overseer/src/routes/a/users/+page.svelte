<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	let search = $state('');

	let filtered = $state(data.users);

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
			<Icon icon="mdi:search" class="opacity-50" />
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
				{#each filtered as user}
					<tr>
						<td>{user.name_full}</td>
						<td>{user.cid}</td>
						<td>{user.rating.short}</td>
						<td>{user.role}</td>
						<td>
							<a href={`/a/users/${user.cid}`}>
								<Icon icon="mdi:edit-box-outline" class="text-xl" />
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
