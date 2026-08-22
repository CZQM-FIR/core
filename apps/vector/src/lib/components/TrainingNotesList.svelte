<script lang="ts">
	import type { LegacyTrainingNote, StudentTrainingNote } from '$lib/trainingNoteTypes';

	let {
		notes,
		legacyNotes,
		legacyError,
		sessionHrefPrefix,
		emptyMessage,
		emptyVectorMessage
	}: {
		notes: StudentTrainingNote[];
		legacyNotes: LegacyTrainingNote[];
		legacyError: string | null;
		sessionHrefPrefix: string;
		emptyMessage: string;
		emptyVectorMessage: string;
	} = $props();

	const showLegacy = $derived(legacyNotes.length > 0 || legacyError != null);

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

	function formatLegacyDate(createdAt: Date | string | null, createdAtRaw: string | null): string {
		if (createdAt) {
			const date = toDate(createdAt);
			if (!Number.isNaN(date.getTime())) return formatDateTime(date);
		}
		return createdAtRaw ?? 'Unknown date';
	}
</script>

{#snippet noteCardBody(
	dateLabel: string,
	title: string | null,
	sessionType: string | null,
	position: string | null,
	instructor: string | null,
	note: string | null
)}
	<div class="card-body gap-1 p-4">
		<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
			{#if title}
				<h2 class="card-title text-base">{title}</h2>
			{/if}
			<p class="text-xs opacity-70">{dateLabel}</p>
		</div>
		{#if sessionType || position || instructor}
			<p class="text-xs opacity-80">
				{#if sessionType}{sessionType}{/if}
				{#if position}
					{#if sessionType}
						<span class="opacity-50"> · </span>
					{/if}
					{position}
				{/if}
				{#if instructor}
					{#if sessionType || position}
						<span class="opacity-50"> · </span>
					{/if}
					{instructor}
				{/if}
			</p>
		{/if}
		{#if note}
			<p class="text-sm whitespace-pre-wrap">{note}</p>
		{/if}
	</div>
{/snippet}

{#if notes.length === 0 && !showLegacy}
	<p class="text-sm">{emptyMessage}</p>
{:else}
	{#if notes.length === 0 && showLegacy}
		<p class="text-sm opacity-70">{emptyVectorMessage}</p>
	{:else}
		<div class="flex flex-col gap-2">
			{#each notes as note (note.sessionId)}
				<a
					href="{sessionHrefPrefix}/{note.sessionId}"
					class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
				>
					{@render noteCardBody(
						formatDateTime(note.notesSubmittedAt ?? note.actualEndedAt ?? note.startsAt),
						note.courseName,
						note.sessionDescription,
						note.positionTrained,
						`${note.instructorName} (${note.instructorRole})`,
						note.instructorNotes
					)}
				</a>
			{/each}
		</div>
	{/if}

	{#if showLegacy}
		<section class="mt-8">
			<h2 class="text-xl font-semibold">Legacy notes</h2>
			<p class="text-sm opacity-70">
				These were created in VATCAN before Vector and are not linked to a session.
			</p>
			{#if legacyError}
				<p class="text-error mt-3 text-sm">{legacyError}</p>
			{/if}
			{#if legacyNotes.length > 0}
				<div class="mt-4 flex flex-col gap-2">
					{#each legacyNotes as note (note.id)}
						<div class="card bg-base-200 shadow-sm">
							{@render noteCardBody(
								formatLegacyDate(note.createdAt, note.createdAtRaw),
								null,
								note.sessionTypeLabel,
								note.position,
								note.instructorName,
								note.trainingNote
							)}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
{/if}
