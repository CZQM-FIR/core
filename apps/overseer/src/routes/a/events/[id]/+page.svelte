<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';

	let { data, form }: PageProps = $props();

	let event = $derived(data.event);

	// svelte-ignore state_referenced_locally
	let start = $state(event.start.toISOString().slice(0, 16));
	// svelte-ignore state_referenced_locally
	let end = $state(event.end.toISOString().slice(0, 16));

	onMount(() => {
		start = event.start.toISOString().slice(0, 16);
		end = event.end.toISOString().slice(0, 16);
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Edit {event.name}</h1>
		<div class="divider"></div>

		<form method="POST" enctype="multipart/form-data">
			<input type="hidden" name="id" value={event.id} />

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Event Name</legend>
				<input type="text" class="input" name="name" required value={event.name} />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Start</legend>
				<input type="datetime-local" class="input" name="start-input" bind:value={start} required />
				<input type="hidden" name="start" value={new Date(start + ':00Z').toUTCString()} />
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
				<input type="hidden" name="end" value={end ? new Date(end + ':00Z').toUTCString() : ''} />
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
				<textarea name="description" class="textarea h-36 w-120" required value={event.description}
				></textarea>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Event Image</legend>
				<input type="file" class="file-input" name="image" accept="image/*" />
			</fieldset>

			<div class="mt-3 flex flex-row items-center gap-3">
				<input type="checkbox" name="recurring" checked={event.recurring} class="checkbox" />
				<p>Recurring Event</p>
			</div>

			<button type="submit" class="btn btn-primary mt-6">Edit Event</button>
		</form>
		<p>{form?.message}</p>
	</div>
</section>
