<script lang="ts">
	import { Trash, SquarePen } from '@lucide/svelte';
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
		updateCoursePrerequisite,
		deleteCoursePrerequisite
	} from '$lib/remote/courses.remote';

	type CourseData = Awaited<ReturnType<typeof getCourse>>;
	type PrerequisiteRow = CourseData['prerequisites'][number];
	type RatingRow = Awaited<ReturnType<typeof getRatings>>[number];
	type CourseOption = Awaited<ReturnType<typeof getCourses>>[number];

	const PREREQUISITE_TYPES = Object.entries(COURSE_PREREQUISITE_TYPE_LABELS).map(
		([value, label]) => ({ value, label })
	);

	let { course, courseId }: { course: CourseData; courseId: string } = $props();

	let prerequisiteModal: HTMLDialogElement | undefined;
	let deletePrerequisiteModal: HTMLDialogElement | undefined;
	let editingPrerequisite = $state<PrerequisiteRow | null>(null);
	let prerequisiteToDelete = $state<{ prerequisiteId: number; label: string } | null>(null);
	let selectedPrerequisiteType = $state<string>('minimum_rating');
	let formKey = $state(0);

	function describePrerequisite(
		prerequisite: PrerequisiteRow,
		ratings: RatingRow[],
		courses: CourseOption[]
	): string {
		switch (prerequisite.prerequisiteType) {
			case 'minimum_rating': {
				const rating = ratings.find((row) => row.id === Number(prerequisite.prerequisiteValue1));
				return rating
					? `Minimum rating ${rating.short} or higher`
					: describeCoursePrerequisite(prerequisite);
			}
			case 'controlling_hours': {
				const rating = ratings.find((row) => row.id === Number(prerequisite.prerequisiteValue2));
				return `${prerequisite.prerequisiteValue1 ?? '0'} controlling hour(s) at ${rating?.short ?? 'unknown'} or above`;
			}
			case 'prior_course': {
				const priorCourse = courses.find((row) => row.id === prerequisite.prerequisiteValue1);
				return priorCourse
					? `Completed course ${priorCourse.name}`
					: describeCoursePrerequisite(prerequisite);
			}
			default:
				return describeCoursePrerequisite(prerequisite);
		}
	}

	function openAddModal() {
		editingPrerequisite = null;
		selectedPrerequisiteType = 'minimum_rating';
		formKey++;
		prerequisiteModal?.showModal();
	}

	function openEditModal(prerequisite: PrerequisiteRow) {
		editingPrerequisite = prerequisite;
		selectedPrerequisiteType = prerequisite.prerequisiteType;
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

	$effect(() => {
		if (createCoursePrerequisite.result?.ok || updateCoursePrerequisite.result?.ok) {
			prerequisiteModal?.close();
			editingPrerequisite = null;
			formKey++;
		}
	});
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body flex flex-col gap-2">
		<div class="flex flex-row items-center justify-between">
			<h2 class="card-title text-lg">Enrollment Prerequisites</h2>
			<button class="btn btn-primary btn-sm" onclickcapture={openAddModal}>Add</button>
		</div>

		{#if (course.prerequisites ?? []).length === 0}
			<p class="text-sm">No prerequisites defined for this course.</p>
		{:else}
			{#await Promise.all([getRatings(), getCourses()])}
				<p class="text-sm">Loading prerequisites...</p>
			{:then [ratings, courses]}
				<div class="flex flex-col gap-1.5">
					{#each course.prerequisites as prerequisite (prerequisite.prerequisiteId)}
						{@const label = describePrerequisite(prerequisite, ratings, courses)}
						<div
							class="bg-base-100 flex flex-row items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm"
						>
							<span class="badge badge-outline badge-sm shrink-0">
								{formatCoursePrerequisiteType(prerequisite.prerequisiteType)}
							</span>
							<p class="min-w-0 flex-1 truncate text-xs">{label}</p>
							<div class="flex shrink-0 flex-row items-center gap-1">
								<button
									class="tooltip"
									data-tip="Edit Prerequisite"
									onclickcapture={() => openEditModal(prerequisite)}
								>
									<SquarePen class="hover:text-primary transition-colors" size="14" />
								</button>
								<button class="tooltip" data-tip="Delete Prerequisite">
									<Trash
										class="hover:text-error transition-colors"
										size="14"
										onclickcapture={() => openDeletePrerequisiteModal(prerequisite, label)}
									/>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/await}
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={prerequisiteModal}>
	<div class="modal-box max-w-lg">
		<h3 class="text-lg font-bold">
			{editingPrerequisite ? 'Edit Prerequisite' : 'Add Prerequisite'}
		</h3>
		{#key formKey}
			{#if editingPrerequisite}
				<form {...updateCoursePrerequisite} class="mt-4 flex flex-col gap-4">
					<input type="hidden" name="courseId" value={courseId} />
					<input type="hidden" name="prerequisiteId" value={editingPrerequisite.prerequisiteId} />

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Type</legend>
						<select
							class="select"
							name="prerequisiteType"
							required
							bind:value={selectedPrerequisiteType}
						>
							{#each PREREQUISITE_TYPES as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</fieldset>

					{#key selectedPrerequisiteType}
						{#if selectedPrerequisiteType === 'minimum_rating'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Minimum Rating</legend>
								{#await getRatings()}
									<select class="select" disabled>
										<option>Loading ratings...</option>
									</select>
								{:then ratings}
									<select
										class="select"
										name="prerequisiteValue1"
										required
										value={editingPrerequisite.prerequisiteValue1 ?? ''}
									>
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
									value={editingPrerequisite.prerequisiteValue1 ?? ''}
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">At Rating or Above</legend>
								{#await getRatings()}
									<select class="select" disabled>
										<option>Loading ratings...</option>
									</select>
								{:then ratings}
									<select
										class="select"
										name="prerequisiteValue2"
										required
										value={editingPrerequisite.prerequisiteValue2 ?? ''}
									>
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
									<select
										class="select"
										name="prerequisiteValue1"
										required
										value={editingPrerequisite.prerequisiteValue1 ?? ''}
									>
										{#each courses.filter((row) => row.id !== courseId) as priorCourse (priorCourse.id)}
											<option value={priorCourse.id}>{priorCourse.name}</option>
										{/each}
									</select>
								{/await}
							</fieldset>
						{:else if selectedPrerequisiteType === 'earliest_enroll_date'}
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Earliest Enroll Date</legend>
								<input
									type="date"
									class="input"
									name="prerequisiteValue1"
									required
									value={editingPrerequisite.prerequisiteValue1 ?? ''}
								/>
							</fieldset>
						{/if}
					{/key}

					<div class="modal-action">
						<button type="button" class="btn" onclickcapture={() => prerequisiteModal?.close()}>
							Cancel
						</button>
						<button class="btn btn-primary" disabled={!!updateCoursePrerequisite.pending}>
							{#if updateCoursePrerequisite.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Saving...
							{:else}
								Save
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<form {...createCoursePrerequisite} class="mt-4 flex flex-col gap-4">
					<input type="hidden" name="courseId" value={courseId} />

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Type</legend>
						<select
							class="select"
							name="prerequisiteType"
							required
							bind:value={selectedPrerequisiteType}
						>
							{#each PREREQUISITE_TYPES as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</fieldset>

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
						{/if}
					{/key}

					<div class="modal-action">
						<button type="button" class="btn" onclickcapture={() => prerequisiteModal?.close()}>
							Cancel
						</button>
						<button class="btn btn-primary" disabled={!!createCoursePrerequisite.pending}>
							{#if createCoursePrerequisite.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Adding...
							{:else}
								Add Prerequisite
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
