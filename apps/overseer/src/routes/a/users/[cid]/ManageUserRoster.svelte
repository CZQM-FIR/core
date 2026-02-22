<script lang="ts">
	import type { RosterPositionStatus } from '@czqm/common';
	import type { UserAdminDetails } from '$lib/remote/user-admin.remote';
	import type { RosterPosition } from '@czqm/db/schema';

	let { details }: { details: UserAdminDetails } = $props();

	let localRoster = $state({
		gnd: 'nothing' as RosterPositionStatus,
		twr: 'nothing' as RosterPositionStatus,
		app: 'nothing' as RosterPositionStatus,
		ctr: 'nothing' as RosterPositionStatus
	});

	$effect(() => {
		localRoster.gnd = details.roster?.gnd ?? 'nothing';
		localRoster.twr = details.roster?.twr ?? 'nothing';
		localRoster.app = details.roster?.app ?? 'nothing';
		localRoster.ctr = details.roster?.ctr ?? 'nothing';
	});

	const getRosterStatus = (position: RosterPosition): RosterPositionStatus => {
		return localRoster[position] ?? 'nothing';
	};

	const rosterStatusToDbStatus = (status: RosterPositionStatus): -1 | 0 | 1 | 2 => {
		if (status === 'training') {
			return 0;
		}
		if (status === 'certified') {
			return 2;
		}
		if (status === 'solo') {
			return 1;
		}
		return -1;
	};

	const getRosterButtonColour = (position: RosterPosition) => {
		const status = getRosterStatus(position);
		if (status === 'solo') {
			return 'btn-warning cursor-default'; //solo
		} else if (status === 'certified') {
			return 'btn-success'; //certified
		} else if (status === 'training') {
			return 'btn-error'; //training
		} else if (status === 'nothing') {
			return ''; //N/A
		}
	};

	const toggleRosterStatus = async (position: RosterPosition): Promise<void> => {
		const currentStatus = getRosterStatus(position);

		if (currentStatus === 'solo') {
			alert(
				'You cannot change the status of a solo endorsement. Please remove the endorsement first.'
			);
			return;
		}

		const nextStatus: RosterPositionStatus =
			currentStatus === 'certified'
				? 'nothing'
				: currentStatus === 'training'
					? 'certified'
					: 'training';

		localRoster[position] = nextStatus;

		const res = await fetch(`/a/users/${details.cid}/roster`, {
			method: 'PATCH',
			body: JSON.stringify({
				position: position,
				status: rosterStatusToDbStatus(nextStatus)
			})
		});

		if (res.ok) {
			const responseData = (await res.json()) as {
				roster?: UserAdminDetails['roster'];
			};
			if (responseData.roster) {
				localRoster.gnd = responseData.roster.gnd ?? localRoster.gnd;
				localRoster.twr = responseData.roster.twr ?? localRoster.twr;
				localRoster.app = responseData.roster.app ?? localRoster.app;
				localRoster.ctr = responseData.roster.ctr ?? localRoster.ctr;
			}
		} else {
			localRoster[position] = currentStatus;
		}
	};
</script>

<div class="flex flex-col rounded border border-gray-600 p-4">
	<div class="mb-3">
		<h1 class="text-lg font-semibold">Control Authorization</h1>
		<p class="text-sm text-gray-500 italic">To manage a solo, please see "Solo Endorsements"</p>
		<!-- To be manual overide only once training system is online -->
		<!-- <p class="text-sm text-gray-500 italic">Manual Overide</p> -->
	</div>

	<div class="join">
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('gnd')}"
			onclickcapture={() => toggleRosterStatus('gnd')}>GND</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('twr')}"
			onclickcapture={() => toggleRosterStatus('twr')}>TWR</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('app')}"
			onclickcapture={() => toggleRosterStatus('app')}>APP</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('ctr')}"
			onclickcapture={() => toggleRosterStatus('ctr')}>CTR</button
		>
	</div>

	<fieldset class="fieldset mt-auto">
		<legend class="fieldset-legend">Legend</legend>
		<div class="join">
			<button class="btn join-item cursor-default">N/A</button>
			<button class="btn join-item btn-error cursor-default">Training</button>
			<button class="btn join-item btn-warning cursor-default">Solo</button>
			<button class="btn join-item btn-success cursor-default">Certified</button>
		</div>
	</fieldset>
</div>
