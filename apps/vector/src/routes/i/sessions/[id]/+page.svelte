<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import InstructorTrainingSessionRun from '$lib/components/InstructorTrainingSessionRun.svelte';
	import { getInstructorTrainingSession } from '$lib/remote/instructor.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const sessionQuery = $derived.by(() => getInstructorTrainingSession(data.id));
</script>

<section class="container mx-auto py-5">
	{#if sessionQuery.error && !sessionQuery.current}
		<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Instructor Dashboard
		</a>
		<p class="text-error mt-4">Error loading session: {sessionQuery.error.message}</p>
	{:else if !sessionQuery.current && sessionQuery.loading}
		<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Instructor Dashboard
		</a>
		<h1 class="mt-2 text-3xl font-semibold">Training session</h1>
		<p class="mt-2">Loading session...</p>
	{:else if sessionQuery.current}
		{#key `${sessionQuery.current.id}-${sessionQuery.current.notesLocked}`}
			<InstructorTrainingSessionRun session={sessionQuery.current} />
		{/key}
	{/if}
</section>
