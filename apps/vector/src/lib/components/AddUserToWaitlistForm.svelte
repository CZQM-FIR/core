<script lang="ts">
	import { UserPlus } from '@lucide/svelte';
	import {
		addUserToWaitlist,
		checkWaitlistPrerequisites,
		getWaitlist
	} from '$lib/remote/waitlist.remote';
	import { getAllControllers } from '$lib/remote/users.remote';
	import { getEnrolledWaitlistEntries } from '$lib/remote/waitlist.remote';

	let {
		waitlistId,
		waitlistedCids = [],
		selectClass = 'select select-sm flex-1',
		buttonClass = 'btn btn-primary btn-sm'
	}: {
		waitlistId: number;
		waitlistedCids?: number[];
		selectClass?: string;
		buttonClass?: string;
	} = $props();

	let overrideModal: HTMLDialogElement | undefined;
	let prerequisiteFailures = $state<string[]>([]);
	let selectedUserId = $state('');
	let pendingUserId = $state<number | null>(null);

	async function runAdd(userId: number, overridePrerequisites: boolean) {
		await addUserToWaitlist({ waitlistId, userId, overridePrerequisites });
		selectedUserId = '';
		pendingUserId = null;
		getWaitlist(waitlistId).refresh();
	}

	async function handleAdd() {
		const userId = Number(selectedUserId);
		if (!userId) return;

		const evaluation = await checkWaitlistPrerequisites({ waitlistId, userId });
		if (!evaluation.satisfied) {
			prerequisiteFailures = evaluation.failures;
			pendingUserId = userId;
			overrideModal?.showModal();
			return;
		}

		await runAdd(userId, false);
	}

	async function confirmOverride() {
		if (pendingUserId === null) return;
		overrideModal?.close();
		await runAdd(pendingUserId, true);
	}
</script>

<div class="flex flex-row gap-2">
	<select class={selectClass} required bind:value={selectedUserId}>
		{#await getAllControllers()}
			<option value="" disabled>Loading Controllers...</option>
		{:then controllers}
			{#await getEnrolledWaitlistEntries(waitlistId)}
				<option value="" disabled>Loading Controllers...</option>
			{:then enrolledEntries}
				<option value="" disabled selected={!selectedUserId}>Select a Student</option>
				{#each controllers
					.filter((c) => !waitlistedCids.includes(c.cid) && !enrolledEntries.some((e) => e.cid === c.cid))
					.slice()
					.sort((a, b) => a.name_first.localeCompare(b.name_first)) as controller (controller.cid)}
					<option value={String(controller.cid)}>
						{controller.name_full} ({controller.cid})
					</option>
				{/each}
			{/await}
		{/await}
	</select>
	<button
		class={buttonClass}
		type="button"
		disabled={!!addUserToWaitlist.pending || !selectedUserId}
		onclick={handleAdd}
	>
		{#if addUserToWaitlist.pending}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
			<UserPlus size="16" />
		{/if}
	</button>
</div>

<dialog class="modal" bind:this={overrideModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Prerequisites not met</h3>
		<p class="py-2">This student does not meet the following course prerequisites:</p>
		<ul class="list-disc ps-5 text-sm">
			{#each prerequisiteFailures as failure (failure)}
				<li>{failure}</li>
			{/each}
		</ul>
		<p class="text-warning pt-2 text-sm">Add them to the waitlist anyway?</p>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={!!addUserToWaitlist.pending}>Cancel</button>
			</form>
			<button
				class="btn btn-warning"
				disabled={!!addUserToWaitlist.pending}
				aria-busy={!!addUserToWaitlist.pending}
				onclick={confirmOverride}
			>
				{#if addUserToWaitlist.pending}
					<span class="loading loading-spinner loading-sm"></span>
					Adding...
				{:else}
					Add anyway
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
