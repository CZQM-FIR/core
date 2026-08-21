<script lang="ts">
	import env from '$lib/publicEnv';
	import MyTrainingSessions from '$lib/components/MyTrainingSessions.svelte';
	import { getCurrentUserInfo } from '$lib/remote/users.remote';
	import { getStudentCourses } from '$lib/remote/student.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const coursesQuery = $derived(data.isVectorStudent ? getStudentCourses() : null);
</script>

{#snippet returnToCzqm()}
	<a href={env.PUBLIC_WEB_URL} class="btn btn-outline btn-sm shrink-0">Return to CZQM.ca</a>
{/snippet}

{#if !data.isVectorStudent && !data.isVectorInstructor}
	<div class="hero bg-base-200 min-h-screen">
		<div class="hero-content text-center">
			<div class="max-w-md">
				<h1 class="text-5xl font-bold">Vector</h1>
				<div class="flex flex-col gap-3 py-6">
					<p>
						Welcome to Vector, the CZQM FIR's controller management system. This system is only
						available to CZQM home controllers and visitors.
					</p>
					<p>
						If you believe you should have access, please contact the webmaster or chief instructor.
					</p>
				</div>
				<a href={env.PUBLIC_WEB_URL} class="btn btn-outline">Return to CZQM.ca</a>
			</div>
		</div>
	</div>
{:else}
	<section class="container mx-auto py-5">
		{#await getCurrentUserInfo()}
			<div class="flex items-end justify-between gap-4">
				<p>Loading...</p>
				{@render returnToCzqm()}
			</div>
		{:then user}
			<div class="flex items-end justify-between gap-4">
				<div>
					<h1 class="text-3xl font-semibold">Hey there, {user.name_first}!</h1>
					<p class="mt-1 text-sm opacity-80">
						{#if data.isVectorStudent}
							Browse your courses, join waitlists, and track your progress.
						{:else}
							Sessions you are instructing appear below.
						{/if}
					</p>
				</div>
				{@render returnToCzqm()}
			</div>
		{:catch}
			<div class="flex items-end justify-between gap-4">
				<h1 class="text-3xl font-semibold">My Courses</h1>
				{@render returnToCzqm()}
			</div>
		{/await}

		<div class="divider"></div>

		<MyTrainingSessions />

		{#if !data.isVectorStudent}
			<p class="text-sm opacity-80">
				<a href="/i" class="link link-primary">Open the instructor dashboard</a> to review courses and
				student progress.
			</p>
		{:else if coursesQuery?.error}
			<p class="text-error">Failed to load courses.</p>
		{:else if coursesQuery?.loading && !coursesQuery.current}
			<p>Loading courses...</p>
		{:else}
			{@const catalog = coursesQuery?.current ?? {
				enrolled: [],
				completed: [],
				eligible: [],
				ineligible: []
			}}

			{#if catalog.enrolled.length > 0}
				<section class="mb-8">
					<h2 class="text-xl font-semibold">Enrolled</h2>
					<p class="text-sm opacity-70">Courses you are waitlisted for or actively enrolled in.</p>
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each catalog.enrolled as course (course.id)}
							<a
								href="/courses/{course.id}"
								class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
							>
								<div class="card-body gap-3">
									<div class="flex items-start justify-between gap-2">
										<h3 class="card-title text-lg">{course.name}</h3>
										{#if course.status === 'enrolled'}
											<span
												class="badge {course.pause ? 'badge-warning' : 'badge-secondary'} shrink-0"
											>
												{course.pause ? 'Paused' : 'Enrolled'}
											</span>
										{:else}
											<span class="badge badge-primary shrink-0">
												Waitlisted
												{#if course.position != null}
													#{course.position + 1}
												{/if}
											</span>
										{/if}
									</div>
									{#if course.pause}
										<p class="line-clamp-3 text-sm whitespace-pre-wrap opacity-80">
											{course.pause.pauseReason}
										</p>
									{:else if course.description}
										<p class="line-clamp-2 text-sm opacity-80">{course.description}</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			{#if catalog.eligible.length > 0}
				<section class="mb-8">
					<h2 class="text-xl font-semibold">Eligible</h2>
					<p class="text-sm opacity-70">Courses you can join — prerequisites are met.</p>
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each catalog.eligible as course (course.id)}
							<a
								href="/courses/{course.id}"
								class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
							>
								<div class="card-body gap-2">
									<h3 class="card-title text-lg">{course.name}</h3>
									{#if course.description}
										<p class="line-clamp-2 text-sm opacity-80">{course.description}</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			{#if catalog.ineligible.length > 0}
				<section class="mb-8">
					<h2 class="text-xl font-semibold">Ineligible</h2>
					<p class="text-sm opacity-70">Courses with prerequisites you have not yet met.</p>
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each catalog.ineligible as course (course.id)}
							<a
								href="/courses/{course.id}"
								class="card bg-base-200 opacity-75 shadow-sm transition-all hover:opacity-100 hover:shadow-md"
							>
								<div class="card-body gap-2">
									<div class="flex items-start justify-between gap-2">
										<h3 class="card-title text-lg">{course.name}</h3>
										<span class="badge badge-outline badge-error badge-sm shrink-0">Ineligible</span
										>
									</div>
									{#if course.description}
										<p class="line-clamp-2 text-sm opacity-70">{course.description}</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			{#if catalog.completed.length > 0}
				<section>
					<h2 class="text-xl font-semibold">Completed</h2>
					<p class="text-sm opacity-70">Courses you have finished.</p>
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each catalog.completed as course (course.id)}
							<a
								href="/courses/{course.id}"
								class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
							>
								<div class="card-body gap-2">
									<h3 class="card-title text-lg">{course.name}</h3>
									<p class="text-sm opacity-80">
										Completed
										{#if course.completedAt}
											{course.completedAt.toUTCString().replace(' GMT', 'z')}
										{:else}
											—
										{/if}
									</p>
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}
		{/if}
	</section>
{/if}
