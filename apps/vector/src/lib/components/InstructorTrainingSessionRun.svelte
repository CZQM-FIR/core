<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';
	import { ChevronLeft } from '@lucide/svelte';
	import {
		INSTRUCTOR_NOTES_MAX_LENGTH,
		INSTRUCTOR_NOTES_MIN_LENGTH,
		POSITION_TRAINED_MAX_LENGTH,
		validateSubmittedInstructorNotes,
		validateSubmittedPositionTrained,
		type TrainingSessionStatus
	} from '@czqm/common';
	import TrainingSessionAvailabilityCalendar from '$lib/components/TrainingSessionAvailabilityCalendar.svelte';
	import {
		cancelTrainingSession,
		endTrainingSession,
		getInstructorTrainingSession,
		saveTrainingSessionNotes,
		startTrainingSession,
		submitTrainingSessionNotes,
		unsubmitTrainingSessionNotes
	} from '$lib/remote/instructor.remote';

	type InstructorSession = NonNullable<ReturnType<typeof getInstructorTrainingSession>['current']>;

	let { session }: { session: InstructorSession } = $props();

	let instructorNotes = $state(untrack(() => session.instructorNotes ?? ''));
	let positionTrained = $state(untrack(() => session.positionTrained ?? ''));
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let starting = $state(false);
	let ending = $state(false);
	let cancelling = $state(false);
	let submitting = $state(false);
	let unsubmitting = $state(false);
	let cancelError = $state<string | null>(null);
	let submitError = $state<string | null>(null);
	let unsubmitError = $state<string | null>(null);
	let studentProficient = $state<boolean | null>(null);
	let rescheduleOpen = $state(false);
	let cancelDialog = $state<HTMLDialogElement | null>(null);
	let rescheduleDialog = $state<HTMLDialogElement | null>(null);
	let submitDialog = $state<HTMLDialogElement | null>(null);
	let unsubmitDialog = $state<HTMLDialogElement | null>(null);
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

	const subscribeToNow = createSubscriber((update) => {
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});

	const startsInLabel = $derived.by(() => {
		if (session.status === 'in_progress' || session.status === 'completed') return null;
		const label = formatStartsIn(session.startsAt, new Date());
		if (label) subscribeToNow();
		return label;
	});

	const actionBusy = $derived(starting || ending || cancelling || submitting || unsubmitting);
	const showActions = $derived(
		session.canManage &&
			(session.canCancel ||
				session.canReschedule ||
				session.canStart ||
				session.canEnd ||
				session.canSubmitNotes ||
				session.canUnsubmitNotes)
	);

	onMount(() => {
		return () => {
			if (autosaveTimer) clearTimeout(autosaveTimer);
		};
	});

	function remoteErrorMessage(err: unknown, fallback: string): string {
		if (err && typeof err === 'object' && 'body' in err) {
			const body = (err as { body?: { message?: string } }).body;
			return body?.message ?? fallback;
		}
		if (err instanceof Error) return err.message;
		return fallback;
	}

	function formatDateTime(date: Date): string {
		const dateLabel = date.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		const time = date.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		return `${dateLabel}, ${time}`;
	}

	function formatStartsIn(startsAt: Date | string, now: Date): string | null {
		const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
		const ms = start.getTime() - now.getTime();
		if (ms <= 0) return null;

		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });
		const minutes = ms / 60_000;
		if (minutes < 1) return `Starts in ${Math.max(1, Math.round(ms / 1000))}s`;
		if (minutes < 60) return `Starts in ${Math.round(minutes)} min`;

		const hours = minutes / 60;
		if (hours < 24) {
			const wholeHours = Math.floor(hours);
			const remainMinutes = Math.round(minutes % 60);
			if (remainMinutes === 0) return `Starts in ${wholeHours}h`;
			return `Starts in ${wholeHours}h ${remainMinutes}m`;
		}

		return `Starts ${rtf.format(Math.max(1, Math.round(hours / 24)), 'day')}`;
	}

	function formatSessionRange(startsAt: Date, endsAt: Date): string {
		const dateLabel = startsAt.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		const startTime = startsAt.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		const endTime = endsAt.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		return `${dateLabel}, ${startTime} – ${endTime}`;
	}

	function statusLabel(status: TrainingSessionStatus): string {
		switch (status) {
			case 'pending':
				return 'Awaiting student confirmation';
			case 'confirmed':
				return 'Confirmed';
			case 'declined':
				return 'Declined';
			case 'cancelled':
				return 'Cancelled';
			case 'in_progress':
				return 'In progress';
			case 'completed':
				return 'Completed';
		}
	}

	function statusBadgeClass(status: TrainingSessionStatus): string {
		switch (status) {
			case 'pending':
				return 'badge-warning';
			case 'confirmed':
				return 'badge-success';
			case 'declined':
				return 'badge-ghost';
			case 'cancelled':
				return 'badge-ghost';
			case 'in_progress':
				return 'badge-info';
			case 'completed':
				return 'badge-accent';
		}
	}

	function scheduleAutosave() {
		if (!session.canSaveNotes) return;

		if (saveStatus === 'saved' || saveStatus === 'error') saveStatus = 'idle';
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			void persistNotes();
		}, 750);
	}

	async function persistNotes() {
		if (!session.canSaveNotes) return;

		saveStatus = 'saving';
		saveError = null;
		try {
			await saveTrainingSessionNotes({
				sessionId: session.id,
				instructorNotes,
				positionTrained
			});
			saveStatus = 'saved';
		} catch (err) {
			saveStatus = 'error';
			saveError = remoteErrorMessage(err, 'Failed to save notes');
		}
	}

	async function handleStart() {
		if (!session.canStart) return;

		starting = true;
		actionError = null;
		try {
			await startTrainingSession(session.id);
		} catch (err) {
			actionError = remoteErrorMessage(err, 'Failed to start training session');
		} finally {
			starting = false;
		}
	}

	async function handleEnd() {
		if (!session.canEnd) return;

		ending = true;
		actionError = null;
		try {
			await endTrainingSession(session.id);
		} catch (err) {
			actionError = remoteErrorMessage(err, 'Failed to end training session');
		} finally {
			ending = false;
		}
	}

	function openCancelDialog() {
		cancelError = null;
		cancelDialog?.showModal();
	}

	async function handleCancel() {
		if (!session.canCancel) return;

		cancelling = true;
		cancelError = null;
		try {
			await cancelTrainingSession({
				courseId: session.course.id,
				studentCid: session.student.cid,
				taskId: session.task.taskId,
				sessionId: session.id
			});
			cancelDialog?.close();
		} catch (err) {
			cancelError = remoteErrorMessage(err, 'Failed to cancel session');
		} finally {
			cancelling = false;
		}
	}

	function openRescheduleDialog() {
		rescheduleOpen = true;
		rescheduleDialog?.showModal();
	}

	function closeRescheduleDialog() {
		rescheduleOpen = false;
		rescheduleDialog?.close();
	}

	async function openSubmitDialog() {
		submitError = null;
		studentProficient = null;
		if (autosaveTimer) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
			await persistNotes();
		}
		submitDialog?.showModal();
	}

	async function handleSubmit() {
		if (!session.canSubmitNotes) return;

		submitError = null;
		try {
			validateSubmittedInstructorNotes(instructorNotes);
			validateSubmittedPositionTrained(positionTrained);
		} catch (err) {
			submitError = remoteErrorMessage(err, 'Invalid training note');
			return;
		}

		if (session.askProficiency && studentProficient === null) {
			submitError = 'Please indicate whether the student is proficient';
			return;
		}

		submitting = true;
		try {
			await submitTrainingSessionNotes({
				sessionId: session.id,
				instructorNotes,
				positionTrained,
				...(session.askProficiency ? { studentProficient: studentProficient === true } : {})
			});
			submitDialog?.close();
		} catch (err) {
			submitError = remoteErrorMessage(err, 'Failed to submit training notes');
		} finally {
			submitting = false;
		}
	}

	function openUnsubmitDialog() {
		unsubmitError = null;
		unsubmitDialog?.showModal();
	}

	async function handleUnsubmit() {
		if (!session.canUnsubmitNotes) return;

		unsubmitting = true;
		unsubmitError = null;
		try {
			await unsubmitTrainingSessionNotes(session.id);
			unsubmitDialog?.close();
		} catch (err) {
			unsubmitError = remoteErrorMessage(err, 'Failed to unsubmit training notes');
		} finally {
			unsubmitting = false;
		}
	}
