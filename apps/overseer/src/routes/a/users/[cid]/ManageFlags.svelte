<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex min-w-96 flex-col rounded border border-gray-600 p-4">
	<h1 class="mb-3 text-lg font-semibold">User Flags</h1>
	<form method="POST" action="?/addFlag" class="flex flex-row gap-3" use:enhance>
		<select name="flag" class="select">
			{#each data.flags as flag (flag.id)}
				<option value={flag.id}>{flag.name}</option>
			{/each}
		</select>
		<input type="text" name="cid" value={data.cid} hidden required />
		<button type="submit" class="btn btn-success btn-outline">Add Flag</button>
	</form>
	{#if data.user!.flags.length > 0}
		<div class="divider mb-0">Current Flags</div>
		<ul class="">
			{#each data.user!.flags as flag (flag.flagId)}
				<li>
					<form action="?/removeFlag" method="post" use:enhance>
						<input type="text" name="cid" required hidden value={data.cid} />
						<input type="text" name="flag" required hidden value={flag.flagId} />
						<button type="submit" class="hover:text-error hover:line-through"
							>- {flag.flag.name}</button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>
