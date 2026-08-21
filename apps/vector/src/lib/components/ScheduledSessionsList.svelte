<script lang="ts">
	import {
		formatScheduledSessionTime,
		scheduledSessionStatusLabel,
		type ScheduledSessionDayGroup
	} from '$lib/scheduledSessionOverlay';

	let {
		groups,
		emptyLabel = 'No other sessions scheduled this week.'
	}: {
		groups: ScheduledSessionDayGroup[];
		emptyLabel?: string;
	} = $props();

	function formatDayLabel(day: Date): string {
		return day.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div>
	<h3 class="text-sm font-semibold">Other scheduled sessions</h3>
	{#if groups.length === 0}
		<p class="mt-1 text-sm opacity-70">{emptyLabel}</p>
	{:else}
		<div class="mt-2 flex flex-col gap-3">
			{#each groups as group (group.dayKey)}
				<div>
					<p class="text-xs font-semibold opacity-80">{formatDayLabel(group.day)}</p>
					<ul class="mt-1 flex flex-col gap-1">
						{#each group.sessions as session (session.id)}
							<li class="bg-base-100 rounded-md px-2 py-1.5 text-sm">
								<p class="font-medium">
									{formatScheduledSessionTime(session.startsAt, session.endsAt)}
									<span class="font-normal opacity-80">· {session.sessionTypeLabel}</span>
								</p>
								<p class="text-xs opacity-80">
									{session.studentName} with {session.instructorName}
								</p>
								<p class="text-xs opacity-70">
									{session.courseName} · {scheduledSessionStatusLabel(session.status)}
								</p>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
</div>
