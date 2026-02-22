<script lang="ts">
	import type { UserAdminDetails } from '$lib/remote/user-admin.remote';
	import {
		createSoloEndorsement,
		deleteSoloEndorsement,
		extendSoloEndorsement
	} from '$lib/remote/user-admin.remote';

	let { details }: { details: UserAdminDetails } = $props();

	let activeEndorsements = $derived(
		details.user.soloEndorsements.filter((e) => e.expiresAt > new Date())
	);

	// Track messages and status
	let message = $state<{ text: string; isError: boolean } | null>(null);

	// Check for results from the create form
	$effect(() => {
		if (createSoloEndorsement.result) {
			message = {
				text: createSoloEndorsement.result.message,
				isError: !createSoloEndorsement.result.ok
			};
		}
	});

	// Check for results from keyed forms (extend and delete)
	$effect(() => {
		// Check each endorsement's extend/delete form results
		for (const endorsement of activeEndorsements) {
			const key = String(endorsement.id);
			const extendForm = extendSoloEndorsement.for(key);
			const deleteForm = deleteSoloEndorsement.for(key);

			if (extendForm.result) {
				message = {
					text: extendForm.result.message,
					isError: !extendForm.result.ok
				};
				break;
			}

			if (deleteForm.result) {
				message = {
					text: deleteForm.result.message,
					isError: !deleteForm.result.ok
				};
				break;
			}
		}
	});
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="text-lg font-semibold">Solo Endorsements</h1>
	<div class="mb-3">
		{#if activeEndorsements.length > 0}
			<div
				class="rounded-box border-base-content/5 bg-base-100 mt-1 overflow-x-auto overflow-y-visible border"
			>
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
							{@const now = new Date()}
							{@const daysUntilExpiry = Math.ceil(
								(endorsement.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
							)}
							{@const canExtend = daysUntilExpiry <= 7}
							<tr>
								<td>{endorsement.position.callsign}</td>
								<td
									>{endorsement.expiresAt.toLocaleDateString('en-GB', {
										timeZone: 'UTC'
									})}
								</td>
								<td>
									<div class="flex flex-row gap-2">
										<input type="number" name="cid" value={details.user.cid} class="hidden" />
										<input type="number" name="id" value={endorsement.id} class="hidden" />
										<form {...deleteSoloEndorsement.for(String(endorsement.id))}>
											<input type="number" name="cid" value={details.user.cid} class="hidden" />
											<input type="number" name="id" value={endorsement.id} class="hidden" />
											<button type="submit" class="btn btn-sm">Revoke</button>
										</form>
										<form {...extendSoloEndorsement.for(String(endorsement.id))}>
											<input type="number" name="cid" value={details.user.cid} class="hidden" />
											<input type="number" name="id" value={endorsement.id} class="hidden" />
											<button
												type="button"
												class="btn btn-sm"
												onclick={(e) => {
													if (!canExtend) {
														alert('Endorsement can only be extended within 7 days of expiration');
														return;
													}
													(e.target as HTMLButtonElement).closest('form')?.requestSubmit();
												}}
											>
												30+
											</button>
										</form>
									</div>
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
	<form {...createSoloEndorsement} class="flex w-full items-baseline gap-3">
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
		<input name="cid" type="number" value={details.cid} class="hidden" />
		<button class="btn btn-primary">Save</button>
	</form>
	{#if message}
		<p class="{message.isError ? 'text-error' : 'text-success'} mt-2 text-sm">
			{message.text}
		</p>
	{/if}
</div>
