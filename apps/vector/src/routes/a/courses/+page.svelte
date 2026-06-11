<script lang="ts">
	import { createCourse, deleteCourse, getCourses } from '$lib/remote/courses.remote';
	import { SquarePen, Trash } from '@lucide/svelte';

	const coursesQuery = getCourses();

	let createModal: HTMLDialogElement | undefined;
	let deleteModal: HTMLDialogElement | undefined;
	let createFormKey = $state(0);
	let selectedCourseId = $state<string | null>(null);
	let selectedCourseName = $state('');

	function openCreateModal() {
		createModal?.showModal();
	}

	function openDeleteModal(id: string, name: string) {
		selectedCourseId = id;
		selectedCourseName = name;
		deleteModal?.showModal();
	}

	async function confirmDelete() {
		if (selectedCourseId === null) {
			return;
		}

		const id = selectedCourseId;

		await deleteCourse(id).updates(
			coursesQuery.withOverride((courses) => courses.filter((c) => c.id !== id))
		);

		deleteModal?.close();
		selectedCourseId = null;
		selectedCourseName = '';
	}

	$effect(() => {
		if (createCourse.result?.ok) {
			createModal?.close();
			createFormKey++;
		}
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Training Administration</h1>
		<div class="divider"></div>
		<div class="flex flex-row items-center justify-between gap-2">
			<p>
				Manage the courses offered by CZQM. Each course owns its own waitlist; create a new course
				or edit and remove existing ones below.
			</p>
			<button class="btn btn-primary" onclickcapture={openCreateModal}>Create New Course</button>
		</div>

		<div class="mt-5 overflow-x-auto">
			{#if coursesQuery.error}
				<p class="text-error">Failed to load courses.</p>
			{:else if coursesQuery.loading && !coursesQuery.current}
				<p>Loading courses...</p>
			{:else}
				<table class="table">
					<!-- head -->
					<thead>
						<tr>
							<th>#</th>
							<th>Course Name</th>
							<th>Description</th>
							<th># Students</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each coursesQuery.current ?? [] as course, index (course.id)}
							<tr>
								<td>{index + 1}</td>
								<td>{course.name}</td>
								<td>{course.description}</td>
								<td>{course.waitlist.students.length}</td>
								<td class="flex flex-row gap-3">
									<a href="/a/courses/{course.id}">
										<SquarePen class="hover:text-primary max-h-4 transition-colors" />
									</a>
									<button onclickcapture={() => openDeleteModal(course.id, course.name)}>
										<Trash class="hover:text-error max-h-4 transition-colors" />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<dialog class="modal" bind:this={createModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Create Course</h3>
			{#key createFormKey}
				<form {...createCourse} class="mt-4 flex flex-col gap-4 px-8">
					<fieldset class="fieldset w-full">
						<legend class="fieldset-legend">Name</legend>
						<input {...createCourse.fields.name.as('text')} class="input w-full" required />
						<p class="label text-error text-sm">
							{createCourse.fields.name
								.issues()
								?.map((issue) => issue.message)
								.join(' ')}
						</p>
					</fieldset>

					<fieldset class="fieldset w-full">
						<legend class="fieldset-legend">Description</legend>
						<textarea {...createCourse.fields.description.as('text')} class="textarea w-full"
						></textarea>
						<p class="label text-error text-sm">
							{createCourse.fields.description
								.issues()
								?.map((issue) => issue.message)
								.join(' ')}
						</p>
					</fieldset>

					<div class="flex flex-row gap-3">
						<button
							class="btn btn-primary whitespace-nowrap"
							type="submit"
							disabled={!!createCourse.pending}
							aria-busy={!!createCourse.pending}
						>
							{#if createCourse.pending}
								<span class="loading loading-spinner loading-sm"></span>
								Creating...
							{:else}
								Create Course
							{/if}
						</button>
						<button
							type="button"
							class="btn"
							disabled={!!createCourse.pending}
							onclickcapture={() => createModal?.close()}
						>
							Cancel
						</button>
					</div>
				</form>
			{/key}
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>

	<dialog class="modal" bind:this={deleteModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete course?</h3>
			<p class="py-2">
				Are you sure you want to delete <span class="font-semibold">{selectedCourseName}</span>?
			</p>
			<p class="text-warning text-sm">
				Warning: this also deletes the course's waitlist and everyone on it. This action cannot be
				undone.
			</p>
			<div class="modal-action">
				<form method="dialog">
					<button class="btn" disabled={!!deleteCourse.pending}>Cancel</button>
				</form>
				<button
					class="btn btn-error"
					disabled={!!deleteCourse.pending}
					aria-busy={!!deleteCourse.pending}
					onclick={confirmDelete}
				>
					{#if deleteCourse.pending}
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
</section>
