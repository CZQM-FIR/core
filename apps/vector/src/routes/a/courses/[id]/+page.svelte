<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChevronLeft, Trash } from '@lucide/svelte';
	import { deleteCourse, getCourse } from '$lib/remote/courses.remote';
	import {
		getEnrolledWaitlistEntries,
		getCompletedWaitlistEntries
	} from '$lib/remote/waitlist.remote';
	import type { PageData } from './$types';
	import ManageCourseDetails from './ManageCourseDetails.svelte';
	import ManageCourseTasks from './ManageCourseTasks.svelte';
	import ManageCoursePrerequisites from './ManageCoursePrerequisites.svelte';
	import ManageCourseStudents from './ManageCourseStudents.svelte';

	let { data }: { data: PageData } = $props();

	const courseQuery = $derived.by(() => getCourse(data.id));

	type Course = Awaited<ReturnType<typeof getCourse>>;
	let course = $state<Course | null>(null);

	$effect(() => {
		if (courseQuery.current) {
			course = courseQuery.current;
		}
	});

	let deleteModal: HTMLDialogElement | undefined;
	let courseName = $state('');

	function openDeleteModal(name: string) {
		courseName = name;
		deleteModal?.showModal();
	}

	async function confirmDelete() {
		await deleteCourse(data.id);
		deleteModal?.close();
		goto('/a/courses');
	}
</script>

<section class="container mx-auto py-5">
	{#if courseQuery.error && !course}
		<p class="text-error">Error loading course: {courseQuery.error.message}</p>
	{:else if !course && courseQuery.loading}
		<a href="/a/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>
		<h1 class="text-3xl font-semibold">Course</h1>
		<p>Loading course...</p>
	{:else if course}
		{@const loadedCourse = course}
		<a href="/a/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>

		<div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<h1 class="text-3xl font-semibold">{loadedCourse.name}</h1>
			<div class="flex flex-row flex-wrap items-center gap-2">
				<span class="badge badge-primary">{loadedCourse.waitlist.students.length} waiting</span>
				{#await getEnrolledWaitlistEntries(loadedCourse.waitlistId)}
					<span class="badge badge-ghost">...</span>
				{:then enrolled}
					<span class="badge badge-secondary">{enrolled.length} enrolled</span>
				{/await}
				{#await getCompletedWaitlistEntries(loadedCourse.waitlistId)}
					<span class="badge badge-ghost">...</span>
				{:then completed}
					<span class="badge badge-accent">{completed.length} completed</span>
				{/await}
				<span class="badge badge-neutral">{loadedCourse.tasks.length} tasks</span>
				<span class="badge badge-neutral"
					>{(loadedCourse.prerequisites ?? []).length} prerequisites</span
				>
				<button
					class="tooltip"
					data-tip="Delete Course"
					onclickcapture={() => openDeleteModal(loadedCourse.name)}
				>
					<Trash class="hover:text-error max-h-5 transition-colors" />
				</button>
			</div>
		</div>

		{#key data.id}
			<div class="mt-6 flex flex-col gap-4">
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
					<ManageCourseDetails
						course={loadedCourse}
						courseId={data.id}
						waitlistId={loadedCourse.waitlistId}
					/>
					<div class="flex h-full min-h-0 flex-col gap-4">
						<div class="min-h-0 flex-1">
							<ManageCourseTasks course={loadedCourse} courseId={data.id} />
						</div>
						<ManageCoursePrerequisites course={loadedCourse} courseId={data.id} />
					</div>
				</div>
				<ManageCourseStudents courseId={data.id} waitlistId={loadedCourse.waitlistId} />
			</div>
		{/key}
	{/if}
</section>

<dialog class="modal" bind:this={deleteModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Delete course?</h3>
		<p class="py-2">
			Are you sure you want to delete <span class="font-semibold">{courseName}</span>?
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
