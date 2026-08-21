<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import TrainingSessionAvailabilityMatcher from '$lib/components/TrainingSessionAvailabilityMatcher.svelte';
	import {
		getScheduledSessionsInWindow,
		getStudentsWithSessionAvailability
	} from '$lib/remote/instructor.remote';
	import { anySlotsOverlap, type AvailabilitySlot } from '$lib/trainingSessionAvailability';

	const availabilityQuery = getStudentsWithSessionAvailability();
	const scheduledQuery = getScheduledSessionsInWindow();

	let courseFilter = $state('');
	let selectedSlots = $state<AvailabilitySlot[]>([]);

	const allStudents = $derived(availabilityQuery.current?.students ?? []);

	const courseOptions = $derived.by(() => {
		const byId: Record<string, string> = {};
		for (const student of allStudents) {
			byId[student.courseId] = student.courseName;
		}
		return Object.entries(byId)
			.map(([courseId, courseName]) => ({ courseId, courseName }))
			.sort((a, b) => a.courseName.localeCompare(b.courseName));
	});

	const courseFiltered = $derived(
		courseFilter === ''
			? allStudents
			: allStudents.filter((student) => student.courseId === courseFilter)
	);

	const overlapping = $derived(
		selectedSlots.length === 0
			? courseFiltered
			: courseFiltered.filter((student) => anySlotsOverlap(selectedSlots, student.slots))
	);

	const hasSelection = $derived(selectedSlots.length > 0);
</script>

<section class="container mx-auto py-5">
	<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
		<ChevronLeft size="15" /> Back to Instructor Dashboard
	</a>
	<h1 class="mt-2 text-2xl font-semibold">Session availability</h1>
	<p class="mt-1 text-sm opacity-80">
		Highlight your free times to find students whose submitted availability overlaps.
	</p>
	<div class="divider"></div>

	{#if availabilityQuery.error}
		<p class="text-error">Failed to load session availability.</p>
	{:else if availabilityQuery.loading && !availabilityQuery.current}
		<p>Loading session availability...</p>
	{:else if availabilityQuery.current}
		{#if courseOptions.length > 1}
			<select class="select select-bordered select-sm w-full max-w-xs" bind:value={courseFilter}>
				<option value="">All courses</option>
				{#each courseOptions as course (course.courseId)}
					<option value={course.courseId}>{course.courseName}</option>
				{/each}
			</select>
		{/if}

		<div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
			<TrainingSessionAvailabilityMatcher
				students={courseFiltered}
				windowEndsAt={availabilityQuery.current.windowEndsAt}
				scheduledSessions={scheduledQuery.current ?? []}
				bind:selectedSlots
			/>

			<div class="card bg-base-200 shadow-sm">
				<div class="card-body flex flex-col">
					<h2 class="card-title text-lg">
						{#if hasSelection}
							{overlapping.length} of {courseFiltered.length} overlap
						{:else}
							{overlapping.length} students with availability
						{/if}
					</h2>

					{#if allStudents.length === 0}
						<p class="text-sm">No students have submitted session availability.</p>
					{:else if courseFiltered.length === 0}
						<p class="text-sm">No students have submitted session availability for this course.</p>
					{:else if hasSelection && overlapping.length === 0}
						<p class="text-sm">No students overlap the times you highlighted.</p>
					{:else}
						<div class="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
							{#each overlapping as student (`${student.cid}-${student.courseId}-${student.taskId}`)}
								<a
									href="/i/{student.courseId}/{student.cid}?from=availability"
									class="bg-base-100 hover:bg-base-300 block rounded-lg px-3 py-2 shadow-sm transition-colors"
								>
									<p class="truncate text-sm font-semibold">{student.name}</p>
									<p class="text-xs opacity-70">CID {student.cid} · {student.courseName}</p>
									<p class="text-xs opacity-70">{student.sessionDescription}</p>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>
