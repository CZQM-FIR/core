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

	const groupQuery = $derived(getGroup(id));
	const documentsQuery = $derived(getDocumentsByGroup(id));
</script>

<section>
	<div class="container mx-auto">
		{#if groupQuery.error}
			<p class="text-error">Error loading group: {groupQuery.error.message}</p>
		{:else if !groupQuery.ready}
			<h1 class="pt-6 text-2xl font-semibold">DMS Group: <i>Loading Group</i></h1>
		{:else}
			{@const group = groupQuery.current}
			<h1 class="pt-6 text-2xl font-semibold">DMS Group: {group.name} ( /{group.slug} )</h1>
		{/if}

		<a href="/a/dms" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to DMS
		</a>
		<div class="mt-4">
			<a href={`/a/dms/groups/${id}/new-document`} class="btn btn-primary">Create Document</a>
		</div>
		<div class="divider"></div>

		<div class="mt-5 overflow-x-auto">
			{#if documentsQuery.error}
				<p class="text-error">Error loading documents: {documentsQuery.error.message}</p>
			{:else if !documentsQuery.ready}
				<p>Loading documents...</p>
			{:else}
				{@const sortedDocuments = [...documentsQuery.current].sort(
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
							<th></th>
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
									<td>
										<a
											class="btn btn-xs btn-outline btn-secondary"
											href="/a/dms/document/{documentId}">Manage</a
										>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</section>
