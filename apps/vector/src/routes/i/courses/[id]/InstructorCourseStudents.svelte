<script lang="ts">
	import {
		getInstructorEnrolledEntries,
		getInstructorCompletedEntries
	} from '$lib/remote/instructor.remote';
	import type { getInstructorCourse } from '$lib/remote/instructor.remote';

	type CourseData = Awaited<ReturnType<typeof getInstructorCourse>>;

	let { course }: { course: CourseData } = $props();

	let waitlistSearch = $state('');
	let enrolledSearch = $state('');
	let completedSearch = $state('');

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

<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
	<div class="card bg-base-200 h-full shadow-sm">
		<div class="card-body flex flex-col">
			<h2 class="card-title text-lg">Waitlisted</h2>
			{#if course.waitlist.students.length > 0}
				<input
					type="search"
					class="input input-sm input-bordered w-full"
					placeholder="Search waitlisted..."
					bind:value={waitlistSearch}
				/>
			{/if}

			{#if course.waitlist.students.length === 0}
				<p class="text-sm">No students on this waitlist.</p>
			{:else if filterStudents(course.waitlist.students, waitlistSearch).length === 0}
				<p class="text-sm">No students match your search.</p>
			{:else}
				<div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
					{#each filterStudents(course.waitlist.students, waitlistSearch) as student (student.cid)}
						<a
							href="/i/{course.id}/{student.cid}"
							class="bg-base-100 hover:bg-base-300 block rounded-lg px-3 py-2 shadow-sm transition-colors"
						>
							<div class="flex flex-row items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-semibold">
										{student.user.name_full} ({student.cid})
									</p>
									<p class="text-xs opacity-70">
										Waiting since {student.waitingSince.toUTCString().replace(' GMT', 'z')}
									</p>
								</div>
								<span class="text-sm font-semibold opacity-50">{student.position + 1}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="card bg-base-200 h-full shadow-sm">
		<div class="card-body flex flex-col">
			<h2 class="card-title text-lg">Enrolled</h2>

			{#await getInstructorEnrolledEntries(course.waitlistId)}
				<p class="text-sm">Loading enrolled students...</p>
			{:then enrolledEntries}
				{#if enrolledEntries.length > 0}
					<input
						type="search"
						class="input input-sm input-bordered w-full"
						placeholder="Search enrolled..."
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

	<div class="card bg-base-200 h-full shadow-sm">
		<div class="card-body flex flex-col">
			<h2 class="card-title text-lg">Completed</h2>

			{#await getInstructorCompletedEntries(course.waitlistId)}
				<p class="text-sm">Loading completed students...</p>
			{:then completedEntries}
				{#if completedEntries.length > 0}
					<input
						type="search"
						class="input input-sm input-bordered w-full"
						placeholder="Search completed..."
						bind:value={completedSearch}
					/>
				{/if}
				{#if completedEntries.length === 0}
					<p class="text-sm">No students have completed this course.</p>
				{:else if filterStudents(completedEntries, completedSearch).length === 0}
					<p class="text-sm">No students match your search.</p>
				{:else}
					<div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
						{#each filterStudents(completedEntries, completedSearch) as student (student.cid)}
							<a
								href="/i/{course.id}/{student.cid}"
								class="bg-base-100 hover:bg-base-300 block rounded-lg px-3 py-2 shadow-sm transition-colors"
							>
								<p class="truncate text-sm font-semibold">
									{student.user.name_full} ({student.cid})
								</p>
								<p class="text-xs opacity-70">
									Completed {student.completedAt.toUTCString().replace(' GMT', 'z')}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			{/await}
		</div>
	</div>
</div>
