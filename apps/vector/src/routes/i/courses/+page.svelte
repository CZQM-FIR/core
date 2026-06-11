<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import { getInstructorCourses } from '$lib/remote/instructor.remote';

	const coursesQuery = getInstructorCourses();
</script>

<section class="container mx-auto py-5">
	<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
		<ChevronLeft size="15" /> Back to Instructor Dashboard
	</a>
	<h1 class="mt-2 text-2xl font-semibold">Courses</h1>
	<p class="mt-1 text-sm opacity-80">Select a course to view its students and training progress.</p>
	<div class="divider"></div>

	{#if coursesQuery.error}
		<p class="text-error">Failed to load courses.</p>
	{:else if coursesQuery.loading && !coursesQuery.current}
		<p>Loading courses...</p>
	{:else if (coursesQuery.current ?? []).length === 0}
		<p>No courses are available yet.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Course</th>
						<th>Description</th>
						<th>Waiting</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each coursesQuery.current ?? [] as course (course.id)}
						<tr class="hover">
							<td class="font-medium">{course.name}</td>
							<td class="max-w-md truncate">{course.description ?? '—'}</td>
							<td>{course.waitlist.students.length}</td>
							<td>
								<a href="/i/courses/{course.id}" class="btn btn-primary btn-sm">View</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
