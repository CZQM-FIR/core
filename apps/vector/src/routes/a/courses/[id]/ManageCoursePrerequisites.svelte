<script lang="ts">
	import { Trash } from '@lucide/svelte';
	import {
		COURSE_PREREQUISITE_TYPE_LABELS,
		describeCoursePrerequisite,
		formatCoursePrerequisiteType
	} from '@czqm/common';
	import {
		getCourse,
		getCourses,
		getRatings,
		createCoursePrerequisite,
		deleteCoursePrerequisite
	} from '$lib/remote/courses.remote';

	type CourseData = Awaited<ReturnType<typeof getCourse>>;
	type PrerequisiteRow = CourseData['prerequisites'][number];

	const PREREQUISITE_TYPES = Object.entries(COURSE_PREREQUISITE_TYPE_LABELS).map(
		([value, label]) => ({ value, label })
	);

	let { course, courseId }: { course: CourseData; courseId: string } = $props();

	let prerequisiteModal: HTMLDialogElement | undefined;
	let deletePrerequisiteModal: HTMLDialogElement | undefined;
	let prerequisiteToDelete = $state<{ prerequisiteId: number; label: string } | null>(null);
	let selectedPrerequisiteType = $state<string>('minimum_rating');
	let formKey = $state(0);
	let handledCreateResult = $state<unknown>(undefined);

	const addPrerequisiteForm = $derived(createCoursePrerequisite.for(formKey));

	function openAddModal() {
		selectedPrerequisiteType = 'minimum_rating';
		formKey++;
		prerequisiteModal?.showModal();
	}

	function openDeletePrerequisiteModal(prerequisite: PrerequisiteRow, label: string) {
		prerequisiteToDelete = {
			prerequisiteId: prerequisite.prerequisiteId,
			label
		};
		deletePrerequisiteModal?.showModal();
	}

	async function confirmDeletePrerequisite() {
		if (!prerequisiteToDelete) return;

		const { prerequisiteId } = prerequisiteToDelete;
		await deleteCoursePrerequisite({ courseId, prerequisiteId }).updates(
			getCourse(courseId).withOverride((current) => ({
				...current,
				prerequisites: current.prerequisites.filter(
					(prerequisite) => prerequisite.prerequisiteId !== prerequisiteId
				)
			}))
		);
		deletePrerequisiteModal?.close();
		prerequisiteToDelete = null;
	}

	function handlePrerequisiteFormSuccess() {
		prerequisiteModal?.close();
		selectedPrerequisiteType = 'minimum_rating';
		formKey++;
		void getCourse(courseId).refresh();
	}

	$effect(() => {
		const createResult = addPrerequisiteForm.result;
		if (createResult?.ok && createResult !== handledCreateResult) {
			handledCreateResult = createResult;
			handlePrerequisiteFormSuccess();
		}
	});
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body flex flex-col gap-2">
		<div class="flex flex-row items-center justify-between">
			<h2 class="card-title text-lg">Enrollment Prerequisites</h2>
			<button class="btn btn-primary btn-sm" type="button" onclick={openAddModal}>Add</button>
		</div>

		{#if (course.prerequisites ?? []).length === 0}
			<p class="text-sm">No prerequisites defined for this course.</p>
		{:else}
			{#await Promise.all([getRatings(), getCourses()])}
				<p class="text-sm">Loading prerequisites...</p>
			{:then [ratings, courses]}
				<div class="flex flex-col gap-1.5">
					{#each course.prerequisites as prerequisite (prerequisite.prerequisiteId)}
						{@const label = describeCoursePrerequisite(prerequisite, { ratings, courses })}
						<div
							class="bg-base-100 flex flex-row items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm"
						>
							<span class="badge badge-outline badge-sm shrink-0">
								{formatCoursePrerequisiteType(prerequisite.prerequisiteType)}
							</span>
							<p class="min-w-0 flex-1 truncate text-xs">{label}</p>
							<button
								class="tooltip shrink-0"
								data-tip="Delete Prerequisite"
								type="button"
								onclick={() => openDeletePrerequisiteModal(prerequisite, label)}
							>
								<Trash class="hover:text-error transition-colors" size="14" />
							</button>
						</div>
					{/each}
				</div>
			{/await}
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={prerequisiteModal}>
	<div class="modal-box max-w-lg">
		<h3 class="text-lg font-bold">Add Prerequisite</h3>
		{#key formKey}
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Type</legend>
					<select class="select" required bind:value={selectedPrerequisiteType}>
						{#each PREREQUISITE_TYPES as type (type.value)}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</fieldset>

				<form {...addPrerequisiteForm} class="flex flex-col gap-4">
					<input type="hidden" name="courseId" value={courseId} />
					<input type="hidden" name="prerequisiteType" value={selectedPrerequisiteType} />

					{#key selectedPrerequisiteType}
						{#if selectedPrerequisiteType === 'minimum_rating'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Minimum Rating</legend>
								{#await getRatings()}
									<select class="select" disabled>
										<option>Loading ratings...</option>
									</select>
								{:then ratings}
									<select class="select" name="prerequisiteValue1" required>
										{#each ratings as rating (rating.id)}
											<option value={String(rating.id)}>{rating.short} — {rating.long}</option>
										{/each}
									</select>
								{/await}
							</fieldset>
						{:else if selectedPrerequisiteType === 'controlling_hours'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Required Hours</legend>
								<input
									type="number"
									class="input"
									name="prerequisiteValue1"
									min="0"
									step="0.1"
									required
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">At Rating or Above</legend>
								{#await getRatings()}
									<select class="select" disabled>
										<option>Loading ratings...</option>
									</select>
								{:then ratings}
									<select class="select" name="prerequisiteValue2" required>
										{#each ratings as rating (rating.id)}
											<option value={String(rating.id)}>{rating.short} — {rating.long}</option>
										{/each}
									</select>
								{/await}
							</fieldset>
						{:else if selectedPrerequisiteType === 'prior_course'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Prior Course</legend>
								{#await getCourses()}
									<select class="select" disabled>
										<option>Loading courses...</option>
									</select>
								{:then courses}
									<select class="select" name="prerequisiteValue1" required>
										{#each courses.filter((row) => row.id !== courseId) as priorCourse (priorCourse.id)}
											<option value={priorCourse.id}>{priorCourse.name}</option>
										{/each}
									</select>
								{/await}
							</fieldset>
						{:else if selectedPrerequisiteType === 'earliest_enroll_date'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Earliest Enroll Date</legend>
								<input type="date" class="input" name="prerequisiteValue1" required />
							</fieldset>
						{:else if selectedPrerequisiteType === 'home_controller' || selectedPrerequisiteType === 'visiting_controller' || selectedPrerequisiteType === 'home_or_visiting_controller'}
							<p class="text-sm opacity-70">
								{describeCoursePrerequisite({
									prerequisiteType: selectedPrerequisiteType,
									prerequisiteValue1: null,
									prerequisiteValue2: null
								})}
							</p>
						{/if}
					{/key}

					<div class="modal-action">
						<button type="button" class="btn" onclick={() => prerequisiteModal?.close()}
							>Cancel</button
						>
						<button class="btn btn-primary" disabled={!!addPrerequisiteForm.pending}>
							{#if addPrerequisiteForm.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Adding...
							{:else}
								Add Prerequisite
							{/if}
						</button>
					</div>
				</form>
			</div>
		{/key}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog class="modal" bind:this={deletePrerequisiteModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Delete prerequisite?</h3>
		{#if prerequisiteToDelete}
			<p class="py-2">
				Are you sure you want to delete
				<span class="font-semibold">{prerequisiteToDelete.label}</span>?
			</p>
		{/if}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={!!deleteCoursePrerequisite.pending}>Cancel</button>
			</form>
			<button
				class="btn btn-error"
				disabled={!!deleteCoursePrerequisite.pending}
				aria-busy={!!deleteCoursePrerequisite.pending}
				onclick={confirmDeletePrerequisite}
			>
				{#if deleteCoursePrerequisite.pending}
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
