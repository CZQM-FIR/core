<script lang="ts">
	import { CircleCheck, CircleMinus, CircleX, Search } from '@lucide/svelte';
	import { getActivityUsers } from '$lib/remote/users.remote';

	let search = $state('');

	let lastQuarter = $state(false);
	let onlyIssue = $state(false);
	let active = $state(false);
</script>

<section>
	<div class="container mx-auto mb-8">
		<h1 class="pt-6 text-2xl font-semibold">Controller Activity</h1>
		<div class="divider"></div>

		<div class="flex flex-row gap-3">
			<label class="input">
				<Search class="opacity-50" size="15" />
				<input type="search" class="grow" placeholder="Search" bind:value={search} />
			</label>
			<div class="flex items-center gap-3">
				<input type="checkbox" bind:checked={lastQuarter} class="toggle" />
				<span>{lastQuarter ? 'Last Quarter' : 'This Quarter'}</span>
			</div>
			<div class="flex items-center gap-3">
				<input type="checkbox" bind:checked={active} class="toggle" />
				<span>{active ? 'Active Controllers' : 'All Controllers'}</span>
			</div>
			<div class="flex items-center gap-3">
				<input type="checkbox" bind:checked={onlyIssue} class="toggle" />
				<span>{onlyIssue ? 'Only Not Meeting Hours' : 'All Hours'}</span>
			</div>
		</div>

		{#await getActivityUsers()}
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
						<th>Hours</th>
						<th>External Hours</th>
					</tr>
				</thead>
				<tbody>
					{#each users.filter((user) => {
						const matchesSearch = search === '' || user.name_full
								.toLowerCase()
								.includes(search.toLowerCase()) || user.cid.toString().includes(search);

						if (onlyIssue) {
							return (lastQuarter ? !user.hours.metActivityRequirementLastQuarter : !user.hours.meetingActivityRequirement) && matchesSearch && (active ? user.active === 'active' : true) && !user.isActivityExempt;
						}

						return matchesSearch && (active ? user.active === 'active' : true);
					}) as user (user.cid)}
						<tr>
							<td><a href="/a/users/{user.cid}">{user.name_full}</a></td>
							<td>{user.cid}</td>
							<td>{user.rating.short}</td>
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
							{#if lastQuarter}
								<td class={!user.hours.metActivityRequirementLastQuarter ? 'text-warning' : ''}
									>{user.hours.lastQuarterActivityHours.toFixed(2)}</td
								>
								<td>{user.hours.lastQuarterExternal.toFixed(2)}</td>
							{:else}
								<td class={!user.hours.meetingActivityRequirement ? 'text-warning' : ''}
									>{user.hours.activityHours.toFixed(2)}</td
								>
								<td>{user.hours.thisQuarterExternal.toFixed(2)}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load users.'}</p>
		{/await}
	</div>
</section>
