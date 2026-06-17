<script lang="ts">
	import { getInstructorEnrolledEntries } from '$lib/remote/instructor.remote';
	import type { getInstructorCourse } from '$lib/remote/instructor.remote';

	type CourseData = Awaited<ReturnType<typeof getInstructorCourse>>;

	let { course }: { course: CourseData } = $props();

	let enrolledSearch = $state('');

	function filterStudents<T extends { user: { name_full: string; cid: number }; cid: number }>(
		students: T[],
		query: string
	): T[] {
		const q = query.trim().toLowerCase();
		if (!q) return students;

		return students.filter(
			(student) =>
				student.user.name_full.toLowerCase().includes(q) || String(student.cid).includes(q)
		);
	}
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body flex flex-col">
		<h2 class="card-title text-lg">Enrolled Students</h2>

		{#await getInstructorEnrolledEntries(course.waitlistId)}
			<p class="text-sm">Loading enrolled students...</p>
		{:then enrolledEntries}
			{#if enrolledEntries.length > 0}
				<input
					type="search"
					class="input input-sm input-bordered w-full"
					placeholder="Search enrolled students..."
					bind:value={enrolledSearch}
				/>
			{/if}
			{#if enrolledEntries.length === 0}
				<p class="text-sm">No students currently enrolled.</p>
			{:else if filterStudents(enrolledEntries, enrolledSearch).length === 0}
				<p class="text-sm">No students match your search.</p>
			{:else}
				<div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
					{#each filterStudents(enrolledEntries, enrolledSearch) as student (student.cid)}
						<a
							href="/i/{course.id}/{student.cid}"
							class="bg-base-100 hover:bg-base-300 block rounded-lg px-3 py-2 shadow-sm transition-colors"
						>
							<p class="truncate text-sm font-semibold">
								{student.user.name_full} ({student.cid})
							</p>
							<p class="text-xs opacity-70">
								Enrolled {student.enrolledAt.toUTCString().replace(' GMT', 'z')}
							</p>
						</a>
					{/each}
				</div>
			{/if}
		{/await}
	</div>
</div>
