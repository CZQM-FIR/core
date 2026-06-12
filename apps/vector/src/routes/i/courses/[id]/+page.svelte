<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import {
		getInstructorCourse,
		getInstructorEnrolledEntries,
		getInstructorCompletedEntries
	} from '$lib/remote/instructor.remote';
	import type { PageData } from './$types';
	import InstructorCourseStudents from './InstructorCourseStudents.svelte';

	let { data }: { data: PageData } = $props();

	const courseQuery = $derived.by(() => getInstructorCourse(data.id));
</script>

<section class="container mx-auto py-5">
	{#if courseQuery.error && !courseQuery.current}
		<a href="/i/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>
		<p class="text-error mt-4">Error loading course: {courseQuery.error.message}</p>
	{:else if !courseQuery.current && courseQuery.loading}
		<a href="/i/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>
		<h1 class="mt-2 text-3xl font-semibold">Course</h1>
		<p class="mt-2">Loading course...</p>
	{:else if courseQuery.current}
		{@const course = courseQuery.current}
		<a href="/i/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>
		<div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-semibold">{course.name}</h1>
				{#if course.description}
					<p class="mt-1 text-sm opacity-80">{course.description}</p>
				{/if}
			</div>
			<div class="flex flex-row flex-wrap items-center gap-2">
				<span class="badge badge-primary">{course.waitlist.students.length} waiting</span>
				{#await getInstructorEnrolledEntries(course.waitlistId)}
					<span class="badge badge-ghost">...</span>
				{:then enrolled}
					<span class="badge badge-secondary">{enrolled.length} enrolled</span>
				{/await}
				{#await getInstructorCompletedEntries(course.waitlistId)}
					<span class="badge badge-ghost">...</span>
				{:then completed}
					<span class="badge badge-accent">{completed.length} completed</span>
				{/await}
				<span class="badge badge-neutral">{course.tasks.length} tasks</span>
			</div>
		</div>

		<div class="mt-6">
			<InstructorCourseStudents {course} />
		</div>
	{/if}
</section>
