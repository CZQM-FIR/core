<script lang="ts">
	import type { CourseTaskProgress } from '$lib/courseTaskProgress';
	import { getVatcanTaskUrl } from '@czqm/common';
	import {
		completeStudentCourseTask,
		uncompleteStudentCourseTask
	} from '$lib/remote/instructor.remote';

	let {
		tasks,
		linkVatcanTasks = false,
		highlightNextTask = false,
		instructorContext
	}: {
		tasks: CourseTaskProgress[];
		linkVatcanTasks?: boolean;
		highlightNextTask?: boolean;
		instructorContext?: { courseId: string; cid: number };
	} = $props();

	const nextTaskIndex = $derived(
		highlightNextTask ? tasks.findIndex((task) => !task.isComplete) : -1
	);

	let updatingTaskId = $state<number | null>(null);

	async function markComplete(courseId: string, cid: number, taskId: number) {
		updatingTaskId = taskId;
		try {
			await completeStudentCourseTask({ courseId, cid, taskId });
		} finally {
			updatingTaskId = null;
		}
	}

	async function markIncomplete(courseId: string, cid: number, taskId: number) {
		updatingTaskId = taskId;
		try {
			await uncompleteStudentCourseTask({ courseId, cid, taskId });
		} finally {
			updatingTaskId = null;
		}
	}
</script>

<div class="card bg-base-200 shadow-sm w-full max-w-1/2">
	<div class="card-body">
		<h2 class="card-title text-lg">Course Tasks</h2>
		{#if tasks.length === 0}
			<p class="text-sm">No tasks defined for this course.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each tasks as task, index (task.taskId)}
					{@const taskLinkUrl = linkVatcanTasks
						? getVatcanTaskUrl(task.taskType, task.taskValue2)
						: undefined}
					{@const showInstructorControls =
						instructorContext && task.manuallyCompletable}
					{@const isDimmed =
						highlightNextTask && nextTaskIndex !== -1 && index !== nextTaskIndex}
					<svelte:element
						this={taskLinkUrl ? 'a' : 'div'}
						href={taskLinkUrl}
						target={taskLinkUrl ? '_blank' : undefined}
						rel={taskLinkUrl ? 'noopener noreferrer' : undefined}
						class="bg-base-100 flex flex-row items-center gap-2 rounded-lg px-3 py-2 shadow-sm transition-opacity {isDimmed
							? 'opacity-45'
							: ''} {taskLinkUrl && !isDimmed
							? 'hover:bg-base-300 transition-colors'
							: ''}"
					>
						<span class="shrink-0 text-sm font-semibold">Task {index + 1}</span>
						<span class="badge badge-outline badge-sm shrink-0">{task.typeLabel}</span>
						<p class="min-w-0 flex-1 truncate text-sm">{task.description}</p>
						{#if showInstructorControls}
							{#if task.isComplete}
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
							{:else}
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
										Mark complete
									{/if}
								</button>
							{/if}
						{/if}
						{#if task.isComplete}
							<span class="badge badge-success badge-sm shrink-0">Complete</span>
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
