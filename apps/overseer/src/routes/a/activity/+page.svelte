<script lang="ts">
	import type { PageData } from './$types';
	import { CircleCheck, CircleMinus, CircleX, Search } from '@lucide/svelte';
	let { data }: { data: PageData } = $props();

	let search = $state('');
	let filtered = $derived(data.users);

	let lastQuarter = $state(false);
	let onlyIssue = $state(false);

	$effect(() => {
		filtered =
			search == ''
				? data.users.filter((user) => {
						if (onlyIssue) {
							if (lastQuarter) {
								return (
									user.hours.last.internal < 3 ||
									user.hours.last.external > user.hours.last.internal
								);
							} else {
								return (
									user.hours.this.internal < 3 ||
									user.hours.this.external > user.hours.this.internal
								);
							}
						} else {
							return true;
						}
					})
				: data.users.filter((user) => {
						if (onlyIssue) {
							if (lastQuarter) {
								return (
									(user.hours.last.internal < 3 ||
										user.hours.last.external > user.hours.last.internal) &&
									(user.name_full.toLowerCase().includes(search.toLowerCase()) ||
										user.cid.toString().includes(search))
								);
							} else {
								return (
									(user.hours.this.internal < 3 ||
										user.hours.this.external > user.hours.this.internal) &&
									(user.name_full.toLowerCase().includes(search.toLowerCase()) ||
										user.cid.toString().includes(search))
								);
							}
						} else {
							return (
								user.name_full.toLowerCase().includes(search.toLowerCase()) ||
								user.cid.toString().includes(search)
							);
						}
					});
	});
</script>

<section>
	<div class="container mx-auto mb-8">
		<h1 class="pt-6 text-2xl font-semibold">Controller Activity</h1>
		<div class="divider"></div>

		<div class="flex flex-col gap-3">
			<label class="input">
				<Search class="opacity-50" size="15" />
				<input type="search" class="grow" placeholder="Search" bind:value={search} />
			</label>
			<div class="flex items-center gap-3">
				<input type="checkbox" bind:checked={onlyIssue} class="toggle" />
				<span>{onlyIssue ? 'Only Not Meeting Hours' : 'All Hours'}</span>
			</div>
			<div class="flex items-center gap-3">
				<input type="checkbox" bind:checked={lastQuarter} class="toggle" />
				<span>{lastQuarter ? 'Last Quarter' : 'This Quarter'}</span>
			</div>
		</div>

		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Name</th>
					<th>CID</th>
					<th>Rating</th>
					<th>Role</th>
					<th></th>
					<!-- Status-->
					<th>Hours</th>
					<th>External Hours</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as user (user.cid)}
					<tr>
						<td>{user.name_full}</td>
						<td>{user.cid}</td>
						<td>{user.rating.short}</td>
						<td>{user.role}</td>
						<td class="flex justify-start">
							{#if user.active === 1}
								<div class="tooltip" data-tip="Active">
									<CircleCheck size="18" class="text-success" />
								</div>
							{:else if user.active === 0}
								<div class="tooltip" data-tip="Inactive">
									<CircleX size="18" class="text-error" />
								</div>
							{:else if user.active === -1}
								<div class="tooltip" data-tip="On Leave">
									<CircleMinus size="18" class="text-warning" />
								</div>
							{/if}
						</td>
						{#if lastQuarter}
							<td class={user.hours.last.internal < 3 ? 'text-warning' : ''}
								>{user.hours.last.internal}</td
							>
							<td>{user.hours.last.external}</td>
						{:else}
							<td class={user.hours.this.internal < 3 ? 'text-warning' : ''}
								>{user.hours.this.internal}</td
							>
							<td>{user.hours.this.external}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
