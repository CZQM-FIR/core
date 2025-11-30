<script lang="ts">
	import type { PageData } from './$types';
	import { Trash, SquareCheck, ArrowUp, ArrowDown, UserPlus, SquarePen } from '@lucide/svelte';
	import {
		getWaitlist,
		moveUserUp,
		moveUserDown,
		removeUserFromWaitlist,
		addUserToWaitlist,
		enrolUserFromWaitlist,
		editWaitlistEstimatedTime,
		getEnrolledWaitlistEntries,
		removeUserFromEnrolledCourse,
		hideUserFromEnrolledCourse,
		editWaitlistName
	} from '$lib/remote/waitlist.remote';
	import { getAllControllers } from '$lib/remote/users.remote';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);

	$effect(() => {
		let result = editWaitlistName.result?.success;

		if (result) {
			editing = false;
		}
	});

	const toggleEditing = () => {
		editing = !editing;
	};
</script>

<section class="container mx-auto py-5">
	{#await getWaitlist(data.id)}
		<h1 class="text-3xl font-semibold">Wait List</h1>
		<p class="text-primary hover:link"><a href="/a/waitlist">&lt; Back to Waitlists</a></p>
		<p>Loading Wait List...</p>
	{:then waitlist}
		<h1 class="flex flex-row items-baseline text-3xl font-semibold">
			{#if editing}
				<form class="flex flex-row gap-3" {...editWaitlistName}>
					<input
						type="text"
						value={waitlist.name}
						name="name"
						required
						class="input text-xl"
						placeholder="Waitlist Name"
					/>
					<button class="btn btn-primary">Save</button>
				</form>
			{:else}
				<span>{waitlist ? waitlist.name : ''} Wait List</span>

				<div class="tooltip" data-tip="Edit Waitlist Name">
					<SquarePen
						class="hover:text-primary ms-2 max-h-4 transition-colors"
						onclickcapture={toggleEditing}
					/>
				</div>
				<div class="tooltip" data-tip="Delete Waitlist">
					<a href="/a/waitlist/{waitlist.id}/delete"
						><Trash class="hover:text-error max-h-4 transition-colors" /></a
					>
				</div>
			{/if}
		</h1>
		<p class="text-primary hover:link"><a href="/a/waitlist">&lt; Back to Waitlists</a></p>

		<h2 class="mt-4 text-xl font-semibold">Estimated Wait Time</h2>
		<div class="divider mt-0"></div>

		<form {...editWaitlistEstimatedTime} class="mb-4 flex flex-row gap-3">
			<input
				placeholder="Estimated Wait Time..."
				class="input"
				name="estimatedTime"
				value={waitlist.waitTime}
			/>
			<input type="hidden" name="waitlistId" value={data.id} />
			<button
				class="btn {!editWaitlistEstimatedTime.pending && editWaitlistEstimatedTime.result?.success
					? 'btn-success'
					: 'btn-primary'}">Save</button
			>
		</form>

		<div class="flex flex-row items-end justify-between">
			<h2 class="mt-4 text-xl font-semibold">Wait Listed Students</h2>
			<form class="my-2 flex flex-row gap-2" {...addUserToWaitlist}>
				<input type="text" name="waitlistId" value={data.id} hidden />
				<select class="select" required name="userId">
					{#await getAllControllers()}
						<option disabled selected>Loading Controllers...</option>
					{:then controllers}
						{#await getEnrolledWaitlistEntries(data.id)}
							<option disabled selected>Loading Controllers...</option>
						{:then enrolledEntries}
							<option disabled selected>Select a Student</option>
							{#each controllers.filter((c) => !waitlist.students.some((s) => s.cid === c.cid) && !enrolledEntries.some((e) => e.cid === c.cid)) as controller (controller.cid)}
								<option value={controller.cid}>
									{controller.name_full} ({controller.cid})
								</option>
							{/each}
						{/await}
					{/await}
				</select>
				<button class="btn btn-primary me-auto"><UserPlus /></button>
			</form>
		</div>
		<div class="divider my-0"></div>
		{#if waitlist.students.length === 0}
			<p>No students on this waitlist</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each waitlist.students as student, index (student.cid)}
					<div class="card bg-base-200 shadow-sm">
						<div class="card-body flex-row">
							<div class="flex flex-row items-center justify-center">
								<div class="m-0 p-0 text-lg">{index + 1}</div>
								<div class="flex-col gap-2">
									{#if index > 0}
										<div>
											<button
												onclickcapture={() =>
													moveUserUp({ userId: student.cid, waitlistId: data.id }).updates(
														getWaitlist(data.id).withOverride((waitlist) => {
															[waitlist.students[index], waitlist.students[index - 1]] = [
																{ ...waitlist.students[index - 1], position: index },
																{ ...waitlist.students[index], position: index - 1 }
															];
															return waitlist;
														})
													)}
												class="btn btn-xs btn-ghost btn-primary"><ArrowUp /></button
											>
										</div>
									{/if}
									{#if index + 1 < waitlist.students.length}
										<div>
											<button
												onclickcapture={() =>
													moveUserDown({ userId: student.cid, waitlistId: data.id }).updates(
														getWaitlist(data.id).withOverride((waitlist) => {
															[waitlist.students[index], waitlist.students[index + 1]] = [
																{ ...waitlist.students[index + 1], position: index },
																{ ...waitlist.students[index], position: index + 1 }
															];
															return waitlist;
														})
													)}
												class="btn btn-xs btn-ghost btn-primary"><ArrowDown /></button
											>
										</div>
									{/if}
								</div>
							</div>
							<div class="flex-col gap-2">
								<h2 class="card-title">{student.user.name_full} ({student.cid})</h2>
								<p>Waiting Since: {student.waitingSince.toUTCString().replace(' GMT', 'z')}</p>
							</div>
							<div class="ms-auto flex flex-col gap-2">
								<button class="tooltip tooltip-left" data-tip="Remove From Wait List">
									<Trash
										onclickcapture={() =>
											removeUserFromWaitlist({ userId: student.cid, waitlistId: data.id }).updates(
												getWaitlist(data.id).withOverride((waitlist) => {
													waitlist.students = waitlist.students.filter(
														(s) => s.cid !== student.cid
													);
													return waitlist;
												})
											)}
										class="hover:text-error transition-colors"
									/>
								</button>
								<button class="tooltip tooltip-left" data-tip="Enrol Student">
									<SquareCheck
										onclickcapture={() =>
											enrolUserFromWaitlist({ userId: student.cid, waitlistId: data.id }).updates(
												getWaitlist(data.id).withOverride((waitlist) => {
													waitlist.students = waitlist.students.filter(
														(s) => s.cid !== student.cid
													);
													return waitlist;
												}),
												getEnrolledWaitlistEntries(data.id).withOverride((enrolled) => {
													const nextId =
														enrolled && enrolled.length
															? Math.max(...enrolled.map((e) => e.id)) + 1
															: 1;
													return [
														...enrolled,
														{
															id: nextId,
															cid: student.cid,
															user: student.user,
															enrolledAt: new Date(),
															waitlistId: data.id,
															hiddenAt: null
														}
													];
												})
											)}
										class="hover:text-success transition-colors"
									/>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div>
			<h2 class="mt-8 text-xl font-semibold">Enrolled Students</h2>
			<div class="divider my-0"></div>
			{#await getEnrolledWaitlistEntries(data.id)}
				<p>Loading Enrolled Students...</p>
			{:then enrolledEntries}
				{#if enrolledEntries.length === 0}
					<p>No students currently enrolled in this course.</p>
				{:else}
					{#each enrolledEntries as student (student.cid)}
						<div class="card bg-base-200 mb-2 shadow-sm">
							<div class="card-body flex-row items-center">
								<h2 class="card-title">{student.user.name_full} ({student.cid})</h2>
								<p class="ms-auto">
									Enrolled On: {student.enrolledAt.toUTCString().replace(' GMT', 'z')}
								</p>
								<div class="ms-auto flex flex-col gap-2">
									<button class="tooltip tooltip-left" data-tip="Unenrol Student">
										<Trash
											onclickcapture={() =>
												removeUserFromEnrolledCourse({
													userId: student.cid,
													waitlistId: data.id
												}).updates(
													getEnrolledWaitlistEntries(data.id).withOverride((enrolled) =>
														enrolled.filter((e) => e.cid !== student.cid)
													)
												)}
											class="hover:text-error transition-colors"
										/>
									</button>
									<button class="tooltip tooltip-left" data-tip="Course Completed">
										<SquareCheck
											onclickcapture={() =>
												hideUserFromEnrolledCourse({
													userId: student.cid,
													waitlistId: data.id
												}).updates(
													getEnrolledWaitlistEntries(data.id).withOverride((enrolled) =>
														enrolled.filter((e) => e.cid !== student.cid)
													)
												)}
											class="hover:text-success transition-colors"
										/>
									</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			{/await}
		</div>
	{:catch error}
		<p class="text-error">Error loading waitlist: {error.message}</p>
	{/await}
</section>
