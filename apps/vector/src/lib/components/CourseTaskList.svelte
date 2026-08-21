<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CourseTaskProgress } from '$lib/courseTaskProgress';
	import { getVatcanTaskUrl } from '@czqm/common';
	import {
		completeStudentCourseTask,
		forceCompleteStudentCourseTask,
		forceUncompleteStudentCourseTask,
		uncompleteStudentCourseTask
	} from '$lib/remote/instructor.remote';

	let {
		tasks,
		linkVatcanTasks = false,
		highlightNextTask = false,
		instructorContext,
		headerActions
	}: {
		tasks: CourseTaskProgress[];
		linkVatcanTasks?: boolean;
		highlightNextTask?: boolean;
		instructorContext?: {
			courseId: string;
			cid: number;
			canCompleteInstructorOnlyTasks?: boolean;
			canForceComplete?: boolean;
			canMarkTasksComplete?: boolean;
			paused?: boolean;
		};
		headerActions?: Snippet;
	} = $props();

	const nextTaskIndex = $derived(
		highlightNextTask ? tasks.findIndex((task) => !task.isComplete) : -1
	);

	const VATCAN_SOLO_URL = 'https://vatcan.ca/manage/training/certifications';

	let updatingTaskId = $state<number | null>(null);
	let actionError = $state<string | null>(null);
	let followUpKind = $state<'certify' | 'solo' | null>(null);
	let followUpModal: HTMLDialogElement | undefined;
	let forceCompleteModal: HTMLDialogElement | undefined;
	let pendingForceTask = $state<CourseTaskProgress | null>(null);
	let forceCompleteError = $state<string | null>(null);

	const followUpUrl = $derived(
		followUpKind === 'solo'
			? VATCAN_SOLO_URL
			: followUpKind === 'certify' && instructorContext
				? `https://vatcan.ca/manage/controller/${instructorContext.cid}/view`
				: ''
	);

	function commandErrorMessage(err: unknown, fallback: string): string {
		if (err && typeof err === 'object' && 'body' in err) {
			const body = (err as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		if (err instanceof Error && err.message) return err.message;
		return fallback;
	}

	function canShowInstructorControls(task: CourseTaskProgress): boolean {
		if (!instructorContext || instructorContext.paused || !task.manuallyCompletable) return false;
		if (instructorContext.canMarkTasksComplete === false) return false;
		if (task.requiresInstructorCompletion) {
			return Boolean(instructorContext.canCompleteInstructorOnlyTasks);
		}
		return true;
	}

	function canShowForceComplete(task: CourseTaskProgress, index: number): boolean {
		if (!instructorContext || instructorContext.paused || !instructorContext.canForceComplete) {
			return false;
		}
		if (task.isComplete) return false;
		return !canShowCompleteAction(task, index);
	}

	function canShowForceIncomplete(task: CourseTaskProgress): boolean {
		if (!instructorContext || instructorContext.paused || !instructorContext.canForceComplete) {
			return false;
		}
		if (!task.isComplete) return false;
		return !canShowInstructorControls(task);
	}

	function priorTasksAreComplete(index: number): boolean {
		return tasks.slice(0, index).every((task) => task.isComplete);
	}

	function canShowCompleteAction(task: CourseTaskProgress, index: number): boolean {
		if (!canShowInstructorControls(task)) return false;
		if (task.taskType === 'certify' || task.taskType === 'solo') {
			return priorTasksAreComplete(index);
		}
		return true;
	}

	function completeButtonLabel(task: CourseTaskProgress): string {
		if (task.taskType === 'certify') return 'Certify';
		if (task.taskType === 'solo') return 'Grant Solo';
		return 'Mark complete';
	}

	async function markComplete(courseId: string, cid: number, taskId: number) {
		updatingTaskId = taskId;
		actionError = null;
		try {
			const result = await completeStudentCourseTask({ courseId, cid, taskId });
			if (result?.followUp === 'certify' || result?.followUp === 'solo') {
				followUpKind = result.followUp;
				followUpModal?.showModal();
			}
		} catch (err) {
			actionError = commandErrorMessage(err, 'Failed to mark task complete');
		} finally {
			updatingTaskId = null;
		}
	}

	async function markIncomplete(courseId: string, cid: number, taskId: number) {
		updatingTaskId = taskId;
		actionError = null;
		try {
			await uncompleteStudentCourseTask({ courseId, cid, taskId });
		} catch (err) {
			actionError = commandErrorMessage(err, 'Failed to mark task incomplete');
		} finally {
			updatingTaskId = null;
		}
	}

	async function forceMarkIncomplete(courseId: string, cid: number, taskId: number) {
		updatingTaskId = taskId;
		actionError = null;
		try {
			await forceUncompleteStudentCourseTask({ courseId, cid, taskId });
		} catch (err) {
			actionError = commandErrorMessage(err, 'Failed to mark task incomplete');
		} finally {
			updatingTaskId = null;
		}
	}

	function openForceCompleteModal(task: CourseTaskProgress) {
		pendingForceTask = task;
		forceCompleteError = null;
		forceCompleteModal?.showModal();
	}

	async function confirmForceComplete() {
		if (!instructorContext || !pendingForceTask) return;
		const taskId = pendingForceTask.taskId;
		updatingTaskId = taskId;
		forceCompleteError = null;
		try {
			const result = await forceCompleteStudentCourseTask({
				courseId: instructorContext.courseId,
				cid: instructorContext.cid,
				taskId
			});
			forceCompleteModal?.close();
			pendingForceTask = null;
			if (result?.followUp === 'certify' || result?.followUp === 'solo') {
				followUpKind = result.followUp;
				followUpModal?.showModal();
			}
		} catch (err) {
			forceCompleteError = commandErrorMessage(err, 'Failed to force complete task');
		} finally {
			updatingTaskId = null;
		}
	}
</script>

<div class="card bg-base-200 w-full shadow-sm">
	<div class="card-body">
		<div class="flex flex-row items-center justify-between gap-2">
			<h2 class="card-title text-lg">Course Tasks</h2>
			{#if headerActions}
				<div class="shrink-0">{@render headerActions()}</div>
			{/if}
		</div>
		{#if actionError}
			<p class="text-error text-sm">{actionError}</p>
		{/if}
		{#if tasks.length === 0}
			<p class="text-sm">No tasks defined for this course.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each tasks as task, index (task.taskId)}
					{@const taskLinkUrl = linkVatcanTasks
						? getVatcanTaskUrl(task.taskType, task.taskValue2)
						: undefined}
					{@const showInstructorControls = canShowInstructorControls(task)}
					{@const showForceComplete = canShowForceComplete(task, index)}
					{@const showForceIncomplete = canShowForceIncomplete(task)}
					{@const isDimmed = highlightNextTask && nextTaskIndex !== -1 && index !== nextTaskIndex}
					<svelte:element
						this={taskLinkUrl ? 'a' : 'div'}
						href={taskLinkUrl}
						target={taskLinkUrl ? '_blank' : undefined}
						rel={taskLinkUrl ? 'noopener noreferrer' : undefined}
						class="bg-base-100 flex flex-row items-center gap-2 rounded-lg px-3 py-2 shadow-sm transition-opacity {isDimmed
							? 'opacity-45'
							: ''} {taskLinkUrl && !isDimmed ? 'hover:bg-base-300 transition-colors' : ''}"
					>
						<span class="shrink-0 text-sm font-semibold">Task {index + 1}</span>
						{#if instructorContext}
							<span class="badge badge-outline badge-sm shrink-0">{task.typeLabel}</span>
						{/if}
						<p class="min-w-0 flex-1 truncate text-sm">{task.description}</p>
						{#if instructorContext && showInstructorControls && task.isComplete}
							<button
								type="button"
								class="btn btn-outline btn-xs shrink-0"
								disabled={updatingTaskId === task.taskId}
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									void markIncomplete(
										instructorContext.courseId,
										instructorContext.cid,
										task.taskId
									);
								}}
							>
								{#if updatingTaskId === task.taskId}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									Mark incomplete
								{/if}
							</button>
						{:else if instructorContext && showForceIncomplete}
							<button
								type="button"
								class="btn btn-outline btn-xs shrink-0"
								disabled={updatingTaskId === task.taskId}
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									void forceMarkIncomplete(
										instructorContext.courseId,
										instructorContext.cid,
										task.taskId
									);
								}}
							>
								{#if updatingTaskId === task.taskId}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									Mark incomplete
								{/if}
							</button>
						{:else if instructorContext && showInstructorControls && canShowCompleteAction(task, index)}
							<button
								type="button"
								class="btn btn-primary btn-xs shrink-0"
								disabled={updatingTaskId === task.taskId}
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									void markComplete(
										instructorContext.courseId,
										instructorContext.cid,
										task.taskId
									);
								}}
							>
								{#if updatingTaskId === task.taskId}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									{completeButtonLabel(task)}
								{/if}
							</button>
						{:else if instructorContext && showForceComplete}
							<button
								type="button"
								class="btn btn-warning btn-xs shrink-0"
								disabled={updatingTaskId === task.taskId}
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									openForceCompleteModal(task);
								}}
							>
								Force complete
							</button>
						{/if}
						{#if task.isComplete}
							<span class="badge badge-success badge-sm shrink-0">Complete</span>
						{:else if task.remainingLabel}
							<span class="badge badge-warning badge-sm shrink-0">{task.remainingLabel}</span>
						{:else if task.startedAt}
							<span class="badge badge-warning badge-sm shrink-0">In progress</span>
						{:else}
							<span class="badge badge-ghost badge-sm shrink-0">Incomplete</span>
						{/if}
					</svelte:element>
				{/each}
			</div>
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={followUpModal}>
	<div class="modal-box">
		{#if followUpKind === 'solo'}
			<h3 class="text-lg font-bold">Submit this solo on VATCAN</h3>
			<p class="py-2">
				The local solo endorsement is recorded. You still need to submit the solo on VATCAN.
			</p>
		{:else if followUpKind === 'certify'}
			<h3 class="text-lg font-bold">Promote this controller on VATCAN</h3>
			<p class="py-2">
				The local roster certification is recorded. You still need to promote the student's rating
				on VATCAN.
			</p>
		{/if}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Dismiss</button>
			</form>
			{#if followUpUrl}
				<a class="btn btn-primary" href={followUpUrl} target="_blank" rel="noopener noreferrer">
					Open VATCAN
				</a>
			{/if}
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog class="modal" bind:this={forceCompleteModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Force complete task</h3>
		<p class="py-2">
			This marks the task complete without the usual VATCAN Training Notes, delay, or training
			session requirements.
		</p>
		{#if pendingForceTask}
			<p class="text-sm font-medium">{pendingForceTask.description}</p>
		{/if}
		{#if forceCompleteError}
			<p class="text-error mt-2 text-sm">{forceCompleteError}</p>
		{/if}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={updatingTaskId === pendingForceTask?.taskId}>Cancel</button>
			</form>
			<button
				type="button"
				class="btn btn-warning"
				disabled={!pendingForceTask || updatingTaskId === pendingForceTask.taskId}
				onclick={() => void confirmForceComplete()}
			>
				{#if pendingForceTask && updatingTaskId === pendingForceTask.taskId}
					<span class="loading loading-spinner loading-sm"></span>
					Force complete
				{:else}
					Force complete
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
