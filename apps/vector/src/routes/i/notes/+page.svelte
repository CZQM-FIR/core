<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import { getAuthoredTrainingNotes } from '$lib/remote/instructor.remote';

	const notesQuery = getAuthoredTrainingNotes();

	const notes = $derived(notesQuery.current ?? []);

	function toDate(value: Date | string): Date {
		return value instanceof Date ? value : new Date(value);
	}

	function formatDateTime(value: Date | string): string {
		const date = toDate(value);
		const dateLabel = date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
		const time = date.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		return `${dateLabel} ${time}`;
	}
</script>

<section class="container mx-auto py-5">
	<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
		<ChevronLeft size="15" /> Back to Instructor Dashboard
	</a>
	<h1 class="mt-2 text-2xl font-semibold">Training Notes</h1>
	<p class="mt-1 text-sm opacity-80">
		Training notes you have submitted for sessions you instructed or mentored.
	</p>

	{#if notesQuery.loading && !notesQuery.current}
		<p class="mt-6">Loading training notes...</p>
	{:else if notesQuery.error && !notesQuery.current}
		<p class="text-error mt-6">{notesQuery.error.message}</p>
	{:else if notes.length === 0}
		<p class="mt-6 text-sm">You haven't authored any training notes yet.</p>
	{:else}
		<div class="mt-6 flex flex-col gap-2">
			{#each notes as note (note.sessionId)}
				<a
					href="/i/sessions/{note.sessionId}"
					class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
				>
					<div class="card-body gap-1 p-4">
						<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
							<h2 class="card-title text-base">{note.courseName}</h2>
							<p class="text-xs opacity-70">
								{formatDateTime(note.notesSubmittedAt ?? note.actualEndedAt ?? note.startsAt)}
							</p>
						</div>
						<p class="text-xs opacity-80">
							{note.sessionDescription}
							<span class="opacity-50"> · </span>
							{note.studentName}
							{#if note.positionTrained}
								<span class="opacity-50"> · </span>
								{note.positionTrained}
							{/if}
						</p>
						{#if note.instructorNotes}
							<p class="text-sm whitespace-pre-wrap">{note.instructorNotes}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
