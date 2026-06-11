<script lang="ts">
	import { ArrowUp, ArrowDown, Trash, SquarePen } from '@lucide/svelte';
	import {
		COURSE_TASK_TYPE_LABELS,
		TRAINING_SESSION_TYPE_LABELS,
		describeCourseTask,
		formatCourseTaskType
	} from '@czqm/common';
	import {
		getCourse,
		createCourseTask,
		updateCourseTask,
		deleteCourseTask,
		moveCourseTaskUp,
		moveCourseTaskDown
	} from '$lib/remote/courses.remote';

	type CourseData = Awaited<ReturnType<typeof getCourse>>;
	type TaskRow = CourseData['tasks'][number];

	const TASK_TYPES = Object.entries(COURSE_TASK_TYPE_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	const TRAINING_SESSION_TYPES = Object.entries(TRAINING_SESSION_TYPE_LABELS).map(
		([value, label]) => ({
			value,
			label
		})
	);

	let { course, courseId }: { course: CourseData; courseId: string } = $props();

	let taskModal: HTMLDialogElement | undefined;
	let deleteTaskModal: HTMLDialogElement | undefined;
	let editingTask = $state<TaskRow | null>(null);
	let taskToDelete = $state<{ taskId: number; label: string } | null>(null);
	let selectedTaskType = $state<string>('manual');
	let editTaskValue1 = $state('');
	let editTaskValue2 = $state('');
	let formKey = $state(0);

	function openAddModal() {
		editingTask = null;
		selectedTaskType = 'manual';
		editTaskValue1 = '';
		editTaskValue2 = '';
		formKey++;
		taskModal?.showModal();
	}

	function openEditModal(task: TaskRow) {
		editingTask = task;
		selectedTaskType = task.taskType;
		editTaskValue1 = task.taskValue1 ?? '';
		editTaskValue2 = task.taskValue2 ?? '';
		formKey++;
		taskModal?.showModal();
	}

	function openDeleteTaskModal(task: TaskRow, index: number) {
		taskToDelete = {
			taskId: task.taskId,
			label: `Task ${index + 1} (${formatCourseTaskType(task.taskType)}: ${describeCourseTask(task)})`
		};
		deleteTaskModal?.showModal();
	}

	async function confirmDeleteTask() {
		if (!taskToDelete) return;

		const { taskId } = taskToDelete;
		await deleteCourseTask({ courseId, taskId }).updates(
			getCourse(courseId).withOverride((c) => ({
				...c,
				tasks: c.tasks.filter((t) => t.taskId !== taskId)
			}))
		);
		deleteTaskModal?.close();
		taskToDelete = null;
	}

	function swapTasks(tasks: TaskRow[], index: number, direction: 'up' | 'down'): TaskRow[] {
		const next = [...tasks];
		const otherIndex = direction === 'up' ? index - 1 : index + 1;
		[next[otherIndex], next[index]] = [next[index], next[otherIndex]];
		return next;
	}

	$effect(() => {
		if (createCourseTask.result?.ok || updateCourseTask.result?.ok) {
			taskModal?.close();
			editingTask = null;
			formKey++;
		}
	});
</script>

<div class="card bg-base-200 h-full min-w-0 overflow-hidden shadow-sm">
	<div class="card-body flex h-full min-h-0 min-w-0 flex-col gap-2">
		<div class="flex shrink-0 flex-row items-center justify-between gap-2">
			<h2 class="card-title min-w-0 truncate text-lg">Course Tasks</h2>
			<button class="btn btn-primary btn-sm" onclickcapture={openAddModal}>Add Task</button>
		</div>

		{#if course.tasks.length === 0}
			<p class="flex-1 text-sm">No tasks defined for this course.</p>
		{:else}
			<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
				{#each course.tasks as task, index (task.taskId)}
					<div
						class="bg-base-100 flex min-w-0 flex-row items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm"
					>
						<span class="shrink-0 text-sm font-semibold">Task {index + 1}</span>
						<span class="badge badge-outline badge-sm shrink-0"
							>{formatCourseTaskType(task.taskType)}</span
						>
						<p class="min-w-0 flex-1 truncate text-xs">{describeCourseTask(task)}</p>
						<div class="flex shrink-0 flex-row items-center gap-1">
							{#if index > 0}
								<button
									class="btn btn-outline btn-primary btn-sm btn-square tooltip"
									data-tip="Move up"
									onclickcapture={() =>
										moveCourseTaskUp({ courseId, taskId: task.taskId }).updates(
											getCourse(courseId).withOverride((c) => ({
												...c,
												tasks: swapTasks(c.tasks, index, 'up')
											}))
										)}
								>
									<ArrowUp size="16" strokeWidth={2.5} />
								</button>
							{/if}
							{#if index + 1 < course.tasks.length}
								<button
									class="btn btn-outline btn-primary btn-sm btn-square tooltip"
									data-tip="Move down"
									onclickcapture={() =>
										moveCourseTaskDown({ courseId, taskId: task.taskId }).updates(
											getCourse(courseId).withOverride((c) => ({
												...c,
												tasks: swapTasks(c.tasks, index, 'down')
											}))
										)}
								>
									<ArrowDown size="16" strokeWidth={2.5} />
								</button>
							{/if}
							<button
								class="tooltip"
								data-tip="Edit Task"
								onclickcapture={() => openEditModal(task)}
							>
								<SquarePen class="hover:text-primary transition-colors" size="14" />
							</button>
							<button class="tooltip" data-tip="Delete Task">
								<Trash
									class="hover:text-error transition-colors"
									size="14"
									onclickcapture={() => openDeleteTaskModal(task, index)}
								/>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={taskModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
		{#key formKey}
			{#if editingTask}
				<form {...updateCourseTask} class="mt-4 flex flex-col gap-4">
					<input type="hidden" name="courseId" value={courseId} />
					<input type="hidden" name="taskId" value={editingTask.taskId} />

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Task Type</legend>
						<input type="hidden" name="taskType" value={editingTask.taskType} />
						<input
							type="text"
							class="input"
							disabled
							tabindex="-1"
							value={formatCourseTaskType(editingTask.taskType)}
						/>
					</fieldset>

					{#if editingTask.taskType === 'manual'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Label</legend>
							<input type="text" class="input" name="taskValue1" bind:value={editTaskValue1} />
						</fieldset>
					{:else if editingTask.taskType === 'vatcan_exam'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Exam Name</legend>
							<input type="text" class="input" name="taskValue1" bind:value={editTaskValue1} />
						</fieldset>
					{:else if editingTask.taskType === 'moodle'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Moodle Course Name</legend>
							<input type="text" class="input" name="taskValue1" bind:value={editTaskValue1} />
						</fieldset>
					{:else if editingTask.taskType === 'vatcan_cbt'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Block ID</legend>
							<input type="number" class="input" name="taskValue1" bind:value={editTaskValue1} />
						</fieldset>
					{:else if editingTask.taskType === 'training_session'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Session Type</legend>
							<select class="select" name="taskValue1" required bind:value={editTaskValue1}>
								<option value="" disabled>Select session type</option>
								{#each TRAINING_SESSION_TYPES as sessionType (sessionType.value)}
									<option value={sessionType.value}>{sessionType.label}</option>
								{/each}
							</select>
						</fieldset>
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Session Name (optional)</legend>
							<input type="text" class="input" name="taskValue2" bind:value={editTaskValue2} />
						</fieldset>
					{:else if editingTask.taskType === 'delay'}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Unit</legend>
							<select class="select" name="taskValue1" bind:value={editTaskValue1}>
								<option value="hours">Controlling Hours</option>
								<option value="days">Days</option>
							</select>
						</fieldset>
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Quantity</legend>
							<input
								type="number"
								class="input"
								name="taskValue2"
								min="1"
								bind:value={editTaskValue2}
							/>
						</fieldset>
					{/if}

					<div class="modal-action">
						<button type="button" class="btn" onclickcapture={() => taskModal?.close()}
							>Cancel</button
						>
						<button class="btn btn-primary" disabled={!!updateCourseTask.pending}>
							{#if updateCourseTask.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Saving...
							{:else}
								Save
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<form {...createCourseTask} class="mt-4 flex flex-col gap-4">
					<input type="hidden" name="courseId" value={courseId} />

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Task Type</legend>
						<select class="select" name="taskType" required bind:value={selectedTaskType}>
							{#each TASK_TYPES as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</fieldset>

					{#key selectedTaskType}
						{#if selectedTaskType === 'manual'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Label</legend>
								<input type="text" class="input" name="taskValue1" />
							</fieldset>
						{:else if selectedTaskType === 'vatcan_exam'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Exam Name</legend>
								<input type="text" class="input" name="taskValue1" />
							</fieldset>
						{:else if selectedTaskType === 'moodle'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Moodle Course Name</legend>
								<input type="text" class="input" name="taskValue1" />
							</fieldset>
						{:else if selectedTaskType === 'vatcan_cbt'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Block ID</legend>
								<input type="number" class="input" name="taskValue1" />
							</fieldset>
						{:else if selectedTaskType === 'training_session'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Session Type</legend>
								<select class="select" name="taskValue1" required>
									<option value="" disabled selected>Select session type</option>
									{#each TRAINING_SESSION_TYPES as sessionType (sessionType.value)}
										<option value={sessionType.value}>{sessionType.label}</option>
									{/each}
								</select>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Session Name (optional)</legend>
								<input type="text" class="input" name="taskValue2" />
							</fieldset>
						{:else if selectedTaskType === 'delay'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Unit</legend>
								<select class="select" name="taskValue1">
									<option value="hours">Controlling Hours</option>
									<option value="days" selected>Days</option>
								</select>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Quantity</legend>
								<input type="number" class="input" name="taskValue2" min="1" />
							</fieldset>
						{/if}
					{/key}

					<div class="modal-action">
						<button type="button" class="btn" onclickcapture={() => taskModal?.close()}
							>Cancel</button
						>
						<button class="btn btn-primary" disabled={!!createCourseTask.pending}>
							{#if createCourseTask.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Adding...
							{:else}
								Add Task
							{/if}
						</button>
					</div>
				</form>
			{/if}
		{/key}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog class="modal" bind:this={deleteTaskModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Delete task?</h3>
		{#if taskToDelete}
			<p class="py-2">
				Are you sure you want to delete <span class="font-semibold">{taskToDelete.label}</span>?
			</p>
		{/if}
		<p class="text-warning text-sm">
			This permanently removes the task and all student completion records for it. This action
			cannot be undone.
		</p>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={!!deleteCourseTask.pending}>Cancel</button>
			</form>
			<button
				class="btn btn-error"
				disabled={!!deleteCourseTask.pending}
				aria-busy={!!deleteCourseTask.pending}
				onclick={confirmDeleteTask}
			>
				{#if deleteCourseTask.pending}
					<span class="loading loading-spinner loading-sm"></span>
					Deleting...
				{:else}
					Delete
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
