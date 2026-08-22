<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import CourseTaskList from '$lib/components/CourseTaskList.svelte';
	import SyncCourseTasksButton from '$lib/components/SyncCourseTasksButton.svelte';
	import TrainingNotesList from '$lib/components/TrainingNotesList.svelte';
	import TrainingPauseBanner from '$lib/components/TrainingPauseBanner.svelte';
	import TrainingSessionAvailabilityCalendar from '$lib/components/TrainingSessionAvailabilityCalendar.svelte';
	import TrainingSessionPendingCard from '$lib/components/TrainingSessionPendingCard.svelte';
	import {
		getInstructorStudentTrainingNotes,
		getInstructorStudentView,
		graduateStudentFromCourse,
		syncStudentCourseTasks
	} from '$lib/remote/instructor.remote';
	import { pauseEnrolledStudent, resumeEnrolledStudent } from '$lib/remote/waitlist.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const viewQuery = $derived.by(() =>
		getInstructorStudentView({ courseId: data.courseId, cid: data.cid })
	);
	const notesQuery = $derived.by(() => getInstructorStudentTrainingNotes({ cid: data.cid }));
	const notes = $derived(notesQuery.current?.notes ?? []);
	const legacyNotes = $derived(notesQuery.current?.legacyNotes ?? []);
	const legacyError = $derived(notesQuery.current?.legacyError ?? null);

	let graduating = $state(false);
	let graduateError = $state<string | null>(null);
	let syncError = $state<string | null>(null);
	let pauseReason = $state('');
	let pausing = $state(false);
	let resuming = $state(false);
	let pauseError = $state<string | null>(null);
	let pauseDialog = $state<HTMLDialogElement | null>(null);

	type StudentStatus = 'waitlisted' | 'enrolled' | 'completed' | 'none';

	const statusLabels: Record<StudentStatus, string> = {
		waitlisted: 'Waitlisted',
		enrolled: 'Enrolled',
		completed: 'Completed',
		none: 'Not on course'
	};

	function commandErrorMessage(err: unknown, fallback: string): string {
		if (err && typeof err === 'object' && 'body' in err) {
			const body = (err as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		if (err instanceof Error && err.message) return err.message;
		return fallback;
	}

	async function handleGraduate(courseId: string, cid: number) {
		graduating = true;
		graduateError = null;
		try {
			await graduateStudentFromCourse({ courseId, cid });
		} catch (err) {
			graduateError = commandErrorMessage(err, 'Failed to mark course as completed');
		} finally {
			graduating = false;
		}
	}

	function openPauseDialog() {
		if (!data.isVectorAdmin) return;
		pauseReason = '';
		pauseError = null;
		pauseDialog?.showModal();
	}

	async function handlePause(courseId: string, cid: number) {
		if (!data.isVectorAdmin) return;
		pausing = true;
		pauseError = null;
		try {
			await pauseEnrolledStudent({ courseId, cid, reason: pauseReason });
			pauseDialog?.close();
		} catch (err) {
			pauseError = commandErrorMessage(err, 'Failed to pause training');
		} finally {
			pausing = false;
		}
	}

	async function handleResume(courseId: string, cid: number) {
		if (!data.isVectorAdmin) return;
		resuming = true;
		pauseError = null;
		try {
			await resumeEnrolledStudent({ courseId, cid });
		} catch (err) {
			pauseError = commandErrorMessage(err, 'Failed to resume training');
		} finally {
			resuming = false;
		}
	}
</script>

<section class="container mx-auto py-5">
	{#await viewQuery}
		<p>Loading student...</p>
	{:then view}
		<a
			href={data.fromAvailability ? '/i/availability' : `/i/courses/${view.course.id}`}
			class="text-primary hover:link flex flex-row items-center gap-1"
		>
			<ChevronLeft size="15" />
			{data.fromAvailability ? 'Back to availability' : `Back to ${view.course.name}`}
		</a>

		<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-semibold">{view.student.name_full}</h1>
				<p class="text-sm opacity-70">CID {view.student.cid} · {view.student.rating}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="badge {view.pause
						? 'badge-warning'
						: view.status === 'completed'
							? 'badge-accent'
							: view.status === 'enrolled'
								? 'badge-secondary'
								: view.status === 'waitlisted'
									? 'badge-primary'
									: 'badge-ghost'}"
				>
					{view.pause ? 'Paused' : statusLabels[view.status as StudentStatus]}
				</span>
				{#if data.isVectorAdmin && view.canPauseTraining && view.status === 'enrolled'}
					{#if view.pause}
						<button
							type="button"
							class="btn btn-outline btn-sm"
							disabled={resuming}
							onclick={() => handleResume(view.course.id, view.student.cid)}
						>
							{#if resuming}
								<span class="loading loading-spinner loading-sm"></span>
								Resuming...
							{:else}
								Resume training
							{/if}
						</button>
					{:else}
						<button type="button" class="btn btn-warning btn-sm" onclick={openPauseDialog}>
							Pause training
						</button>
					{/if}
				{/if}
			</div>
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

		{#if view.pause}
			<div class="mt-4">
				<TrainingPauseBanner pausedAt={view.pause.pausedAt} pauseReason={view.pause.pauseReason} />
			</div>
		{/if}

		{#if data.isVectorAdmin && pauseError}
			<p class="text-error mt-2 text-sm">{pauseError}</p>
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
					href={`/i/sessions/${view.activeSession.id}`}
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
		{:else if !view.pause && view.canViewSessionAvailability && view.nextTask}
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

		<div class="mt-6 flex flex-col gap-3">
			{#snippet headerActions()}
				<SyncCourseTasksButton
					onSync={() => syncStudentCourseTasks({ courseId: view.course.id, cid: view.student.cid })}
					bind:error={syncError}
				/>
			{/snippet}
			<CourseTaskList
				tasks={view.tasks}
				instructorContext={{
					courseId: view.course.id,
					cid: view.student.cid,
					canCompleteInstructorOnlyTasks: view.canCompleteInstructorOnlyTasks,
					canForceComplete: view.canForceCompleteTasks,
					canMarkTasksComplete: view.canMarkTasksComplete,
					paused: view.pause != null
				}}
				headerActions={view.status === 'enrolled' && !view.pause ? headerActions : undefined}
			/>
			{#if syncError}
				<p class="text-error text-sm">{syncError}</p>
			{/if}
		</div>

		{#if view.canGraduateStudent && view.status === 'enrolled' && !view.pause && view.allTasksComplete}
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

		<div class="mt-8">
			<h2 class="text-xl font-semibold">Training Notes</h2>
			{#if notesQuery.loading && !notesQuery.current}
				<p class="mt-3">Loading training notes...</p>
			{:else if notesQuery.error && !notesQuery.current}
				<p class="text-error mt-3">{notesQuery.error.message}</p>
			{:else}
				<div class="mt-3">
					<TrainingNotesList
						{notes}
						{legacyNotes}
						{legacyError}
						sessionHrefPrefix="/i/sessions"
						emptyMessage="This student doesn't have any training notes yet."
						emptyVectorMessage="This student doesn't have any Vector training notes yet."
					/>
				</div>
			{/if}
		</div>

		{#if data.isVectorAdmin && view.canPauseTraining && view.status === 'enrolled'}
			<dialog class="modal" bind:this={pauseDialog}>
				<div class="modal-box">
					<h3 class="text-lg font-bold">Pause training</h3>
					<p class="py-2 text-sm">
						This pauses {view.student.name_full}'s progress in {view.course.name}. The reason will
						be visible to the student, instructors, and training admins.
					</p>
					<p class="mb-1 text-sm font-medium">Reason</p>
					<textarea
						class="textarea w-full"
						rows="4"
						maxlength="1000"
						bind:value={pauseReason}
						disabled={pausing}
					></textarea>
					{#if pauseError}
						<p class="text-error mt-2 text-sm">{pauseError}</p>
					{/if}
					<div class="modal-action">
						<form method="dialog">
							<button class="btn" disabled={pausing}>Cancel</button>
						</form>
						<button
							type="button"
							class="btn btn-warning"
							disabled={pausing || pauseReason.trim().length === 0}
							onclick={() => handlePause(view.course.id, view.student.cid)}
						>
							{#if pausing}
								<span class="loading loading-spinner loading-sm"></span>
								Pausing...
							{:else}
								Pause training
							{/if}
						</button>
					</div>
				</div>
				<form method="dialog" class="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
		{/if}
	{:catch err}
		<p class="text-error">Error loading student: {err.message}</p>
	{/await}
</section>
