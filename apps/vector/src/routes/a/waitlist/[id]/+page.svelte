<script lang="ts">
	import type { PageData } from './$types';
	import { Trash, SquareCheck, ArrowUp, ArrowDown, UserPlus } from '@lucide/svelte';
	import {
		getWaitlist,
		moveUserUp,
		moveUserDown,
		removeUserFromWaitlist,
		addUserToWaitlist,
		enrolUserFromWaitlist,
		editWaitlistEstimatedTime
	} from '$lib/remote/waitlist.remote';
	import { getAllControllers } from '$lib/remote/users.remote';

	let { data }: { data: PageData } = $props();
</script>

<section class="container mx-auto py-5">
	{#await getWaitlist(data.id)}
		<h1 class="text-3xl font-semibold">Wait List</h1>
		<p class="text-primary hover:link"><a href="/a/waitlist">&lt; Back to Waitlists</a></p>
		<p>Loading Wait List...</p>
	{:then waitlist}
		<h1 class="text-3xl font-semibold">{waitlist ? waitlist.name : ''} Wait List</h1>
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
			<h2 class="mt-4 text-xl font-semibold">Students</h2>
			<form class="my-2 flex flex-row gap-2" {...addUserToWaitlist}>
				<input type="text" name="waitlistId" value={data.id} hidden />
				<select class="select" required name="userId">
					{#await getAllControllers()}
						<option disabled selected>Loading Controllers...</option>
					{:then controllers}
						<option disabled selected>Select a Student</option>
						{#each controllers.filter((c) => !waitlist.students.some((s) => s.cid === c.cid)) as controller}
							<option value={controller.cid}>
								{controller.name_full} ({controller.cid})
							</option>
						{/each}
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
				{#each waitlist.students as student, index}
					<div class="card bg-base-200 shadow-sm">
						<div class="card-body flex-row">
							<div class="flex flex-row items-center justify-center">
								<div class="m-0 p-0 text-lg">{index + 1}</div>
								<div class="flex-col gap-2">
									{#if index > 0}
										<div>
											<button
												onclickcapture={() =>
													moveUserUp({ userId: student.cid, waitlistId: data.id })}
												class="btn btn-xs btn-ghost btn-primary"><ArrowUp /></button
											>
										</div>
									{/if}
									{#if index + 1 < waitlist.students.length}
										<div>
											<button
												onclickcapture={() =>
													moveUserDown({ userId: student.cid, waitlistId: data.id })}
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
										onclick={() =>
											removeUserFromWaitlist({ userId: student.cid, waitlistId: data.id })}
										class="hover:text-error transition-colors"
									/>
								</button>
								<button class="tooltip tooltip-left" data-tip="Enrol Student">
									<SquareCheck
										onclick={() =>
											enrolUserFromWaitlist({ userId: student.cid, waitlistId: data.id })}
										class="hover:text-success transition-colors"
									/>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:catch error}
		<p class="text-error">Error loading waitlist: {error.message}</p>
	{/await}
</section>
