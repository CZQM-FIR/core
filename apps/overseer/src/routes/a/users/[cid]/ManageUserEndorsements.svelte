<script lang="ts">
	import type { PageProps } from './$types';
	import type { RosterUserData } from '@czqm/db/schema';

	let { data, localUserData, form }: PageProps & { localUserData: RosterUserData } = $props();

	let activeEndorsements = localUserData.soloEndorsements.filter((e) => e.expiresAt > new Date());
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="text-lg font-semibold">Solo Endorsements</h1>
	<div class="mb-3">
		{#if activeEndorsements.length > 0}
			<div class="rounded-box border-base-content/5 bg-base-100 mt-1 overflow-x-auto border">
				<table class="table">
					<!-- head -->
					<thead>
						<tr>
							<th>Position</th>
							<th>Expires</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each activeEndorsements as endorsement (endorsement.id)}
							<tr>
								<td>{endorsement.position.callsign}</td>
								<td
									>{endorsement.expiresAt.toLocaleDateString('en-GB', {
										timeZone: 'UTC'
									})}
								</td>
								<td>
									<form method="POST">
										<input type="number" name="cid" value={localUserData.cid} class="hidden" />
										<input type="number" name="id" value={endorsement.id} class="hidden" />
										<div class="flex flex-row gap-2">
											<button formaction="?/deleteSoloEndorsement" class="btn btn-sm">Revoke</button
											>
											<button formaction="?/extendSoloEndorsement" class="btn btn-sm">30+</button>
										</div>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-gray-500 italic">No Active Endorsements</p>
		{/if}
	</div>

	<h3 class="mt-auto">New Endorsement</h3>
	<form class="flex w-full items-baseline gap-3" method="POST" action="?/createSoloEndorsement">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Position</legend>
			<input type="text" class="input w-30" required name="position" placeholder="CXXX_GND" />
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Duration</legend>
			<input
				placeholder="# of Days"
				type="number"
				min={1}
				max={30}
				class="input min-w-30"
				required
				name="duration"
			/>
		</fieldset>
		<input name="cid" type="number" value={data.cid} class="hidden" />
		<button class="btn btn-primary">Save</button>
	</form>
	{#if form && (form.status?.toString().startsWith('4') || form.status?.toString().startsWith('5'))}
		<p class="text-error text-sm">Error: {form.statusText}</p>
	{:else if form && form.status === 200}
		<p class="text-success text-sm">{form.statusText}</p>
	{/if}
</div>
