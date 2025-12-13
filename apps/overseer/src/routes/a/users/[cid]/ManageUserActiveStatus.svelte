<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let localUserData = $state(data.user!);

	if (form && form.status !== 200 && form.active !== undefined) {
		localUserData.active = form.active;
	}
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="mb-3 text-lg font-semibold">User Activity</h1>
	<div class="join">
		<form
			action="?/setActiveStatus"
			method="post"
			use:enhance={() => {
				let temp = localUserData.active;
				localUserData.active = 2;
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						localUserData.active = 1;
					} else localUserData.active = temp;
				};
			}}
		>
			<input type="number" name="status" value={1} hidden />
			<button
				type={localUserData.active === 1 ? 'button' : 'submit'}
				class="join-item btn btn-success {localUserData.active === 1 ? '' : 'btn-outline'}"
				>Active</button
			>
		</form>

		<form
			action="?/setActiveStatus"
			method="post"
			use:enhance={() => {
				let temp = localUserData.active;
				localUserData.active = 2;
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						localUserData.active = -1;
					} else localUserData.active = temp;
				};
			}}
		>
			<input type="number" name="status" value={-1} hidden />
			<button
				type={localUserData.active === -1 ? 'button' : 'submit'}
				class="join-item btn btn-warning {localUserData.active === -1 ? '' : 'btn-outline'}"
				>On Leave</button
			>
		</form>

		<form
			action="?/setActiveStatus"
			method="post"
			use:enhance={() => {
				let temp = localUserData.active;
				localUserData.active = 2;
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						localUserData.active = 0;
					} else localUserData.active = temp;
				};
			}}
		>
			<input type="number" name="status" value={0} hidden />
			<button
				type={localUserData.active === 0 ? 'button' : 'submit'}
				class="join-item btn btn-error {localUserData.active === 0 ? '' : 'btn-outline'}"
				>Inactive</button
			>
		</form>
	</div>
</div>
