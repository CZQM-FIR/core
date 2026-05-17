<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import {
		createAssistant,
		getAssistants,
		removeAssistant,
		type AssistantRow
	} from '$lib/remote/assistants.remote';
	import { ASSISTANT_ROLE_INFO, ASSISTANT_ROLES_ORDERED } from '@czqm/common';
	import type { AssistantRole } from '@czqm/db/schema';

	const assistantsQuery = getAssistants();

	function groupByRole(rows: AssistantRow[]): Record<AssistantRole, AssistantRow[]> {
		const groups = {
			'asst-web': [],
			'asst-chief-instructor': [],
			'asst-events': [],
			'asst-sector': []
		} as Record<AssistantRole, AssistantRow[]>;
		for (const row of rows) {
			groups[row.role]?.push(row);
		}
		return groups;
	}
</script>

<section>
	<div class="container mx-auto mb-8">
		<h1 class="pt-6 text-2xl font-semibold">Staff Roles</h1>
		<div class="divider"></div>

		{#await assistantsQuery}
			<p>Loading staff roles...</p>
		{:then rows}
			{@const groups = groupByRole(rows)}
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
				{#each ASSISTANT_ROLES_ORDERED as role (role)}
					{@const info = ASSISTANT_ROLE_INFO[role]}
					{@const list = groups[role]}
					<div class="flex flex-col rounded border border-gray-600 p-4">
						<h2 class="text-lg font-semibold">{info.label}</h2>
						<p class="text-sm text-gray-400">Supports the {info.parentLabel}.</p>

						<div class="divider mb-1 mt-3">Currently Assigned</div>
						{#if list.length === 0}
							<p class="text-sm italic text-gray-400">No one assigned.</p>
						{:else}
							<ul class="flex flex-col gap-2">
								{#each list as row (row.id)}
									<li class="flex flex-col gap-1 rounded bg-base-200 p-2">
										<div class="flex flex-row items-center gap-2">
											<a href={`/a/users/${row.cid}`} class="hover:link font-medium">
												{row.name}
											</a>
											<span class="badge badge-ghost badge-sm">{row.cid}</span>
											<form
												{...removeAssistant.for(String(row.id))}
												class="ml-auto"
											>
												<input type="hidden" name="id" value={row.id} />
												<button
													type="submit"
													class="btn btn-xs btn-ghost text-error"
													title="Unassign"
													aria-label="Unassign"
												>
													<Trash2 size="14" />
												</button>
											</form>
										</div>
									</li>
								{/each}
							</ul>
						{/if}

						<div class="divider mb-1 mt-3">Assign</div>
						<form {...createAssistant.for(role)} class="flex flex-col gap-2">
							<input type="hidden" name="role" value={role} />
							<div class="flex flex-row items-center gap-2">
								<input
									type="number"
									name="cid"
									class="input input-sm min-w-0 flex-1"
									placeholder="CID (e.g. 1234567)"
									required
								/>
								<button type="submit" class="btn btn-primary shrink-0">Assign</button>
							</div>
							{#if createAssistant.for(role).result?.ok === false}
								<p class="text-error text-sm">{createAssistant.for(role).result?.message}</p>
							{:else if createAssistant.for(role).result?.ok}
								<p class="text-success text-sm">{createAssistant.for(role).result?.message}</p>
							{/if}
						</form>
					</div>
				{/each}
			</div>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load staff roles.'}</p>
		{/await}
	</div>
</section>
