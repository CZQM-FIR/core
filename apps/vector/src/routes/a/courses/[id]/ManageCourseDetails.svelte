<script lang="ts">
	import { getCourse, saveCourse } from '$lib/remote/courses.remote';
	import {
		saveWaitlistEstimatedTime,
		saveWaitlistCohorts
	} from '$lib/remote/waitlist.remote';

	type CourseData = Awaited<ReturnType<typeof getCourse>>;

	let {
		course,
		courseId,
		waitlistId
	}: {
		course: CourseData;
		courseId: string;
		waitlistId: number;
	} = $props();

	let name = $state(course.name);
	let description = $state(course.description ?? '');
	let estimatedTime = $state(course.waitlist.waitTime ?? '');
	let waitlistCohort = $state(course.waitlist.waitlistCohort ?? '');
	let enrolledCohort = $state(course.waitlist.enrolledCohort ?? '');

	let courseSaved = $state(false);
	let waitTimeSaved = $state(false);
	let cohortsSaved = $state(false);

	async function handleSaveCourse() {
		courseSaved = false;
		await saveCourse({ id: courseId, name, description }).updates(
			getCourse(courseId).withOverride((c) => ({
				...c,
				name,
				description: description || null
			}))
		);
		courseSaved = true;
	}

	async function handleSaveWaitTime() {
		waitTimeSaved = false;
		await saveWaitlistEstimatedTime({ waitlistId, estimatedTime }).updates(
			getCourse(courseId).withOverride((c) => ({
				...c,
				waitlist: { ...c.waitlist, waitTime: estimatedTime }
			}))
		);
		waitTimeSaved = true;
	}

	async function handleSaveCohorts() {
		cohortsSaved = false;
		await saveWaitlistCohorts({ waitlistId, waitlistCohort, enrolledCohort }).updates(
			getCourse(courseId).withOverride((c) => ({
				...c,
				waitlist: {
					...c.waitlist,
					waitlistCohort: waitlistCohort || null,
					enrolledCohort: enrolledCohort || null
				}
			}))
		);
		cohortsSaved = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg">Course Details</h2>

			<div class="flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Name</legend>
					<input type="text" class="input" required bind:value={name} />
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Description</legend>
					<textarea class="textarea h-24" bind:value={description}></textarea>
				</fieldset>

				<button
					class="btn w-min {!saveCourse.pending && courseSaved ? 'btn-success' : 'btn-primary'}"
					disabled={!!saveCourse.pending}
					onclickcapture={handleSaveCourse}
				>
					{#if saveCourse.pending}
						<span class="loading loading-spinner loading-sm"></span>
						Saving...
					{:else}
						Save
					{/if}
				</button>
			</div>
		</div>
	</div>

	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg">Waitlist Settings</h2>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Estimated Wait Time</legend>
				<div class="flex flex-row gap-3">
					<input
						placeholder="Estimated Wait Time..."
						class="input"
						bind:value={estimatedTime}
					/>
					<button
						class="btn {!saveWaitlistEstimatedTime.pending && waitTimeSaved ? 'btn-success' : 'btn-primary'}"
						disabled={!!saveWaitlistEstimatedTime.pending}
						onclickcapture={handleSaveWaitTime}
					>
						{#if saveWaitlistEstimatedTime.pending}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							Save
						{/if}
					</button>
				</div>
			</fieldset>

			<fieldset class="fieldset mt-4">
				<legend class="fieldset-legend">Moodle Cohorts</legend>
				<div class="flex flex-row items-end gap-3">
					<fieldset class="fieldset min-w-0 flex-1">
						<legend class="fieldset-legend">Wait List Cohort</legend>
						<input id="waitlistCohort" type="text" class="input" bind:value={waitlistCohort} />
					</fieldset>
					<fieldset class="fieldset min-w-0 flex-1">
						<legend class="fieldset-legend">Enrolled Cohort</legend>
						<input id="enrolledCohort" type="text" class="input" bind:value={enrolledCohort} />
					</fieldset>
					<button
						class="btn shrink-0 {!saveWaitlistCohorts.pending && cohortsSaved ? 'btn-success' : 'btn-primary'}"
						disabled={!!saveWaitlistCohorts.pending}
						onclickcapture={handleSaveCohorts}
					>
						{#if saveWaitlistCohorts.pending}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							Save Cohorts
						{/if}
					</button>
				</div>
				<p class="text-xs mt-2">
					Wait list cohort is used when users join the waitlist; enrolled cohort when they are
					enrolled in the course.
				</p>
			</fieldset>
		</div>
	</div>
</div>
