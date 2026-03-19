<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getGroup, getDocumentsByGroup } from '$lib/remote/dms.remote';
	import { ChevronLeft } from '@lucide/svelte';

	$effect(() => {
		if (page.params.id === undefined) {
			goto('/a/dms');
		}
	});

	let id = $state<string>(page.params.id!);
</script>

<section>
	<div class="container mx-auto">
		{#await getGroup(id)}
			<h1 class="pt-6 text-2xl font-semibold">DMS Group: <i>Loading Group</i></h1>
		{:then group}
			<h1 class="pt-6 text-2xl font-semibold">DMS Group: {group.name} ( /{group.slug} )</h1>
		{:catch error}
			<p class="text-error">Error loading group: {error.message}</p>
		{/await}

		<a href="/a/dms" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to DMS
		</a>
		<div class="mt-4">
			<a href={`/a/dms/groups/${id}/new-document`} class="btn btn-primary">Create Document</a>
		</div>
		<div class="divider"></div>

		<div class="mt-5 overflow-x-auto">
			{#await getDocumentsByGroup(id)}
				<p>Loading documents...</p>
			{:then documents}
				{@const sortedDocuments = [...documents].sort(
					(a, b) => (a.sort ?? 99) - (b.sort ?? 99) || a.name.localeCompare(b.name)
				)}
				<table class="table">
					<thead>
						<tr>
							<th>#</th>
							<th>Document Name</th>
							<th>Short</th>
							<th>Required</th>
							<th>Sort</th>
						</tr>
					</thead>
					<tbody>
						{#if sortedDocuments.length === 0}
							<tr>
								<td colspan="5" class="text-base-content/70 py-6 text-center">
									No documents found for this group.
								</td>
							</tr>
						{:else}
							{#each sortedDocuments as { id: documentId, name, short, required, sort, group }, index (documentId)}
								<tr>
									<td>{index + 1}</td>
									<td>{name}</td>
									{#if short}
										<td>{group?.slug} / {short}</td>
									{:else}
										<td>-</td>
									{/if}
									<td>{required ? 'Yes' : 'No'}</td>
									<td>{sort ?? 99}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			{:catch error}
				<p class="text-error">Error loading documents: {error.message}</p>
			{/await}
		</div>
	</div>
</section>
