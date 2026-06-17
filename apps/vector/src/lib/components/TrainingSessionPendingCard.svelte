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
		studentCid
	}: {
		courseId: string;
		taskId: number;
		session: TrainingSessionSummary;
		showStudentActions?: boolean;
		showCancel?: boolean;
		cancelAs?: 'student' | 'staff';
		studentCid?: number;
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
			minute: '2-digit'
		});
		const endTime = endsAt.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
		return `${dateLabel}, ${startTime} – ${endTime}`;
	}

	const sessionRangeLabel = $derived(formatSessionRange(session.startsAt, session.endsAt));

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

<div class="card bg-base-200 w-full shadow-sm">
	<div class="card-body gap-3">
		<div class="flex flex-wrap items-start justify-between gap-2">
			<h2 class="card-title text-lg">Training Session</h2>
			<span class="badge {statusBadgeClass(session.status)}">{statusLabel(session.status)}</span>
		</div>

		{#if showStudentActions && session.status === 'pending'}
			<p class="text-sm">
				An instructor or mentor has scheduled a training session; please confirm or decline it as
				soon as possible.
			</p>
		{/if}

		<p class="text-sm">{formatSessionRange(session.startsAt, session.endsAt)}</p>

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
					class="btn btn-primary btn-sm"
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
					class="btn btn-outline btn-sm"
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
					class="btn btn-outline btn-error btn-sm"
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
