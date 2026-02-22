<script lang="ts">
	import { CircleCheck, CircleMinus, CircleX, Search, SquarePen } from '@lucide/svelte';
	import { getUsers } from '$lib/remote/users.remote';

	let search = $state('');
</script>

<section>
	<div class="container mx-auto mb-8">
		<h1 class="pt-6 text-2xl font-semibold">User Management</h1>
		<div class="divider"></div>

		<label class="input">
			<Search class="opacity-50" size="15" />
			<input type="search" class="grow" placeholder="Search" bind:value={search} />
		</label>

		{#await getUsers()}
			<p class="mt-4">Loading users...</p>
		{:then users}
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Name</th>
						<th>CID</th>
						<th>Rating</th>
						<th>Role</th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each search == '' ? users : users.filter((user) => {
								return user.name_full.toLowerCase().includes(search.toLowerCase()) || user.cid
										.toString()
										.includes(search);
							}) as user (user.cid)}
						<tr>
							<td>{user.name_full}</td>
							<td>{user.cid}</td>
							<td>{user.rating.long}</td>
							<td>{user.role}</td>
							<td class="flex justify-start">
								{#if user.active === 'active'}
									<div class="tooltip" data-tip="Active">
										<CircleCheck size="18" class="text-success" />
									</div>
								{:else if user.active === 'inactive'}
									<div class="tooltip" data-tip="Inactive">
										<CircleX size="18" class="text-error" />
									</div>
								{:else if user.active === 'loa'}
									<div class="tooltip" data-tip="On Leave">
										<CircleMinus size="18" class="text-warning" />
									</div>
								{/if}
							</td>
							<td>
								<a href={`/a/users/${user.cid}`}>
									<SquarePen class="text-xl" size="15" />
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load users.'}</p>
		{/await}
	</div>
</section>
