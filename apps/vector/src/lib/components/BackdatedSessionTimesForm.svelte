<script lang="ts">
	import { untrack } from 'svelte';
	import {
		BACKDATED_SESSION_MAX_DAYS,
		fromDatetimeLocalValue,
		SLOT_MINUTES,
		toDatetimeLocalValue,
		validatePastSessionTimeRange
	} from '$lib/trainingSessionAvailability';

	let {
		initialStartsAt = null,
		initialEndsAt = null,
		submitLabel,
		disabled = false,
		onSubmit
	}: {
		initialStartsAt?: Date | string | null;
		initialEndsAt?: Date | string | null;
		submitLabel: string;
		disabled?: boolean;
		onSubmit: (startsAt: Date, endsAt: Date) => Promise<void>;
	} = $props();

	function toInitialValue(value: Date | string | null | undefined): string {
		if (value == null || value === '') return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return toDatetimeLocalValue(date);
	}

	let startsAtValue = $state(untrack(() => toInitialValue(initialStartsAt)));
	let endsAtValue = $state(untrack(() => toInitialValue(initialEndsAt)));
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const formDisabled = $derived(disabled || submitting);

	function remoteErrorMessage(err: unknown, fallback: string): string {
		if (err && typeof err === 'object' && 'body' in err) {
			const body = (err as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		if (err instanceof Error && err.message) return err.message;
		return fallback;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (formDisabled) return;

		error = null;
		const startsAt = fromDatetimeLocalValue(startsAtValue);
		const endsAt = fromDatetimeLocalValue(endsAtValue);

		try {
			validatePastSessionTimeRange(startsAt, endsAt);
		} catch (err) {
			error = remoteErrorMessage(err, 'Invalid session time range');
			return;
		}

		submitting = true;
		try {
			await onSubmit(startsAt, endsAt);
		} catch (err) {
			error = remoteErrorMessage(err, 'Failed to save past session times');
		} finally {
			submitting = false;
		}
	}
</script>

<form class="flex flex-col gap-3" onsubmit={handleSubmit}>
	<p class="text-sm opacity-70">
		End must be now or earlier, start within the last {BACKDATED_SESSION_MAX_DAYS} days, and duration
		a multiple of {SLOT_MINUTES} minutes.
	</p>

	<label class="form-control w-full max-w-xs">
		<span class="label">
			<span class="label-text">Actual start</span>
		</span>
		<input
			type="datetime-local"
			class="input w-full"
			bind:value={startsAtValue}
			disabled={formDisabled}
			required
		/>
	</label>

	<label class="form-control w-full max-w-xs">
		<span class="label">
			<span class="label-text">Actual end</span>
		</span>
		<input
			type="datetime-local"
			class="input w-full"
			bind:value={endsAtValue}
			disabled={formDisabled}
			required
		/>
	</label>

	{#if error}
		<p class="text-error text-sm">{error}</p>
	{/if}

	<div>
		<button type="submit" class="btn btn-primary" disabled={formDisabled}>
			{#if submitting}
				<span class="loading loading-spinner loading-sm"></span>
				Saving...
			{:else}
				{submitLabel}
			{/if}
		</button>
	</div>
</form>
