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
		getVatcanCbtBlocks,
		createCourseTask,
		updateCourseTask,
		deleteCourseTask,
		moveCourseTaskUp,
		moveCourseTaskDown
	} from '$lib/remote/courses.remote';
	import {
		decodeVatcanCbtTaskValue2,
		formatCbtBlockKey,
		vatcanCbtBlockMetaFromOption,
		type VatcanCbtBlockMeta,
		type VatcanCbtBlockOption
	} from '@czqm/common';

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
	let selectedCbtBlockId = $state('');
	let formKey = $state(0);
	let handledCreateResult = $state<unknown>(undefined);
	let handledUpdateResult = $state<unknown>(undefined);

	const addTaskForm = $derived(createCourseTask.for(formKey));
	const updateTaskForm = $derived(updateCourseTask.for(formKey));

	const needsCbtCatalogForDisplay = $derived(
		course.tasks.some((task) => {
			if (task.taskType !== 'vatcan_cbt') return false;
			const value2 = task.taskValue2?.trim();
			if (!value2) return true;
			return !/^(division|facility):/.test(value2);
		})
	);

	function buildCbtMetaMap(blocks: VatcanCbtBlockOption[]): Map<number, VatcanCbtBlockMeta> {
		return new Map(blocks.map((block) => [block.id, vatcanCbtBlockMetaFromOption(block)]));
	}

	function taskDescription(task: TaskRow, catalog?: VatcanCbtBlockOption[]): string {
		const metaByBlockId = catalog ? buildCbtMetaMap(catalog) : undefined;
		return describeCourseTask(
			task,
			metaByBlockId ? { vatcanCbtMetaByBlockId: metaByBlockId } : undefined
		);
	}

	function groupCbtBlocks(blocks: VatcanCbtBlockOption[]) {
		const groups: { label: string; blocks: VatcanCbtBlockOption[] }[] = [];
		const indexByLabel = new Map<string, number>();

		for (const block of blocks) {
			let index = indexByLabel.get(block.facilityLabel);
			if (index === undefined) {
				index = groups.length;
				indexByLabel.set(block.facilityLabel, index);
				groups.push({ label: block.facilityLabel, blocks: [] });
			}
			groups[index].blocks.push(block);
		}

		return groups;
	}

	function openAddModal() {
		editingTask = null;
		selectedTaskType = 'manual';
		editTaskValue1 = '';
		editTaskValue2 = '';
		selectedCbtBlockId = '';
		formKey++;
		taskModal?.showModal();
	}

	function cbtBlockSelectValue(task: TaskRow): string {
		if (!task.taskValue1) return '';
		const decoded = decodeVatcanCbtTaskValue2(task.taskValue2);
		if (decoded && task.taskValue2?.trim().match(/^(division|facility):/)) {
			return `${decoded.source}:${task.taskValue1}`;
		}
		return task.taskValue1;
	}

	function openEditModal(task: TaskRow) {
		editingTask = task;
		selectedTaskType = task.taskType;
		editTaskValue1 =
			task.taskType === 'vatcan_cbt' ? cbtBlockSelectValue(task) : (task.taskValue1 ?? '');
		editTaskValue2 = task.taskValue2 ?? '';
		formKey++;
		taskModal?.showModal();
	}

	function openDeleteTaskModal(task: TaskRow, index: number) {
		taskToDelete = {
			taskId: task.taskId,
			label: `Task ${index + 1} (${formatCourseTaskType(task.taskType)}: ${taskDescription(task)})`
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

	function swapTasks(tasks: TaskRow[], taskId: number, direction: 'up' | 'down'): TaskRow[] {
		const index = tasks.findIndex((task) => task.taskId === taskId);
		if (index === -1) return tasks;

		const otherIndex = direction === 'up' ? index - 1 : index + 1;
		if (otherIndex < 0 || otherIndex >= tasks.length) return tasks;

		const next = [...tasks];
		[next[otherIndex], next[index]] = [next[index], next[otherIndex]];
		return next;
	}

	function handleTaskFormSuccess() {
		taskModal?.close();
		editingTask = null;
		selectedTaskType = 'manual';
		editTaskValue1 = '';
		editTaskValue2 = '';
		selectedCbtBlockId = '';
		formKey++;
		void getCourse(courseId).refresh();
	}

	$effect(() => {
		const createResult = addTaskForm.result;
		if (createResult?.ok && createResult !== handledCreateResult) {
			handledCreateResult = createResult;
			handleTaskFormSuccess();
		}
	});

	$effect(() => {
		const updateResult = updateTaskForm.result;
		if (updateResult?.ok && updateResult !== handledUpdateResult) {
			handledUpdateResult = updateResult;
			handleTaskFormSuccess();
		}
	});
</script>

{#snippet taskRows(catalog?: VatcanCbtBlockOption[])}
	{#each course.tasks as task, index (task.taskId)}
		<div
			class="bg-base-100 flex min-w-0 flex-row items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm"
		>
			<span class="shrink-0 text-sm font-semibold">Task {index + 1}</span>
			<span class="badge badge-outline badge-sm shrink-0"
				>{formatCourseTaskType(task.taskType)}</span
			>
			<p class="min-w-0 flex-1 truncate text-xs">{taskDescription(task, catalog)}</p>
			<div class="flex shrink-0 flex-row items-center gap-1">
				{#if index > 0}
					<button
						class="btn btn-outline btn-primary btn-sm btn-square tooltip"
						data-tip="Move up"
						onclickcapture={() =>
							moveCourseTaskUp({ courseId, taskId: task.taskId }).updates(
								getCourse(courseId).withOverride((c) => ({
									...c,
									tasks: swapTasks(c.tasks, task.taskId, 'up')
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
									tasks: swapTasks(c.tasks, task.taskId, 'down')
								}))
							)}
					>
						<ArrowDown size="16" strokeWidth={2.5} />
					</button>
				{/if}
				<button class="tooltip" data-tip="Edit Task" onclickcapture={() => openEditModal(task)}>
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
{/snippet}

<div class="card bg-base-200 h-full min-w-0 overflow-hidden shadow-sm">
	<div class="card-body flex h-full min-h-0 min-w-0 flex-col gap-2">
		<div class="flex shrink-0 flex-row items-center justify-between gap-2">
			<h2 class="card-title min-w-0 truncate text-lg">Course Tasks</h2>
			<button class="btn btn-primary btn-sm" onclickcapture={openAddModal}>Add Task</button>
		</div>

		{#if course.tasks.length === 0}
			<p class="flex-1 text-sm">No tasks defined for this course.</p>
		{:else if needsCbtCatalogForDisplay}
			<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
				{#await getVatcanCbtBlocks()}
					<p class="text-sm opacity-70">Loading CBT block names...</p>
				{:then catalog}
					{@render taskRows(catalog.blocks)}
				{:catch}
					{@render taskRows()}
				{/await}
			</div>
		{:else}
			<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
				{@render taskRows()}
			</div>
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={taskModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
		{#key formKey}
			{#if editingTask}
				<form {...updateTaskForm} class="mt-4 flex flex-col gap-4">
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
							<legend class="fieldset-legend">CBT Block</legend>
							{#await getVatcanCbtBlocks()}
								<p class="text-sm opacity-70">Loading CBT blocks...</p>
							{:then catalog}
								{#if catalog.error}
									<p class="text-error text-sm">{catalog.error}</p>
								{:else if catalog.blocks.length === 0}
									<p class="text-warning text-sm">No CBT blocks available.</p>
								{:else}
									<select class="select" name="taskValue1" required bind:value={editTaskValue1}>
										<option value="" disabled>Select CBT block</option>
										{#each groupCbtBlocks(catalog.blocks) as group (group.label)}
											<optgroup label={group.label}>
												{#each group.blocks as block (`${block.source}:${block.id}`)}
													<option value={formatCbtBlockKey(block)}>{block.title}</option>
												{/each}
											</optgroup>
										{/each}
									</select>
								{/if}
							{:catch err}
								<p class="text-error text-sm">
									Failed to load CBT blocks{err instanceof Error ? `: ${err.message}` : '.'}
								</p>
							{/await}
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
						<button class="btn btn-primary" disabled={!!updateTaskForm.pending}>
							{#if updateTaskForm.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Saving...
							{:else}
								Save
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<div class="mt-4 flex flex-col gap-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Task Type</legend>
						<select class="select" required bind:value={selectedTaskType}>
							{#each TASK_TYPES as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</fieldset>

					<form {...addTaskForm} class="flex flex-col gap-4">
						<input type="hidden" name="courseId" value={courseId} />
						<input type="hidden" name="taskType" value={selectedTaskType} />

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
									<legend class="fieldset-legend">CBT Block</legend>
									{#await getVatcanCbtBlocks()}
										<p class="text-sm opacity-70">Loading CBT blocks...</p>
									{:then catalog}
										{#if catalog.error}
											<p class="text-error text-sm">{catalog.error}</p>
										{:else if catalog.blocks.length === 0}
											<p class="text-warning text-sm">No CBT blocks available.</p>
										{:else}
											<select
												class="select"
												name="taskValue1"
												required
												bind:value={selectedCbtBlockId}
											>
												<option value="" disabled selected>Select CBT block</option>
												{#each groupCbtBlocks(catalog.blocks) as group (group.label)}
													<optgroup label={group.label}>
														{#each group.blocks as block (`${block.source}:${block.id}`)}
															<option value={formatCbtBlockKey(block)}>{block.title}</option>
														{/each}
													</optgroup>
												{/each}
											</select>
										{/if}
									{:catch err}
										<p class="text-error text-sm">
											Failed to load CBT blocks{err instanceof Error ? `: ${err.message}` : '.'}
										</p>
									{/await}
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
							<button class="btn btn-primary" disabled={!!addTaskForm.pending}>
								{#if addTaskForm.pending}
									<span class="loading loading-spinner loading-sm"></span>
									Adding...
								{:else}
									Add Task
								{/if}
							</button>
						</div>
					</form>
				</div>
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
