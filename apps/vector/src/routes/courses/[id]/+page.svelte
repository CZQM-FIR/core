<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import CoursePrerequisiteChecklist from '$lib/components/CoursePrerequisiteChecklist.svelte';
	import CourseTaskList from '$lib/components/CourseTaskList.svelte';
	import TrainingSessionAvailabilityCalendar from '$lib/components/TrainingSessionAvailabilityCalendar.svelte';
	import TrainingSessionPendingCard from '$lib/components/TrainingSessionPendingCard.svelte';
	import {
		getStudentCourseView,
		joinCourseWaitlist,
		syncStudentCourseTasks
	} from '$lib/remote/student.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const viewQuery = $derived.by(() => getStudentCourseView(data.courseId));

	let joining = $state(false);
	let joinError = $state<string | null>(null);

	let syncing = $state(false);
	let syncError = $state<string | null>(null);
	let syncCooldownUntil = $state(0);
	let syncCooldownSeconds = $state(0);

	$effect(() => {
		const updateCooldown = () => {
			const remaining = Math.ceil((syncCooldownUntil - Date.now()) / 1000);
			syncCooldownSeconds = remaining > 0 ? remaining : 0;
		};

		updateCooldown();
		if (syncCooldownUntil <= Date.now()) return;

		const interval = setInterval(updateCooldown, 1000);
		return () => clearInterval(interval);
	});

	async function handleJoinWaitlist() {
		joining = true;
		joinError = null;
		try {
			await joinCourseWaitlist(data.courseId);
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				joinError = body?.message ?? 'Failed to join waitlist';
			} else if (err instanceof Error) {
				joinError = err.message;
			} else {
				joinError = 'Failed to join waitlist';
			}
		} finally {
			joining = false;
		}
	}

	async function handleSyncTasks() {
		syncing = true;
		syncError = null;
		try {
			await syncStudentCourseTasks(data.courseId);
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				syncError = body?.message ?? 'Failed to sync tasks';
			} else if (err instanceof Error) {
				syncError = err.message;
			} else {
				syncError = 'Failed to sync tasks';
			}
		} finally {
			syncing = false;
			syncCooldownUntil = Date.now() + 60_000;
		}
	}
</script>

