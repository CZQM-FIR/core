<script lang="ts">
	import { createSubscriber } from 'svelte/reactivity';

	let {
		onSync,
		error = $bindable<string | null>(null)
	}: {
		onSync: () => Promise<void>;
		error?: string | null;
	} = $props();

	let syncing = $state(false);
	let syncCooldownUntil = $state(0);

	const subscribeToNow = createSubscriber((update) => {
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});

	const syncCooldownSeconds = $derived.by(() => {
		const remaining = Math.ceil((syncCooldownUntil - Date.now()) / 1000);
		if (remaining > 0) subscribeToNow();
		return remaining > 0 ? remaining : 0;
	});

	async function handleSyncTasks() {
		syncing = true;
		error = null;
		try {
			await onSync();
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				error = body?.message ?? 'Failed to sync tasks';
			} else if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to sync tasks';
			}
		} finally {
			syncing = false;
			syncCooldownUntil = Date.now() + 60_000;
		}
	}
</script>

<button
	type="button"
	class="btn btn-outline btn-sm"
	disabled={syncing || syncCooldownSeconds > 0}
	onclick={handleSyncTasks}
>
	{#if syncing}
		<span class="loading loading-spinner loading-sm"></span>
		Syncing...
	{:else if syncCooldownSeconds > 0}
		Refresh in {syncCooldownSeconds}s
	{:else}
		Sync tasks
	{/if}
</button>
