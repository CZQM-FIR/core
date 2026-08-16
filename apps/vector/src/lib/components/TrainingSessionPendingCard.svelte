<script lang="ts">
	import {
		cancelTrainingSession as cancelTrainingSessionAsStudent,
		confirmTrainingSession,
		declineTrainingSession
	} from '$lib/remote/student.remote';
	import { cancelTrainingSession as cancelTrainingSessionAsStaff } from '$lib/remote/instructor.remote';
	import type { TrainingSessionSummary } from '@czqm/common';

	let {
		courseId,
		taskId,
		session,
		showStudentActions = false,
		showCancel = false,
		cancelAs = 'student',
		studentCid,
		href = null,
		heading = '',
		subheading = ''
	}: {
		courseId: string;
		taskId: number;
		session: TrainingSessionSummary;
		showStudentActions?: boolean;
		showCancel?: boolean;
		cancelAs?: 'student' | 'staff';
		studentCid?: number;
		href?: string | null;
		heading?: string;
		subheading?: string;
	} = $props();

	let confirming = $state(false);
	let declining = $state(false);
	let cancelling = $state(false);
	let actionError = $state<string | null>(null);
	let cancelError = $state<string | null>(null);
	let cancelDialog = $state<HTMLDialogElement | null>(null);

	const canCancel = $derived(
		showCancel &&
			(cancelAs === 'staff'
				? session.status === 'pending' || session.status === 'confirmed'
				: session.status === 'confirmed')
	);

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

	const sessionRangeLabel = $derived(formatSessionRange(session.startsAt, session.endsAt));
	const startsInLabel = $derived(formatStartsIn(session.startsAt));

	function formatStartsIn(startsAt: Date, now = new Date()): string | null {
		const ms = startsAt.getTime() - now.getTime();
		if (ms <= 0) return null;

		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });
		const minutes = ms / 60_000;
		if (minutes < 1) return `Starts ${rtf.format(1, 'minute')}`;
		if (minutes < 60) return `Starts ${rtf.format(Math.round(minutes), 'minute')}`;

		const hours = minutes / 60;
		if (hours < 24) return `Starts ${rtf.format(Math.max(1, Math.round(hours)), 'hour')}`;

		return `Starts ${rtf.format(Math.max(1, Math.round(hours / 24)), 'day')}`;
	}

	function statusLabel(status: TrainingSessionSummary['status']): string {
		switch (status) {
			case 'pending':
				return showStudentActions ? 'Awaiting your confirmation' : 'Awaiting student confirmation';
			case 'confirmed':
				return 'Confirmed';
			case 'declined':
				return 'Declined';
			case 'cancelled':
				return 'Cancelled';
		}
	}

	function formatScheduledBy(session: TrainingSessionSummary): string | null {
		if (!session.scheduledByName) return null;
		const role = session.scheduledByRole ? ` (${session.scheduledByRole})` : '';
		return `Scheduled by ${session.scheduledByName}${role}`;
	}

	const scheduledByLabel = $derived(formatScheduledBy(session));

	function statusBadgeClass(status: TrainingSessionSummary['status']): string {
		switch (status) {
			case 'pending':
				return 'badge-warning';
			case 'confirmed':
				return 'badge-success';
			case 'declined':
				return 'badge-ghost';
			case 'cancelled':
				return 'badge-ghost';
		}
	}

	async function handleConfirm() {
		confirming = true;
		actionError = null;
		try {
			await confirmTrainingSession({ courseId, taskId, sessionId: session.id });
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				actionError = body?.message ?? 'Failed to confirm session';
			} else if (err instanceof Error) {
				actionError = err.message;
			} else {
				actionError = 'Failed to confirm session';
			}
		} finally {
			confirming = false;
		}
	}

	async function handleDecline() {
		declining = true;
		actionError = null;
		try {
			await declineTrainingSession({ courseId, taskId, sessionId: session.id });
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				actionError = body?.message ?? 'Failed to decline session';
			} else if (err instanceof Error) {
				actionError = err.message;
			} else {
				actionError = 'Failed to decline session';
			}
		} finally {
			declining = false;
		}
	}

	async function handleCancel() {
		cancelling = true;
		cancelError = null;
		try {
			if (cancelAs === 'staff') {
				if (studentCid == null) {
					throw new Error('Student CID is required to cancel as staff');
				}
				await cancelTrainingSessionAsStaff({
					courseId,
					studentCid,
					taskId,
					sessionId: session.id
				});
			} else {
				await cancelTrainingSessionAsStudent({ courseId, taskId, sessionId: session.id });
			}
			cancelDialog?.close();
		} catch (err) {
			if (err && typeof err === 'object' && 'body' in err) {
				const body = (err as { body?: { message?: string } }).body;
				cancelError = body?.message ?? 'Failed to cancel session';
			} else if (err instanceof Error) {
				cancelError = err.message;
			} else {
				cancelError = 'Failed to cancel session';
			}
		} finally {
			cancelling = false;
		}
	}

	function openCancelDialog() {
		cancelError = null;
		cancelDialog?.showModal();
	}
