<script lang="ts">
	import type { UserAdminDetails } from '$lib/remote/user-admin.remote';

	let { details }: { details: UserAdminDetails } = $props();
</script>

<div class="flex flex-col rounded border border-gray-600 p-4">
	<div class="mb-3">
		<h1 class="text-lg font-semibold">Personal Information</h1>
		<p class="text-sm text-gray-500 italic">Editable via my.vatsim.net</p>
	</div>

	<div class="flex flex-row gap-3">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Firstname</legend>
			<input
				type="text"
				class="input w-full cursor-default"
				readonly
				value={details.user?.name_first}
			/>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Lastname</legend>
			<input
				type="text"
				class="input w-full cursor-default"
				readonly
				value={details.user?.name_last}
			/>
		</fieldset>
	</div>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Email</legend>
		<input type="text" class="input w-96 cursor-default" readonly value={details.user?.email} />
	</fieldset>
	<div class="flex flex-row gap-3">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">CID</legend>
			<input type="text" class="input w-full cursor-default" readonly value={details.user?.cid} />
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Rating</legend>
			<input
				type="text"
				class="input w-full cursor-default"
				readonly
				value={`${details.user?.rating.long} (${details.user?.rating.short})`}
			/>
		</fieldset>
	</div>
</div>
