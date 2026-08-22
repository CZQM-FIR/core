<script lang="ts">
	import TrainingNotesList from '$lib/components/TrainingNotesList.svelte';
	import { getMyTrainingNotes } from '$lib/remote/student.remote';

	const notesQuery = getMyTrainingNotes();

	const notes = $derived(notesQuery.current?.notes ?? []);
	const legacyNotes = $derived(notesQuery.current?.legacyNotes ?? []);
	const legacyError = $derived(notesQuery.current?.legacyError ?? null);
</script>

<section class="container mx-auto py-5">
	<h1 class="text-3xl font-semibold">Training Notes</h1>
	<p class="mt-1 text-sm opacity-70">All of your submitted training notes in one place.</p>

	{#if notesQuery.loading && !notesQuery.current}
		<p class="mt-6">Loading training notes...</p>
	{:else if notesQuery.error && !notesQuery.current}
		<p class="text-error mt-6">{notesQuery.error.message}</p>
	{:else}
		<div class="mt-6">
			<TrainingNotesList
				{notes}
				{legacyNotes}
				{legacyError}
				sessionHrefPrefix="/sessions"
				emptyMessage="You don't have any training notes yet."
				emptyVectorMessage="You don't have any Vector training notes yet."
			/>
		</div>
	{/if}
</section>