</script>

<div
	class={[
		'card card-sm bg-base-200 relative w-full shadow-sm',
		href && 'hover:bg-base-300 cursor-pointer transition-shadow hover:shadow-md'
	]}
>
	{#if href}
		<a {href} class="absolute inset-0 z-10" aria-label={heading ? `View ${heading}` : 'View course'}
		></a>
	{/if}
	<div class="card-body gap-2 p-4">
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div class="min-w-0">
				<h2 class="card-title text-base">{heading || 'Training Session'}</h2>
				{#if subheading}
					<p class="text-sm opacity-70">{subheading}</p>
				{/if}
			</div>
			<span class="badge badge-sm {statusBadgeClass(session.status)}"
				>{statusLabel(session.status)}</span
			>
		</div>

		{#if showStudentActions && session.status === 'pending'}
			<p class="text-sm">
				An instructor or mentor has scheduled a training session; please confirm or decline it as
				soon as possible.
			</p>
		{/if}

		<p class="flex flex-wrap items-baseline gap-x-2 text-sm">
			<span>{formatSessionRange(session.startsAt, session.endsAt)}</span>
			{#if startsInLabel}
				<span class="opacity-70">{startsInLabel}</span>
			{/if}
		</p>

		{#if scheduledByLabel}
			<p class="text-sm opacity-70">{scheduledByLabel}</p>
		{/if}

		{#if session.trainingNote}
			<div class="bg-base-100 rounded-box p-3">
				<p class="text-xs font-semibold uppercase opacity-60">Note from instructor</p>
				<p class="mt-1 text-sm whitespace-pre-wrap">{session.trainingNote}</p>
			</div>
		{/if}

		{#if showStudentActions && session.status === 'pending'}
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="btn btn-primary btn-sm relative z-20"
					disabled={confirming || declining || cancelling}
					onclick={handleConfirm}
				>
					{#if confirming}
						<span class="loading loading-spinner loading-sm"></span>
						Confirming...
					{:else}
						Confirm
					{/if}
				</button>
				<button
					type="button"
					class="btn btn-outline btn-sm relative z-20"
					disabled={confirming || declining || cancelling}
					onclick={handleDecline}
				>
					{#if declining}
						<span class="loading loading-spinner loading-sm"></span>
						Declining...
					{:else}
						Decline
					{/if}
				</button>
			</div>
		{/if}

		{#if canCancel}
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="btn btn-outline btn-error btn-sm relative z-20"
					disabled={confirming || declining || cancelling}
					onclick={openCancelDialog}
				>
					Cancel session
				</button>
			</div>
		{/if}

		{#if actionError}
			<p class="text-error text-sm">{actionError}</p>
		{/if}
	</div>
</div>

<dialog class="modal" bind:this={cancelDialog}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Cancel training session</h3>
		<p class="py-2 text-sm">Are you sure you want to cancel this training session?</p>
		<p class="text-sm opacity-80">{sessionRangeLabel}</p>

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
