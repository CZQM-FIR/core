<script lang="ts">
	import TrainingSessionPendingCard from '$lib/components/TrainingSessionPendingCard.svelte';
	import TrainingSessionStudentPrepNote from '$lib/components/TrainingSessionStudentPrepNote.svelte';
	import { getMyTrainingSessions } from '$lib/remote/users.remote';

	const sessionsQuery = getMyTrainingSessions();

	const attending = $derived(
		(sessionsQuery.current ?? []).filter((item) => item.role === 'student')
	);
	const instructing = $derived(
		(sessionsQuery.current ?? []).filter((item) => item.role === 'instructor')
	);
	const hasScheduledStudentSession = $derived(
		attending.some((item) => item.session.status === 'confirmed')
	);
</script>

{#snippet sessionCards(
	items: NonNullable<typeof sessionsQuery.current>,
	role: 'student' | 'instructor'
)}
	<div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
		{#each items as item (item.session.id)}
			<TrainingSessionPendingCard
				courseId={item.courseId}
				taskId={item.taskId}
				session={item.session}
				showStudentActions={role === 'student'}
				showCancel
				cancelAs={role === 'student' ? 'student' : 'staff'}
				studentCid={item.studentCid}
				href={role === 'student'
					? `/sessions/${item.session.id}`
					: `/i/sessions/${item.session.id}`}
				heading={item.courseName}
				subheading={role === 'instructor'
					? `${item.sessionDescription} · ${item.studentName}`
					: item.sessionDescription}
			/>
		{/each}
	</div>
{/snippet}

{#if sessionsQuery.error}
	<section class="mb-8">
		<h2 class="text-xl font-semibold">Training sessions</h2>
		<p class="text-error mt-2">Failed to load training sessions.</p>
	</section>
{:else}
	{#if attending.length > 0}
		<section class="mb-8">
			<h2 class="text-xl font-semibold">Your sessions</h2>
			<p class="text-sm opacity-70">Training sessions scheduled for you as a student.</p>
			{#if hasScheduledStudentSession}
				<div class="mt-4">
					<TrainingSessionStudentPrepNote />
				</div>
			{/if}
			{@render sessionCards(attending, 'student')}
		</section>
	{/if}

	{#if instructing.length > 0}
		<section class="mb-8">
			<h2 class="text-xl font-semibold">Sessions you are instructing</h2>
			<p class="text-sm opacity-70">Training sessions you have scheduled with students.</p>
			{@render sessionCards(instructing, 'instructor')}
		</section>
	{/if}
{/if}