<section class="container mx-auto py-5">
	{#await viewQuery}
		<p>Loading course...</p>
	{:then view}
		<a href="/" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>

		<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-semibold">{view.course.name}</h1>
				{#if view.course.description}
					<p class="mt-1 text-sm opacity-80">{view.course.description}</p>
				{/if}
			</div>
			{#if view.bucket === 'enrolled'}
				<span class="badge {view.status === 'enrolled' ? 'badge-secondary' : 'badge-primary'}">
					{view.status === 'enrolled' ? 'Enrolled' : 'Waitlisted'}
				</span>
			{:else if view.bucket === 'completed'}
				<span class="badge badge-accent">Completed</span>
			{:else if view.bucket === 'eligible'}
				<span class="badge badge-success">Eligible</span>
			{:else}
				<span class="badge badge-error">Ineligible</span>
			{/if}
		</div>

		{#if view.bucket === 'enrolled' && view.status === 'waitlisted'}
			<div class="mt-4 flex flex-col gap-3 text-base">
				<p>
					You are currently number
					<strong class="text-blue-400">
						{#if view.position != null}
							{view.position + 1}
						{:else}
							—
						{/if}
					</strong>
					in line for this course.
					{#if view.waitTime}
						The estimated wait time for someone joining the waitlist now is approximately
						<strong class="text-blue-400">{view.waitTime}</strong>.
					{/if}
				</p>
				{#if view.waitingSince}
					<p class="opacity-70">
						Waiting since {view.waitingSince.toUTCString().replace(' GMT', 'z')}
					</p>
				{/if}
				<p>
					Please note that waitlist times, if listed, are estimates. Waitlists are subject to
					instructor availability. We are a 100% volunteer team, so please be patient. Please do not
					reach out to instructors or mentors regarding training unless they reach out first.
				</p>
				<p>
					Our waitlist operates on a first come, first served basis. You will be contacted when you
					may begin training along with further instructions.
				</p>
			</div>
			<div class="mt-6">
				<CourseTaskList tasks={view.tasks} linkVatcanTasks />
			</div>
		{:else if view.bucket === 'enrolled' && view.status === 'enrolled'}
			{#if view.enrolledAt}
				<p class="mt-2 text-sm opacity-70">
					Enrolled {view.enrolledAt.toUTCString().replace(' GMT', 'z')}
				</p>
			{/if}
			<div class="mt-6 flex flex-col gap-4">
				<div
					class="grid grid-cols-1 items-start gap-4 {(view.canSubmitSessionAvailability ||
						view.activeSession) &&
					view.nextTask
						? 'lg:grid-cols-2'
						: ''}"
				>
					<div class="flex min-w-0 flex-col gap-3">
						<CourseTaskList tasks={view.tasks} linkVatcanTasks highlightNextTask>
							{#snippet headerActions()}
								<button
									class="btn btn-outline btn-sm"
									disabled={syncing || syncCooldownSeconds > 0}
									onclick={handleSyncTasks}
								>
									{#if syncing}
										<span class="loading loading-spinner loading-sm"></span>
										Syncing...
									{:else if syncCooldownSeconds > 0}
										Refresh in {syncCooldownSeconds}s
									{:else}
										Sync tasks
									{/if}
								</button>
							{/snippet}
						</CourseTaskList>
						{#if syncError}
							<p class="text-error text-sm">{syncError}</p>
						{/if}
					</div>
					{#if view.activeSession?.status === 'pending'}
						<div class="min-w-0">
							<TrainingSessionPendingCard
								courseId={view.course.id}
								taskId={view.nextTask!.taskId}
								session={view.activeSession}
								showStudentActions
								showCancel={view.canCancelActiveSession}
							/>
						</div>
					{:else if view.canSubmitSessionAvailability && view.nextTask}
						<div class="flex min-w-0 flex-col gap-4">
							{#if view.activeSession?.status === 'confirmed'}
								<TrainingSessionPendingCard
									courseId={view.course.id}
									taskId={view.nextTask.taskId}
									session={view.activeSession}
									showCancel={view.canCancelActiveSession}
								/>
							{/if}
							<TrainingSessionAvailabilityCalendar
								mode="edit"
								courseId={view.course.id}
								taskId={view.nextTask.taskId}
								sessionDescription={view.nextTask.description}
								confirmedSession={view.activeSession?.status === 'confirmed'
									? view.activeSession
									: undefined}
							/>
						</div>
					{/if}
				</div>
			</div>
		{:else if view.bucket === 'completed'}
			{#if view.completedAt}
				<p class="mt-2 text-sm opacity-70">
					Completed {view.completedAt.toUTCString().replace(' GMT', 'z')}
				</p>
			{/if}
			<div class="mt-6">
				<CourseTaskList tasks={view.tasks} linkVatcanTasks />
			</div>
		{:else if view.bucket === 'eligible'}
			<div class="mt-6 flex flex-col gap-4">
				<p class="text-sm">
					You meet all prerequisites for this course. Join the waitlist to get started.
				</p>
				<CoursePrerequisiteChecklist results={view.prerequisiteResults} />
				{#if joinError}
					<p class="text-error text-sm">{joinError}</p>
				{/if}
				<div>
					<button class="btn btn-primary" disabled={joining} onclick={handleJoinWaitlist}>
						{#if joining}
							<span class="loading loading-spinner loading-sm"></span>
							Joining...
						{:else}
							Join Waitlist
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<div class="mt-6">
				<p class="mb-4 text-sm">
					You do not yet meet all prerequisites for this course. Complete the items below to become
					eligible.
				</p>
				<CoursePrerequisiteChecklist results={view.prerequisiteResults} />
			</div>
		{/if}
	{:catch err}
		<p class="text-error">Error loading course: {err.message}</p>
	{/await}
</section>
