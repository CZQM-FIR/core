<script lang="ts">
	import { deleteCourse, getCourses } from '$lib/remote/courses.remote';
	import { SquarePen, Trash } from '@lucide/svelte';

	let deleteModal: HTMLDialogElement | undefined;
	let selectedCourseId = $state<number | null>(null);
	let selectedCourseName = $state('');

	function openDeleteModal(id: number, name: string) {
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
			getCourses().withOverride((courses) => courses.filter((c) => c.id !== id))
		);

		deleteModal?.close();
		selectedCourseId = null;
		selectedCourseName = '';
	}
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Course Management</h1>
		<div class="divider"></div>
		<div class="flex flex-row items-center justify-between gap-2">
			<p>
				Manage the courses offered by CZQM. Each course owns its own waitlist; create a new course
				or edit and remove existing ones below.
			</p>
			<a href="/a/courses/create" class="btn btn-primary">Create New Course</a>
		</div>

		<div class="mt-5 overflow-x-auto">
			{#await getCourses()}
				<p>Loading courses...</p>
			{:then courses}
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
						{#each courses as course, index (course.id)}
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
			{/await}
		</div>
	</div>

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
					<button class="btn">Cancel</button>
				</form>
				<button class="btn btn-error" onclick={confirmDelete}>Delete</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
</section>
