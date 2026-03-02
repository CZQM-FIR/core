<script lang="ts">
	import { getGroups } from '$lib/remote/dms.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let ackRequired = $state(true);
</script>

<section class="container mx-auto">
	<h1 class="pt-6 text-2xl font-semibold">DMS - Create New Document</h1>
	<a href="/a/dms" class="hover:link text-info italic">{'<'} Return to DMS</a>
	<div class="divider"></div>

	<div class="mb-4">
		<p>
			To create a new document, please fill out all required fields below. Please note: updated
			versions of pre-existing documents shall be created as assets on the existing document
		</p>
		<p>
			A "short link" is a simple, short, direct link to the most recent asset of the document
			intended to be used as a publically distributed access point to the document.
		</p>
	</div>

	<form>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Document Name</legend>
			<input type="text" class="input" placeholder="Type here" required />
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Description</legend>
			<textarea class="textarea h-24" placeholder="Description..."></textarea>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Acknowledgement Required</legend>
			<label class="label">
				<input type="checkbox" bind:checked={ackRequired} class="toggle" />
				{#if !ackRequired}
					Not
				{/if} Required
			</label>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Short Link</legend>
			<input type="text" class="input" placeholder="https://czqm.ca/f/..." />
			<span class="label">Optional</span>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Document Group</legend>
			<select class="select">
				<option selected>No Group</option>
				{#each await getGroups() as group}
					<option value={group.id}>{group.name}</option>
				{/each}
			</select>
		</fieldset>
	</form>
</section>
