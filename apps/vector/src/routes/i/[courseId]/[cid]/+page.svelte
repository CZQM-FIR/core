<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import { getInstructorStudentView } from '$lib/remote/instructor.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const viewQuery = $derived.by(() =>
		getInstructorStudentView({ courseId: data.courseId, cid: data.cid })
	);

	type StudentStatus = 'waitlisted' | 'enrolled' | 'completed' | 'none';

	const statusLabels: Record<StudentStatus, string> = {
		waitlisted: 'Waitlisted',
		enrolled: 'Enrolled',
		completed: 'Completed',
		none: 'Not on course'
	};
</script>

<section class="container mx-auto py-5">
	{#await viewQuery}
		<p>Loading student...</p>
	{:then view}
		<a
			href="/i/courses/{view.course.id}"
			class="text-primary hover:link flex flex-row items-center gap-1"
		>
			<ChevronLeft size="15" /> Back to {view.course.name}
		</a>

		<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-semibold">{view.student.name_full}</h1>
				<p class="text-sm opacity-70">CID {view.student.cid} · {view.student.rating}</p>
			</div>
			<span
				class="badge {view.status === 'completed'
					? 'badge-accent'
					: view.status === 'enrolled'
						? 'badge-secondary'
						: view.status === 'waitlisted'
							? 'badge-primary'
							: 'badge-ghost'}"
			>
				{statusLabels[view.status as StudentStatus]}
			</span>
		</div>

		{#if view.status === 'waitlisted' && view.waitingSince}
			<p class="mt-2 text-sm opacity-70">
				Waiting since {view.waitingSince.toUTCString().replace(' GMT', 'z')}
			</p>
		{:else if view.status === 'enrolled' && view.enrolledAt}
			<p class="mt-2 text-sm opacity-70">
				Enrolled {view.enrolledAt.toUTCString().replace(' GMT', 'z')}
			</p>
		{:else if view.status === 'completed' && view.completedAt}
			<p class="mt-2 text-sm opacity-70">
				Completed {view.completedAt.toUTCString().replace(' GMT', 'z')}
			</p>
		{/if}

		<div class="card bg-base-200 mt-6 shadow-sm">
			<div class="card-body">
				<h2 class="card-title text-lg">Course Tasks</h2>
				{#if view.tasks.length === 0}
					<p class="text-sm">No tasks defined for this course.</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each view.tasks as task, index (task.taskId)}
							<div
								class="bg-base-100 flex flex-row items-center gap-2 rounded-lg px-3 py-2 shadow-sm"
							>
								<span class="shrink-0 text-sm font-semibold">Task {index + 1}</span>
								<span class="badge badge-outline badge-sm shrink-0">{task.typeLabel}</span>
								<p class="min-w-0 flex-1 truncate text-sm">{task.description}</p>
								{#if task.isComplete}
									<span class="badge badge-success badge-sm shrink-0">Complete</span>
								{:else if task.startedAt}
									<span class="badge badge-warning badge-sm shrink-0">In progress</span>
								{:else}
									<span class="badge badge-ghost badge-sm shrink-0">Not started</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:catch err}
		<p class="text-error">Error loading student: {err.message}</p>
	{/await}
</section>
