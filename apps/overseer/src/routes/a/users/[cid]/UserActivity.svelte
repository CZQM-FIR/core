<script lang="ts">
	import type { UserAdminDetails } from '$lib/remote/user-admin.remote';

	let { details, showExternal = false }: { details: UserAdminDetails; showExternal?: boolean } =
		$props();

	let month = $derived((details.user?.hours.thisMonth ?? 0).toFixed(2));
	let activity = $derived((details.user?.hours.thisActivityHours ?? 0).toFixed(2));
	let lastMonth = $derived((details.user?.hours.lastMonth ?? 0).toFixed(2));
	let total = $derived((details.user?.hours.total ?? 0).toFixed(2));
	let thisQuarter = $derived((details.user?.hours.thisQuarter ?? 0).toFixed(2));
	let lastQuarter = $derived((details.user?.hours.lastQuarter ?? 0).toFixed(2));
</script>

<div class="flex flex-col rounded border border-gray-600 p-4">
	<div class="mb-3">
		<h1 class="text-lg font-semibold">Controller Stats</h1>
		<p class="text-sm text-gray-500 italic">
			"External" stats are controlling hours outside of the Moncton / Gander FIR"
		</p>
	</div>
	<div class="flex flex-row items-center justify-center gap-3">
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Activity</p>
			<p class={Number(activity) < 3 ? 'text-warning' : ''}>{activity}h / 3:00h</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Month</p>
			<p>{month}h</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Last Month</p>
			<p>{lastMonth}h</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Total</p>
			<p>{total}h</p>
		</div>
		{#if showExternal}
			<div class="flex flex-col items-center justify-center gap-1">
				<p class="font-semibold">This Quarter</p>
				<p>{thisQuarter}h</p>
			</div>
			<div class="flex flex-col items-center justify-center gap-1">
				<p class="font-semibold">Last Quarter</p>
				<p>{lastQuarter}h</p>
			</div>
		{/if}
	</div>
	<h2 class="mt-4 mb-2 font-semibold">Last 10 Sessions</h2>
	<div class="rounded-box border-base-content/5 bg-base-100 mb-4 overflow-x-auto border">
		<table class="table-zebra table">
			<thead>
				<tr>
					<th></th>
					<th>Callsign</th>
					<th>Logon Time</th>
					<th>Duration</th>
				</tr>
			</thead>
			<tbody>
				{#each details.last10Sessions as session, i (session.id)}
					<tr>
						<td>{i + 1}</td>
						<td>{session.position.callsign}</td>
						<td>{session.logonTime.toLocaleString()}</td>
						<td>{(session.duration / 3600).toFixed(2)}h</td>
					</tr>
				{/each}
				{#if details.last10Sessions.length === 0}
					<tr>
						<td colspan="4" class="text-center"> No sessions found </td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
