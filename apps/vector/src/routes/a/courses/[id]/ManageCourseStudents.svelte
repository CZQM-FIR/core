<script lang="ts">
	import { Trash, SquareCheck, ArrowUp, ArrowDown, Undo2 } from '@lucide/svelte';
	import AddUserToWaitlistForm from '$lib/components/AddUserToWaitlistForm.svelte';
	import StudentCourseLink from '$lib/components/StudentCourseLink.svelte';
	import {
		getWaitlist,
		moveUserUp,
		moveUserDown,
		removeUserFromWaitlist,
		enrolUserFromWaitlist,
		getEnrolledWaitlistEntries,
		getCompletedWaitlistEntries,
		removeUserFromEnrolledCourse,
		removeUserFromCompletedCourse,
		returnEnrolledUserToWaitlist,
		graduateUserFromCourse
	} from '$lib/remote/waitlist.remote';

	let { courseId, waitlistId }: { courseId: string; waitlistId: number } = $props();

	let waitlistSearch = $state('');
	let enrolledSearch = $state('');
	let completedSearch = $state('');

	let deleteCompletionModal: HTMLDialogElement | undefined;
	let studentToRemoveFromCompleted = $state<{ cid: number; name: string } | null>(null);

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

	function openDeleteCompletionModal(cid: number, name: string) {
		studentToRemoveFromCompleted = { cid, name };
		deleteCompletionModal?.showModal();
	}

	async function confirmRemoveCompletion() {
		if (!studentToRemoveFromCompleted) return;

		const { cid } = studentToRemoveFromCompleted;
		await removeUserFromCompletedCourse({ userId: cid, waitlistId }).updates(
			getCompletedWaitlistEntries(waitlistId).withOverride((completed) =>
				completed.filter((e) => e.cid !== cid)
			)
		);
		deleteCompletionModal?.close();
		studentToRemoveFromCompleted = null;
	}
</script>

