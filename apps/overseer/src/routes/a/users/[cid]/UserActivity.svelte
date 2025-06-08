<script lang="ts">
	import type { PageData } from './$types';

	let { data, showExternal = false }: { data: PageData; showExternal?: boolean } = $props();

	const month = $state(
		(
			data
				.user!.sessions.filter(
					(s) => s.logonTime.getMonth() === new Date().getMonth() && s.positionId !== 0
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);
	const activity = $state(
		(
			data
				.user!.sessions.filter(
					(s) => s.logonTime.getMonth() >= new Date().getMonth() - 3 && s.positionId !== 0
				)
				.filter((s) =>
					(data.user!.ratingID >= 5 ? ['APP', 'CTR'] : ['GND', 'TWR', 'APP', 'CTR']).includes(
						s.position.callsign.split('_').pop() ?? ''
					)
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);
	const lastActivity = $state(
		(
			data
				.user!.sessions.filter(
					(s) =>
						s.logonTime.getMonth() >= new Date().getMonth() - 6 &&
						s.logonTime.getMonth() < new Date().getMonth() - 3 &&
						s.positionId !== 0
				)
				.filter((s) =>
					(data.user!.ratingID >= 5 ? ['APP', 'CTR'] : ['GND', 'TWR', 'APP', 'CTR']).includes(
						s.position.callsign.split('_').pop() ?? ''
					)
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);
	const year = $state(
		(
			data
				.user!.sessions.filter(
					(s) => s.logonTime.getFullYear() === new Date().getFullYear() && s.positionId !== 0
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);
	const externalQuarter = $state(
		(
			data
				.user!.sessions.filter(
					(s) =>
						s.logonTime.getMonth() >= new Date().getMonth() - 3 &&
						s.logonTime.getFullYear() === new Date().getFullYear() &&
						s.positionId === 0
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);
	const externalLastQuarter = $state(
		(
			data
				.user!.sessions.filter(
					(s) =>
						s.logonTime.getMonth() >= new Date().getMonth() - 6 &&
						s.logonTime.getMonth() < new Date().getMonth() - 3 &&
						s.positionId === 0
				)
				.reduce((a, b) => a + b.duration, 0) / 3600
		).toFixed(2)
	);

	const last20Sessions = $state(
		data
			.user!.sessions.filter((s) => {
				if (showExternal) {
					return true;
				} else {
					return s.positionId !== 0;
				}
			})
			.sort((a, b) => b.logonTime.getTime() - a.logonTime.getTime())
			.slice(0, 20)
	);
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
			<p class="font-semibold">Last Activity</p>
			<p class={Number(lastActivity) < 3 ? 'text-warning' : ''}>{lastActivity}h / 3:00h</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Month</p>
			<p>{month}h</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-1">
			<p class="font-semibold">Year</p>
			<p>{year}h</p>
		</div>
		{#if showExternal}
			<div class="flex flex-col items-center justify-center gap-1">
				<p class="font-semibold">External Quarter</p>
				<p>{externalQuarter}h</p>
			</div>
			<div class="flex flex-col items-center justify-center gap-1">
				<p class="font-semibold">External Last Quarter</p>
				<p>{externalLastQuarter}h</p>
			</div>
		{/if}
	</div>
	<h2 class="mt-4 mb-2 font-semibold">Last 20 Sessions</h2>
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
				{#each last20Sessions as session, i (session.id)}
					<tr>
						<td>{i + 1}</td>
						<td>{session.position.callsign}</td>
						<td>{session.logonTime.toLocaleString()}</td>
						<td>{(session.duration / 3600).toFixed(2)}h</td>
					</tr>
				{/each}
				{#if last20Sessions.length === 0}
					<tr>
						<td colspan="4" class="text-center"> No sessions found </td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
