<script lang="ts">
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { form }: PageProps = $props();

	onMount(() => {
		if (form && form.status === 200) {
			goto('/a/events');
		}
	});

	let start: number = $state(Date.now());
	let end: number | undefined = $state();
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create Event</h1>
		<div class="divider"></div>

		<form method="POST" enctype="multipart/form-data">
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Event Name</legend>
				<input type="text" class="input" name="name" required />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Start</legend>
				<input type="datetime-local" class="input" name="start-input" bind:value={start} required />
				<input type="hidden" name="start" value={new Date(start).toUTCString()} />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">End</legend>
				<input
					type="datetime-local"
					class="input"
					name="end-input"
					min={start}
					bind:value={end}
					required
				/>
				<input type="hidden" name="end" value={end ? new Date(end).toUTCString() : ''} />
			</fieldset>

			<fieldset class="fieldset">
				<div class="flex flex-row justify-baseline gap-2">
					<legend class="fieldset-legend">Event Description</legend>
					<a
						href="https://www.markdownguide.org/"
						class="label ms-75 hover:underline"
						target="_blank">Supports Markdown</a
					>
				</div>
				<textarea name="description" class="textarea h-36 w-120" required></textarea>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Event Image</legend>
				<input type="file" class="file-input" name="image" required accept="image/*" />
			</fieldset>

			<button type="submit" class="btn btn-primary mt-6">Create Event</button>

			{#if form && form.status !== 200}
				<p class="text-sm">{form.message}</p>
			{/if}
		</form>
	</div>
</section>
