<script lang="ts">
	import type { PageData } from './$types';
	import type { RosterPosition } from '@czqm/db/schema';

	let { data }: { data: PageData } = $props();

	let localUserData = $state(data.user!);
	type LocalUserData = typeof localUserData;

	const getRosterStatus = (position: RosterPosition) => {
		if (
			localUserData.soloEndorsements.filter((r) => {
				if (r.position.callsign.toLowerCase().includes(position) && r.expiresAt > new Date()) {
					return 1;
				}
			}).length > 0
		) {
			return 1; // solo
		} else if (
			localUserData.roster.filter((r) => r.position.toLowerCase() === position.toLowerCase())
				.length === 0
		) {
			return -1; // N/A
		} else if (localUserData.roster.filter((r) => r.position === position)[0].status === 0) {
			return 0; // training
		} else if (localUserData.roster.filter((r) => r.position === position)[0].status === 2) {
			return 2; // certified
		} else {
			return -1; // N/A
		}
	};

	const getRosterButtonColour = (position: RosterPosition) => {
		const status = getRosterStatus(position);

		console.log(status, position);

		if (status === 1) {
			console.log('solo', position);
			return 'btn-warning cursor-default'; //solo
		} else if (status === 2) {
			return 'btn-success'; //certified
		} else if (status === 0) {
			return 'btn-error'; //training
		} else if (status === -1) {
			return ''; //N/A
		}
	};

	const toggleRosterStatus = async (position: RosterPosition): Promise<void> => {
		if (getRosterStatus(position) === 1) {
			alert(
				'You cannot change the status of a solo endorsement. Please remove the endorsement first.'
			);
			return;
		}
		let currentIndex = localUserData.roster.findIndex((r) => r.position === position);
		let currentStatus = currentIndex === -1 ? -1 : localUserData.roster[currentIndex].status;

		if (currentIndex === -1) {
			localUserData.roster.push({
				controllerId: Number(data.cid),
				id: 0,
				position,
				status: 0
			});
			currentIndex = localUserData.roster.length - 1;
		} else {
			localUserData.roster[currentIndex].status =
				currentStatus === 2 ? -1 : currentStatus + 1 === 1 ? 2 : 0;
		}

		const res = await fetch(`/a/users/${data.cid}/roster`, {
			method: 'PATCH',
			body: JSON.stringify({
				position: position,
				status: localUserData.roster[currentIndex].status
			})
		});

		if (res.ok) {
			localUserData = ((await res.json()) as any).user as LocalUserData;
		} else {
			localUserData.roster[currentIndex].status = currentStatus;
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
			onclick={() => toggleRosterStatus('gnd')}>GND</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('twr')}"
			onclick={() => toggleRosterStatus('twr')}>TWR</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('app')}"
			onclick={() => toggleRosterStatus('app')}>APP</button
		>
		<button
			class="btn join-item min-w-20 {getRosterButtonColour('ctr')}"
			onclick={() => toggleRosterStatus('ctr')}>CTR</button
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
