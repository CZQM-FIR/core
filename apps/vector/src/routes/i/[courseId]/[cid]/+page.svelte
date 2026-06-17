<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import CourseTaskList from '$lib/components/CourseTaskList.svelte';
	import TrainingSessionAvailabilityCalendar from '$lib/components/TrainingSessionAvailabilityCalendar.svelte';
	import TrainingSessionPendingCard from '$lib/components/TrainingSessionPendingCard.svelte';
	import {
		getInstructorStudentView,
		graduateStudentFromCourse
	} from '$lib/remote/instructor.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const viewQuery = $derived.by(() =>
		getInstructorStudentView({ courseId: data.courseId, cid: data.cid })
	);

	let graduating = $state(false);
	let graduateError = $state<string | null>(null);

	type StudentStatus = 'waitlisted' | 'enrolled' | 'completed' | 'none';

	const statusLabels: Record<StudentStatus, string> = {
		waitlisted: 'Waitlisted',
		enrolled: 'Enrolled',
		completed: 'Completed',
		none: 'Not on course'
	};

	async function handleGraduate(courseId: string, cid: number) {
		graduating = true;
		graduateError = null;
		try {
			await graduateStudentFromCourse({ courseId, cid });
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				graduateError = body?.message ?? 'Failed to mark course as completed';
			} else if (err instanceof Error) {
				graduateError = err.message;
			} else {
				graduateError = 'Failed to mark course as completed';
			}
		} finally {
			graduating = false;
		}
	}
</script>

<section class="container mx-auto py-5">
	{#await viewQuery}
		<p>Loading student...</p>
	{:then view}
		<a
			href="/i/courses/{view.course.id}"
			class="text-primary hover:link flex flex-row items-center gap-1"
		>
			<ChevronLeft size="15" /> Back to {view.course.name}
		</a>

		<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-semibold">{view.student.name_full}</h1>
				<p class="text-sm opacity-70">CID {view.student.cid} · {view.student.rating}</p>
			</div>
			<span
				class="badge {view.status === 'completed'
					? 'badge-accent'
					: view.status === 'enrolled'
						? 'badge-secondary'
						: view.status === 'waitlisted'
							? 'badge-primary'
							: 'badge-ghost'}"
			>
				{statusLabels[view.status as StudentStatus]}
			</span>
		</div>

		{#if view.status === 'waitlisted' && view.waitingSince}
			<p class="mt-2 text-sm opacity-70">
				Waiting since {view.waitingSince.toUTCString().replace(' GMT', 'z')}
			</p>
		{:else if view.status === 'enrolled' && view.enrolledAt}
			<p class="mt-2 text-sm opacity-70">
				Enrolled {view.enrolledAt.toUTCString().replace(' GMT', 'z')}
			</p>
		{:else if view.status === 'completed' && view.completedAt}
			<p class="mt-2 text-sm opacity-70">
				Completed {view.completedAt.toUTCString().replace(' GMT', 'z')}
			</p>
		{/if}

		{#if view.activeSession}
			<div class="mt-6">
				<TrainingSessionPendingCard
					courseId={view.course.id}
					taskId={view.nextTask!.taskId}
					session={view.activeSession}
					showCancel={view.canCancelActiveSession}
					cancelAs="staff"
					studentCid={view.student.cid}
				/>
			</div>
		{:else if view.canScheduleSession && view.nextTask}
			<div class="mt-6">
				<TrainingSessionAvailabilityCalendar
					mode="schedule"
					courseId={view.course.id}
					taskId={view.nextTask.taskId}
					cid={view.student.cid}
					sessionDescription={view.nextTask.description}
				/>
			</div>
		{:else if view.canViewSessionAvailability && view.nextTask}
			<div class="mt-6">
				<TrainingSessionAvailabilityCalendar
					mode="view"
					courseId={view.course.id}
					taskId={view.nextTask.taskId}
					cid={view.student.cid}
					sessionDescription={view.nextTask.description}
				/>
			</div>
		{/if}

		<div class="mt-6">
			<CourseTaskList
				tasks={view.tasks}
				instructorContext={{ courseId: view.course.id, cid: view.student.cid }}
			/>
		</div>

		{#if view.canGraduateStudent && view.status === 'enrolled' && view.allTasksComplete}
			<div class="mt-4 flex flex-col gap-2">
				{#if graduateError}
					<p class="text-error text-sm">{graduateError}</p>
				{/if}
				<div>
					<button
						type="button"
						class="btn btn-accent"
						disabled={graduating}
						onclick={() => handleGraduate(view.course.id, view.student.cid)}
					>
						{#if graduating}
							<span class="loading loading-spinner loading-sm"></span>
							Marking complete...
						{:else}
							Mark Course as Completed
						{/if}
					</button>
				</div>
			</div>
		{/if}
	{:catch err}
		<p class="text-error">Error loading student: {err.message}</p>
	{/await}
</section>
