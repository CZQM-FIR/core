<script lang="ts">
	import { setUserActiveStatus, type UserAdminDetails } from '$lib/remote/user-admin.remote';

	let { details }: { details: UserAdminDetails } = $props();

	// Server value, always follows the (refreshed) details prop
	let currentStatus = $derived<-1 | 0 | 1>(
		details.user.active === 'active' ? 1 : details.user.active === 'loa' ? -1 : 0
	);

	// Only set while an update is in flight (2 = updating, nothing highlighted)
	let pendingStatus = $state<2 | null>(null);
	let localActive = $derived<-1 | 0 | 1 | 2>(pendingStatus ?? currentStatus);

	const setStatus = async (status: -1 | 0 | 1) => {
		if (pendingStatus !== null || localActive === status) {
			return;
		}

		pendingStatus = 2;

		try {
			// The command refreshes the user details server-side, so `details` updates with the response
			await setUserActiveStatus({ cid: details.user.cid, status });
		} catch (err) {
			console.error('Failed to update user status:', err);
		} finally {
			pendingStatus = null;
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
