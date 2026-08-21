<script lang="ts">
	let { pausedAt, pauseReason }: { pausedAt: Date; pauseReason: string } = $props();

	const pausedAtLabel = $derived(pausedAt.toUTCString().replace(' GMT', 'z'));
</script>

<div class="alert alert-warning" role="status">
	<div>
		<p class="font-semibold">Training paused</p>
		<p class="text-sm opacity-80">Paused {pausedAtLabel}</p>
		<p class="mt-1 text-sm whitespace-pre-wrap">{pauseReason}</p>
	</div>
</div>
