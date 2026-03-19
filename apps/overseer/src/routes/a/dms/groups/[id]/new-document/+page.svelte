<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createDocument, getDocuments, getGroup } from '$lib/remote/dms.remote';
	import { ChevronLeft } from '@lucide/svelte';
	import { onMount } from 'svelte';

	$effect(() => {
		if (page.params.id === undefined) {
			goto('/a/dms');
		}
	});

	let id = $state<string>(page.params.id!);
	let name = $state('');
	let existingDocumentNames = $state<string[]>([]);

	const normalizeName = (value: string) => value.trim().toLowerCase();
	let hasDuplicateName = $derived(
		normalizeName(name).length > 0 && existingDocumentNames.includes(normalizeName(name))
	);

	onMount(async () => {
		const documents = await getDocuments();
		existingDocumentNames = documents.map((document) => normalizeName(document.name));
	});

	const preventDuplicateNameSubmission = (event: SubmitEvent) => {
		if (hasDuplicateName) {
			event.preventDefault();
		}
	};
</script>

<section>
	<div class="container mx-auto">
		{#await getGroup(id)}
			<h1 class="pt-6 text-2xl font-semibold">Create Document: <i>Loading Group</i></h1>
		{:then group}
			<h1 class="pt-6 text-2xl font-semibold">Create Document: {group.name}</h1>
		{:catch error}
			<p class="text-error">Error loading group: {error.message}</p>
		{/await}

		<a
			href={`/a/dms/groups/${id}`}
			class="text-primary hover:link flex flex-row items-center gap-1"
		>
			<ChevronLeft size="15" /> Back to Group
		</a>
		<div class="divider"></div>

		<form {...createDocument} class="flex flex-col gap-4" onsubmit={preventDuplicateNameSubmission}>
			<input type="hidden" name="groupId" value={id} />

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Document Name</legend>
				<input
					{...createDocument.fields.name.as('text')}
					class="input"
					required
					bind:value={name}
				/>
				<p class="label text-error text-sm">
					{createDocument.fields.name
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
				{#if hasDuplicateName}
					<p class="label text-error text-sm">Document name must be unique.</p>
				{/if}
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Short Name</legend>
				<input {...createDocument.fields.short.as('text')} class="input" />
				<p class="label text-error text-sm">
					{createDocument.fields.short
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
				<p class="label text-sm">Optional short label used in compact views.</p>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Description</legend>
				<textarea name="description" class="textarea h-28"></textarea>
				<p class="label text-sm">Optional additional details for this document type.</p>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Required</legend>
				<select name="required" class="select" required>
					<option value="false">No - Users do not need to acknowledge changes</option>
					<option value="true">Yes - Users must acknowledge changes</option>
				</select>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Sort Order</legend>
				<input type="number" name="sort" class="input" value="99" min="0" max="99" />
				<p class="label text-error text-sm">
					{createDocument.fields.sort
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
				<p class="label text-sm">Documents are sorted from 0-99 by this value.</p>
			</fieldset>

			<p class="label text-error text-sm">
				{createDocument.fields.groupId
					.issues()
					?.map((issue) => issue.message)
					.join(' ')}
			</p>

			<button class="btn btn-primary max-w-42">Create Document</button>
		</form>
	</div>
</section>