</script>

<a href="/i" class="text-primary hover:link flex flex-row items-center gap-1">
	<ChevronLeft size="15" /> Back to Instructor Dashboard
</a>

<div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
	<div>
		<h1 class="text-3xl font-semibold">{session.course.name}</h1>
		<p class="mt-1 text-sm opacity-80">
			{session.task.sessionTypeLabel} · {session.task.description}
		</p>
	</div>
	<span class="badge {statusBadgeClass(session.status)}">{statusLabel(session.status)}</span>
</div>

{#if showActions}
	<div class="mt-6 flex flex-wrap items-center gap-3">
		{#if session.canStart}
			<button type="button" class="btn btn-primary" disabled={actionBusy} onclick={handleStart}>
				{#if starting}
					<span class="loading loading-spinner loading-sm"></span>
					Starting...
				{:else}
					Start session
				{/if}
			</button>
		{/if}
		{#if session.canEnd}
			<button type="button" class="btn btn-primary" disabled={actionBusy} onclick={handleEnd}>
				{#if ending}
					<span class="loading loading-spinner loading-sm"></span>
					Ending...
				{:else}
					End session
				{/if}
			</button>
		{/if}
		{#if session.canSubmitNotes}
			<button
				type="button"
				class="btn btn-primary"
				disabled={actionBusy}
				onclick={openSubmitDialog}
			>
				Submit training note
			</button>
		{/if}
		{#if session.canUnsubmitNotes}
			<button
				type="button"
				class="btn btn-outline"
				disabled={actionBusy}
				onclick={openUnsubmitDialog}
			>
				Unsubmit to edit
			</button>
		{/if}
		{#if session.canReschedule}
			<button
				type="button"
				class="btn btn-outline"
				disabled={actionBusy}
				onclick={openRescheduleDialog}
			>
				Reschedule
			</button>
		{/if}
		{#if session.canCancel}
			<button
				type="button"
				class="btn btn-outline btn-error"
				disabled={actionBusy}
				onclick={openCancelDialog}
			>
				Cancel
			</button>
		{/if}
	</div>
{/if}

{#if actionError}
	<p class="text-error mt-3 text-sm">{actionError}</p>
{/if}

<div class="card bg-base-200 mt-6 shadow-sm">
	<div class="card-body gap-2">
		<p class="flex flex-wrap items-baseline gap-x-2 text-sm">
			<span>
				<span class="font-medium">Scheduled:</span>
				{formatSessionRange(session.startsAt, session.endsAt)}
			</span>
			{#if startsInLabel}
				<span class="opacity-70">{startsInLabel}</span>
			{/if}
		</p>
		{#if session.actualStartedAt}
			<p class="text-sm">
				<span class="font-medium">Started:</span>
				{formatDateTime(session.actualStartedAt)}
			</p>
		{/if}
		{#if session.actualEndedAt}
			<p class="text-sm">
				<span class="font-medium">Ended:</span>
				{formatDateTime(session.actualEndedAt)}
			</p>
		{/if}
		<p class="text-sm">
			<span class="font-medium">Student:</span>
			<a href={`/i/${session.course.id}/${session.student.cid}`} class="link link-primary">
				{session.student.name}
			</a>
			<span class="opacity-70">CID {session.student.cid}</span>
		</p>
		<p class="text-sm">
			<span class="font-medium">Instructor:</span>
			{session.instructor.name} ({session.instructor.role})
		</p>
		<p class="text-sm">
			<span class="font-medium">Task:</span>
			{session.task.description}
		</p>
		{#if session.trainingNote}
			<div class="bg-base-100 rounded-box mt-1 p-3">
				<p class="text-xs font-semibold uppercase opacity-60">Prep note</p>
				<p class="mt-1 text-sm whitespace-pre-wrap">{session.trainingNote}</p>
			</div>
		{/if}
	</div>
</div>

<div class="card bg-base-200 mt-6 shadow-sm">
	<div class="card-body gap-3">
		<h2 id="training-notes-heading" class="card-title text-lg">Training notes</h2>
		<label class="block w-full max-w-xs">
			<span class="mb-1 block text-sm font-medium">Position trained</span>
			<input
				class="input w-full"
				bind:value={positionTrained}
				oninput={scheduleAutosave}
				disabled={!session.canSaveNotes}
				maxlength={POSITION_TRAINED_MAX_LENGTH}
				list="position-suggestions"
				placeholder="Callsign"
			/>
			<datalist id="position-suggestions">
				{#each session.positionSuggestions as callsign (callsign)}
					<option value={callsign}></option>
				{/each}
			</datalist>
		</label>
		<textarea
			class="textarea min-h-40 w-full"
			bind:value={instructorNotes}
			oninput={scheduleAutosave}
			disabled={!session.canSaveNotes}
			maxlength={INSTRUCTOR_NOTES_MAX_LENGTH}
			aria-labelledby="training-notes-heading"
		></textarea>

		{#if session.canSaveNotes}
			{#if saveStatus === 'saving'}
				<p class="text-sm opacity-70">Saving...</p>
			{:else if saveStatus === 'saved'}
				<p class="text-sm opacity-70">Saved</p>
			{:else if saveStatus === 'error'}
				<p class="text-error text-sm">{saveError}</p>
			{/if}
		{:else if session.notesLocked && session.taskComplete}
			<p class="text-sm opacity-80">The course task was marked complete.</p>
		{:else if session.status === 'cancelled'}
			<p class="text-sm opacity-80">
				This session was cancelled. Training notes were not submitted to VATCAN.
			</p>
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={cancelDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Cancel training session</h3>
		<p class="py-2 text-sm">Are you sure you want to cancel this training session?</p>
		<p class="text-sm opacity-80">{formatSessionRange(session.startsAt, session.endsAt)}</p>
		<p class="mt-2 text-sm opacity-80">
			A training note will not be submitted to VATCAN for a cancelled session.
		</p>

		{#if cancelError}
			<p class="text-error mt-2 text-sm">{cancelError}</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={cancelling}>Keep session</button>
			</form>
			<button type="button" class="btn btn-error" disabled={cancelling} onclick={handleCancel}>
				{#if cancelling}
					<span class="loading loading-spinner loading-sm"></span>
					Cancelling...
				{:else}
					Cancel session
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog
	class="modal"
	bind:this={rescheduleDialog}
	onclose={() => {
		rescheduleOpen = false;
	}}
>
	<div class="modal-box w-11/12 max-w-5xl">
		{#if rescheduleOpen}
			<TrainingSessionAvailabilityCalendar
				mode="reschedule"
				courseId={session.course.id}
				taskId={session.task.taskId}
				cid={session.student.cid}
				sessionId={session.id}
				sessionDescription={session.task.description}
				onComplete={closeRescheduleDialog}
			/>
		{/if}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Close</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog class="modal" bind:this={submitDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Submit training note</h3>
		<p class="py-2 text-sm">
			Submitting will lock these notes and send them to VATCAN. The note must be
			{INSTRUCTOR_NOTES_MIN_LENGTH}–{INSTRUCTOR_NOTES_MAX_LENGTH} characters and a position is required.
		</p>

		{#if session.askProficiency}
			<fieldset class="mt-2">
				<legend class="text-sm font-medium">
					Has the student achieved the proficiency required to move on?
				</legend>
				<div class="mt-2 flex flex-wrap gap-2">
					<button
						type="button"
						class={['btn btn-sm', studentProficient === true ? 'btn-primary' : 'btn-outline']}
						onclick={() => (studentProficient = true)}
					>
						Yes
					</button>
					<button
						type="button"
						class={['btn btn-sm', studentProficient === false ? 'btn-primary' : 'btn-outline']}
						onclick={() => (studentProficient = false)}
					>
						Not yet
					</button>
				</div>
			</fieldset>
		{/if}

		{#if submitError}
			<p class="text-error mt-2 text-sm">{submitError}</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={submitting}>Cancel</button>
			</form>
			<button type="button" class="btn btn-primary" disabled={submitting} onclick={handleSubmit}>
				{#if submitting}
					<span class="loading loading-spinner loading-sm"></span>
					Submitting...
				{:else}
					Submit to VATCAN
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<dialog class="modal" bind:this={unsubmitDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Unsubmit training note</h3>
		<p class="py-2 text-sm">
			Unsubmit this note so you can edit it? It will remain on VATCAN until you submit again.
		</p>
		{#if session.unsubmitUntil}
			<p class="text-sm opacity-80">
				You can edit until {formatDateTime(session.unsubmitUntil)}.
			</p>
		{/if}

		{#if unsubmitError}
			<p class="text-error mt-2 text-sm">{unsubmitError}</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn" disabled={unsubmitting}>Keep locked</button>
			</form>
			<button
				type="button"
				class="btn btn-warning"
				disabled={unsubmitting}
				onclick={handleUnsubmit}
			>
				{#if unsubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					Unsubmitting...
				{:else}
					Unsubmit to edit
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
