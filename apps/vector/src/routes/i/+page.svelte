<script lang="ts">
	import { createSubscriber } from 'svelte/reactivity';
	import type { TrainingSessionStatus } from '@czqm/common';
	import {
		getSessionsAwaitingTrainingNotes,
		getUpcomingInstructorSession
	} from '$lib/remote/instructor.remote';

	const upcomingQuery = getUpcomingInstructorSession();
	const notesDueQuery = getSessionsAwaitingTrainingNotes();

	const subscribeToNow = createSubscriber((update) => {
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});

	const startsInLabel = $derived.by(() => {
		const session = upcomingQuery.current;
		if (!session) return null;
		const label = formatStartsIn(session.startsAt, new Date());
		if (label) subscribeToNow();
		return label;
	});

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
</script>

<section class="container mx-auto py-8">
	<h1 class="text-3xl font-semibold">Instructor Dashboard</h1>
	<p class="mt-2 max-w-2xl text-sm opacity-80">
		Review course rosters and student progress across CZQM training courses.
	</p>

	{#if upcomingQuery.error && !upcomingQuery.current}
		<p class="text-error mt-6 text-sm">Failed to load upcoming session.</p>
	{:else if upcomingQuery.current}
		{@const session = upcomingQuery.current}
		<a
			href={`/i/sessions/${session.id}`}
			class="card bg-base-200 mt-8 block shadow-md transition-shadow hover:shadow-lg"
		>
			<div class="card-body gap-2">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div>
						<h2 class="card-title text-lg">Upcoming session</h2>
						{#if startsInLabel}
							<p class="text-sm font-medium">{startsInLabel}</p>
						{/if}
					</div>
					<span class="badge {statusBadgeClass(session.status)}">{statusLabel(session.status)}</span
					>
				</div>
				<p class="text-sm">{session.studentName}</p>
				<p class="text-sm opacity-80">{session.sessionTypeLabel}</p>
				<p class="flex flex-wrap items-baseline gap-x-2 text-sm">
					<span>{formatSessionRange(session.startsAt, session.endsAt)}</span>
					{#if startsInLabel}
						<span class="opacity-70">{startsInLabel}</span>
					{/if}
				</p>
			</div>
		</a>
	{/if}

	{#if notesDueQuery.error && !notesDueQuery.current}
		<p class="text-error mt-6 text-sm">Failed to load sessions awaiting training notes.</p>
	{:else if notesDueQuery.current && notesDueQuery.current.length > 0}
		<div class="mt-8 space-y-3">
			{#each notesDueQuery.current as session (session.id)}
				<a
					href={`/i/sessions/${session.id}`}
					class="card bg-base-200 block shadow-md transition-shadow hover:shadow-lg"
				>
					<div class="card-body gap-2">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<h2 class="card-title text-lg">Training Notes To Be Completed</h2>
							<span class="badge {statusBadgeClass(session.status)}"
								>{statusLabel(session.status)}</span
							>
						</div>
						<p class="text-sm">{session.studentName}</p>
						<p class="text-sm opacity-80">{session.sessionTypeLabel}</p>
						<p class="text-sm">{formatSessionRange(session.startsAt, session.endsAt)}</p>
						<p class="text-sm opacity-70">Submit the training note to VATCAN.</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
		<a href="/i/courses" class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md">
			<div class="card-body">
				<h2 class="card-title text-lg">Courses</h2>
				<p class="text-sm opacity-80">
					Browse courses, view waitlisted and enrolled students, and open individual student
					progress.
				</p>
			</div>
		</a>
		<a href="/i/availability" class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md">
			<div class="card-body">
				<h2 class="card-title text-lg">Session availability</h2>
				<p class="text-sm opacity-80">
					Find students who submitted session availability and match against your free times.
				</p>
			</div>
		</a>
	</div>
</section>