{#await getWaitlist(waitlistId)}
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg">Students</h2>
			<p>Loading students...</p>
		</div>
	</div>
{:then waitlist}
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- Waiting column -->
		<div class="card bg-base-200 h-full shadow-sm">
			<div class="card-body flex flex-col">
				<div class="flex flex-col gap-2">
					<h2 class="card-title text-lg">Waitlisted</h2>
					<AddUserToWaitlistForm
						{waitlistId}
						waitlistedCids={waitlist.students.map((student) => student.cid)}
					/>
					{#if waitlist.students.length > 0}
						<input
							type="search"
							class="input input-sm input-bordered w-full"
							placeholder="Search waitlisted..."
							bind:value={waitlistSearch}
						/>
					{/if}
				</div>

				{#if waitlist.students.length === 0}
					<p class="text-sm">No students on this waitlist</p>
				{:else if filterStudents(waitlist.students, waitlistSearch).length === 0}
					<p class="text-sm">No students match your search.</p>
				{:else}
					<div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
						{#each filterStudents(waitlist.students, waitlistSearch) as student (student.cid)}
							{@const index = waitlist.students.findIndex((s) => s.cid === student.cid)}
							<div class="card bg-base-100 shadow-sm">
								<div class="card-body flex flex-col gap-2 p-3">
									<div class="flex flex-row items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<StudentCourseLink
												{courseId}
												cid={student.cid}
												nameFull={student.user.name_full}
											/>
											<p class="text-xs opacity-70">
												Waiting since {student.waitingSince.toUTCString().replace(' GMT', 'z')}
											</p>
										</div>
										<span class="text-sm font-semibold opacity-50">{student.position + 1}</span>
									</div>

									<div class="flex flex-row items-center justify-between">
										<div class="flex flex-row gap-1">
											{#if student.position > 0}
												<button
													onclickcapture={() =>
														moveUserUp({ userId: student.cid, waitlistId }).updates(
															getWaitlist(waitlistId).withOverride((wl) => {
																[wl.students[index], wl.students[index - 1]] = [
																	{ ...wl.students[index - 1], position: index },
																	{ ...wl.students[index], position: index - 1 }
																];
																return wl;
															})
														)}
													class="btn btn-xs btn-ghost btn-primary"
												>
													<ArrowUp size="14" />
												</button>
											{/if}
											{#if student.position < waitlist.students.length - 1}
												<button
													onclickcapture={() =>
														moveUserDown({ userId: student.cid, waitlistId }).updates(
															getWaitlist(waitlistId).withOverride((wl) => {
																[wl.students[index], wl.students[index + 1]] = [
																	{ ...wl.students[index + 1], position: index },
																	{ ...wl.students[index], position: index + 1 }
																];
																return wl;
															})
														)}
													class="btn btn-xs btn-ghost btn-primary"
												>
													<ArrowDown size="14" />
												</button>
											{/if}
										</div>
										<div class="flex flex-row gap-2">
											<button class="tooltip tooltip-left" data-tip="Remove From Wait List">
												<Trash
													onclickcapture={() =>
														removeUserFromWaitlist({ userId: student.cid, waitlistId }).updates(
															getWaitlist(waitlistId).withOverride((wl) => {
																wl.students = wl.students.filter((s) => s.cid !== student.cid);
																return wl;
															})
														)}
													class="hover:text-error transition-colors"
													size="16"
												/>
											</button>
											<button class="tooltip tooltip-left" data-tip="Enrol Student">
												<SquareCheck
													onclickcapture={() =>
														enrolUserFromWaitlist({ userId: student.cid, waitlistId }).updates(
															getWaitlist(waitlistId).withOverride((wl) => {
																wl.students = wl.students.filter((s) => s.cid !== student.cid);
																return wl;
															}),
															getEnrolledWaitlistEntries(waitlistId).withOverride((enrolled) => {
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
																		waitlistId,
																		hiddenAt: null,
																		pausedAt: null,
																		pauseReason: null,
																		pausedByCid: null
																	}
																];
															})
														)}
													class="hover:text-success transition-colors"
													size="16"
												/>
											</button>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Enrolled column -->
		<div class="card bg-base-200 h-full shadow-sm">
			<div class="card-body flex flex-col">
				<h2 class="card-title text-lg">Enrolled</h2>

				{#await getEnrolledWaitlistEntries(waitlistId)}
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
						<p class="text-sm">No students currently enrolled in this course.</p>
					{:else if filterStudents(enrolledEntries, enrolledSearch).length === 0}
						<p class="text-sm">No students match your search.</p>
					{:else}
						<div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
							{#each filterStudents(enrolledEntries, enrolledSearch) as student (student.cid)}
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body flex flex-col gap-2 p-3">
										<div class="min-w-0">
											<StudentCourseLink
												{courseId}
												cid={student.cid}
												nameFull={student.user.name_full}
											/>
											<p class="text-xs opacity-70">
												Enrolled {student.enrolledAt.toUTCString().replace(' GMT', 'z')}
											</p>
											{#if student.pausedAt}
												<p class="text-warning mt-1 text-xs font-medium">Paused</p>
												<p class="text-xs whitespace-pre-wrap opacity-80">{student.pauseReason}</p>
											{/if}
										</div>
										<div class="flex flex-row justify-end gap-2">
											<button class="tooltip tooltip-left" data-tip="Move back to waitlist">
												<Undo2
													onclickcapture={() =>
														returnEnrolledUserToWaitlist({
															userId: student.cid,
															waitlistId
														}).updates(
															getEnrolledWaitlistEntries(waitlistId).withOverride((enrolled) =>
																enrolled.filter((e) => e.cid !== student.cid)
															),
															getWaitlist(waitlistId).withOverride((wl) => {
																const nextId =
																	wl.students.length > 0
																		? Math.max(...wl.students.map((s) => s.id)) + 1
																		: 1;
																return {
																	...wl,
																	students: [
																		...wl.students,
																		{
																			id: nextId,
																			cid: student.cid,
																			user: student.user,
																			waitlistId,
																			position: wl.students.length,
																			waitingSince: new Date()
																		}
																	]
																};
															})
														)}
													class="hover:text-warning transition-colors"
													size="16"
												/>
											</button>
											<button class="tooltip tooltip-left" data-tip="Unenrol Student">
												<Trash
													onclickcapture={() =>
														removeUserFromEnrolledCourse({
															userId: student.cid,
															waitlistId
														}).updates(
															getEnrolledWaitlistEntries(waitlistId).withOverride((enrolled) =>
																enrolled.filter((e) => e.cid !== student.cid)
															)
														)}
													class="hover:text-error transition-colors"
													size="16"
												/>
											</button>
											{#if !student.pausedAt}
												<button class="tooltip tooltip-left" data-tip="Graduate Student">
													<SquareCheck
														onclickcapture={() =>
															graduateUserFromCourse({
																userId: student.cid,
																waitlistId
															}).updates(
																getEnrolledWaitlistEntries(waitlistId).withOverride((enrolled) =>
																	enrolled.filter((e) => e.cid !== student.cid)
																),
																getCompletedWaitlistEntries(waitlistId).withOverride(
																	(completed) => {
																		const nextId =
																			completed && completed.length
																				? Math.max(...completed.map((e) => e.id)) + 1
																				: 1;
																		return [
																			{
																				id: nextId,
																				cid: student.cid,
																				user: student.user,
																				waitlistId,
																				completedAt: new Date()
																			},
																			...(completed ?? [])
																		];
																	}
																)
															)}
														class="hover:text-success transition-colors"
														size="16"
													/>
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/await}
			</div>
		</div>

		<!-- Completed column -->
		<div class="card bg-base-200 h-full shadow-sm">
			<div class="card-body flex flex-col">
				<h2 class="card-title text-lg">Completed</h2>

				{#await getCompletedWaitlistEntries(waitlistId)}
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
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body flex flex-col gap-2 p-3">
										<div class="min-w-0">
											<StudentCourseLink
												{courseId}
												cid={student.cid}
												nameFull={student.user.name_full}
											/>
											<p class="text-xs opacity-70">
												Completed {student.completedAt.toUTCString().replace(' GMT', 'z')}
											</p>
										</div>
										<div class="flex flex-row justify-end">
											<button class="tooltip tooltip-left" data-tip="Remove completion record">
												<Trash
													onclickcapture={() =>
														openDeleteCompletionModal(student.cid, student.user.name_full)}
													class="hover:text-error transition-colors"
													size="16"
												/>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/await}
			</div>
		</div>
	</div>
{:catch error}
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<p class="text-error">Error loading students: {error.message}</p>
		</div>
	</div>
{/await}

<dialog class="modal" bind:this={deleteCompletionModal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Remove completion record?</h3>
		{#if studentToRemoveFromCompleted}
			<p class="py-2">
				Are you sure you want to remove the completion record for
				<span class="font-semibold">{studentToRemoveFromCompleted.name}</span>
				({studentToRemoveFromCompleted.cid})?
			</p>
		{/if}
		<p class="text-warning text-sm">
			This permanently deletes their completion record and all task progress for this course. This
			action cannot be undone.
		</p>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={!!removeUserFromCompletedCourse.pending}>Cancel</button>
			</form>
			<button
				class="btn btn-error"
				disabled={!!removeUserFromCompletedCourse.pending}
				aria-busy={!!removeUserFromCompletedCourse.pending}
				onclick={confirmRemoveCompletion}
			>
				{#if removeUserFromCompletedCourse.pending}
					<span class="loading loading-spinner loading-sm"></span>
					Removing...
				{:else}
					Remove
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
