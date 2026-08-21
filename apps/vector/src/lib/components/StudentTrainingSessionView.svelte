<script lang="ts">
	import { createSubscriber } from 'svelte/reactivity';
	import { ChevronLeft } from '@lucide/svelte';
	import type { TrainingSessionStatus } from '@czqm/common';
	import TrainingSessionStudentPrepNote from '$lib/components/TrainingSessionStudentPrepNote.svelte';
	import TrainingPauseBanner from '$lib/components/TrainingPauseBanner.svelte';
	import {
		cancelTrainingSession,
		confirmTrainingSession,
		declineTrainingSession,
		getStudentTrainingSession
	} from '$lib/remote/student.remote';
	import TrainingSessionStudentPostNote from './TrainingSessionStudentPostNote.svelte';

	type StudentSession = NonNullable<ReturnType<typeof getStudentTrainingSession>['current']>;

	let { session }: { session: StudentSession } = $props();

	let confirming = $state(false);
	let declining = $state(false);
	let cancelling = $state(false);
	let actionError = $state<string | null>(null);
	let cancelError = $state<string | null>(null);
	let cancelDialog = $state<HTMLDialogElement | null>(null);

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

	const actionBusy = $derived(confirming || declining || cancelling);
	const showActions = $derived(session.canConfirm || session.canDecline || session.canCancel);
	const showPrepNote = $derived(session.status === 'pending' || session.status === 'confirmed');
	const showPostNote = $derived(session.status === 'completed' && !session.notesSubmitted);

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
				return 'Awaiting your confirmation';
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

	async function handleConfirm() {
		if (!session.canConfirm) return;

		confirming = true;
		actionError = null;
		try {
			await confirmTrainingSession({
				courseId: session.course.id,
				taskId: session.task.taskId,
				sessionId: session.id
			});
		} catch (err) {
			actionError = remoteErrorMessage(err, 'Failed to confirm session');
		} finally {
			confirming = false;
		}
	}

	async function handleDecline() {
		if (!session.canDecline) return;

		declining = true;
		actionError = null;
		try {
			await declineTrainingSession({
				courseId: session.course.id,
				taskId: session.task.taskId,
				sessionId: session.id
			});
		} catch (err) {
			actionError = remoteErrorMessage(err, 'Failed to decline session');
		} finally {
			declining = false;
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
</script>

<a
	href={`/courses/${session.course.id}`}
	class="text-primary hover:link flex flex-row items-center gap-1"
>
	<ChevronLeft size="15" /> Back to course
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

{#if session.pause}
	<div class="mt-4">
		<TrainingPauseBanner
			pausedAt={session.pause.pausedAt}
			pauseReason={session.pause.pauseReason}
		/>
	</div>
{/if}

{#if session.canConfirm}
	<p class="mt-4 text-sm">
		An instructor or mentor has scheduled a training session; please confirm or decline it as soon
		as possible.
	</p>
{/if}

{#if showActions}
	<div class="mt-6 flex flex-wrap items-center gap-3">
		{#if session.canConfirm}
			<button type="button" class="btn btn-primary" disabled={actionBusy} onclick={handleConfirm}>
				{#if confirming}
					<span class="loading loading-spinner loading-sm"></span>
					Confirming...
				{:else}
					Confirm
				{/if}
			</button>
		{/if}
		{#if session.canDecline}
			<button type="button" class="btn btn-outline" disabled={actionBusy} onclick={handleDecline}>
				{#if declining}
					<span class="loading loading-spinner loading-sm"></span>
					Declining...
				{:else}
					Decline
				{/if}
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
			<span class="font-medium">Instructor:</span>
			{session.instructor.name} ({session.instructor.role})
		</p>
		<p class="text-sm">
			<span class="font-medium">Task:</span>
			{session.task.description}
		</p>
		{#if session.trainingNote}
			<div class="bg-base-100 rounded-box mt-1 p-3">
				<p class="text-xs font-semibold uppercase opacity-60">Note from instructor</p>
				<p class="mt-1 text-sm whitespace-pre-wrap">{session.trainingNote}</p>
			</div>
		{/if}
	</div>
</div>

{#if !session.notesSubmitted && session.objectives.length > 0}
	<div class="card bg-base-200 mt-6 shadow-sm">
		<div class="card-body gap-2">
			<h2 class="card-title text-lg">Session objectives</h2>
			<ul class="list-disc space-y-1 pl-5">
				{#each session.objectives as objective (objective)}
					<li class="text-sm">{objective}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

{#if showPrepNote}
	<div class="mt-6">
		<TrainingSessionStudentPrepNote />
	</div>
{:else if showPostNote}
	<div class="mt-6">
		<TrainingSessionStudentPostNote />
	</div>
{/if}

{#if session.notesSubmitted}
	<div class="card bg-base-200 mt-6 shadow-sm">
		<div class="card-body gap-3">
			<h2 class="card-title text-lg">Training notes</h2>
			{#if session.positionTrained}
				<p class="text-sm">
					<span class="font-medium">Position trained:</span>
					{session.positionTrained}
				</p>
			{/if}
			{#if session.instructorNotes}
				<p class="text-sm whitespace-pre-wrap">{session.instructorNotes}</p>
			{/if}
			{#if session.objectiveResults.length > 0}
				<div>
					<p class="text-sm font-medium">Objectives</p>
					<ul class="mt-1 flex flex-col gap-1">
						{#each session.objectiveResults as result (result.text)}
							<li class="text-sm">
								<span class="font-medium">{result.achieved ? 'Achieved' : 'Not yet'}:</span>
								{result.text}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
{/if}

<dialog class="modal" bind:this={cancelDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Cancel training session</h3>
		<p class="py-2 text-sm">Are you sure you want to cancel this training session?</p>
		<p class="text-sm opacity-80">{formatSessionRange(session.startsAt, session.endsAt)}</p>

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
