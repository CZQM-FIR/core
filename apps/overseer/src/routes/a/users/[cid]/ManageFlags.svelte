<script lang="ts">
	import type { UserAdminDetails } from '$lib/remote/user-admin.remote';
	import { addUserFlag, removeUserFlag } from '$lib/remote/user-admin.remote';

	let { details }: { details: UserAdminDetails } = $props();
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="mb-3 text-lg font-semibold">User Flags</h1>
	<form {...addUserFlag} class="flex flex-row gap-3">
		<select name="flag" class="select">
			{#each details.flags as flag (flag.id)}
				<option value={flag.id}>{flag.name}</option>
			{/each}
		</select>
		<input type="text" name="cid" value={details.cid} hidden required />
		<button type="submit" class="btn btn-success btn-outline">Add Flag</button>
	</form>
	{#if details.user.flags.length > 0}
		<div class="divider mb-0">Current Flags</div>
		<ul class="">
			{#each details.user.flags as flag (flag.id)}
				<li>
					<form {...removeUserFlag.for(String(flag.id))}>
						<input type="text" name="cid" required hidden value={details.cid} />
						<input type="text" name="flag" required hidden value={flag.id} />
						<button type="submit" class="hover:text-error hover:line-through">- {flag.name}</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>
