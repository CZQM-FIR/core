<script lang="ts">
	import { setUserActiveStatus, type UserAdminDetails } from '$lib/remote/user-admin.remote';

	let { details }: { details: UserAdminDetails } = $props();

	// Reactively compute the current status from the user's active field
	let currentStatus = $derived<-1 | 0 | 1>(
		details.user.active === 'active' ? 1 : details.user.active === 'loa' ? -1 : 0
	);

	// Local state for UI - matches currentStatus unless we're performing an update
	let localActive = $state<-1 | 0 | 1 | 2>(0);

	// Sync on mount and when currentStatus changes (unless we're in the middle of an update)
	let isUpdating = $state(false);

	$effect(() => {
		if (!isUpdating) {
			localActive = currentStatus;
		}
	});

	const setStatus = async (status: -1 | 0 | 1) => {
		if (localActive === status) {
			return;
		}

		const previousStatus = localActive;
		isUpdating = true;
		localActive = 2;

		try {
			const result = await setUserActiveStatus({ cid: details.user.cid, status });
			localActive = result.active;
		} catch (err) {
			console.error('Failed to update user status:', err);
			localActive = previousStatus;
		} finally {
			isUpdating = false;
		}
	};
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="mb-3 text-lg font-semibold">User Activity</h1>
	<div class="join">
		<button
			type="button"
			onclick={() => setStatus(1)}
			class="join-item btn btn-success {localActive === 1 ? '' : 'btn-outline'}"
		>
			Active
		</button>

		<button
			type="button"
			onclick={() => setStatus(-1)}
			class="join-item btn btn-warning {localActive === -1 ? '' : 'btn-outline'}"
		>
			On Leave
		</button>

		<button
			type="button"
			onclick={() => setStatus(0)}
			class="join-item btn btn-error {localActive === 0 ? '' : 'btn-outline'}"
		>
			Inactive
		</button>
	</div>
</div>
