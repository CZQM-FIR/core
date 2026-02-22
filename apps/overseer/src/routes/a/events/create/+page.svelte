<script lang="ts">
	import { createEvent } from '$lib/remote/events.remote';
	import { ChevronLeft } from '@lucide/svelte';
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create Event</h1>
		<a href="/a/events" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Events
		</a>
		<div class="divider"></div>

		<form {...createEvent} enctype="multipart/form-data">
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Event Name</legend>
				<input type="text" class="input" name="name" required />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Start</legend>
				<input type="datetime-local" class="input" name="start" required />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">End</legend>
				<input type="datetime-local" class="input" name="end" required />
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
		</form>
	</div>
</section>
