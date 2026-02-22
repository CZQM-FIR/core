<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import { getEvent, updateEvent } from '$lib/remote/events.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section>
	{#await getEvent(data.id)}
		<div class="container mx-auto">
			<h1 class="pt-6 text-2xl font-semibold">Loading event...</h1>
		</div>
	{:then event}
		<div class="container mx-auto">
			<h1 class="pt-6 text-2xl font-semibold">Edit {event.name}</h1>
			<a href="/a/events" class="text-primary hover:link flex flex-row items-center gap-1">
				<ChevronLeft size="15" /> Back to Events
			</a>
			<div class="divider mt-0"></div>

			<form {...updateEvent} enctype="multipart/form-data">
				<input type="hidden" name="id" value={event.id} />

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Event Name</legend>
					<input type="text" class="input" name="name" required value={event.name} />
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Start</legend>
					<input
						type="datetime-local"
						class="input"
						name="start"
						required
						value={event.start.toISOString().slice(0, 16)}
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">End</legend>
					<input
						type="datetime-local"
						class="input"
						name="end"
						required
						value={event.end.toISOString().slice(0, 16)}
					/>
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
					<textarea
						name="description"
						class="textarea h-36 w-120"
						required
						value={event.description}
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
			<p>{updateEvent.result?.message}</p>
		</div>
	{:catch err}
		<div class="container mx-auto">
			<p class="text-error mt-6">{err.message ?? 'Failed to load event.'}</p>
		</div>
	{/await}
</section>
