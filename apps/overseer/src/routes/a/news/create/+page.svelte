<script lang="ts">
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { form }: PageProps = $props();

	onMount(() => {
		if (form && form.status === 200) {
			goto('/a/news');
		}
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create News Article</h1>
		<div class="divider"></div>

		<form method="POST" enctype="multipart/form-data">
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Article Title</legend>
				<input type="text" class="input" name="title" required />
			</fieldset>

			<div class="mt-2 flex flex-row gap-2">
				<input type="checkbox" class="checkbox" name="anonymous" />
				<span>Publish Anonymously</span>
			</div>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Article Image</legend>
				<input type="file" class="file-input" name="image" accept="image/*" />
				<p class="label">Optional</p>
			</fieldset>

			<fieldset class="fieldset">
				<div class="flex flex-row justify-baseline gap-2">
					<legend class="fieldset-legend">Article Text</legend>
					<p class="label ms-75">Supports Markdown</p>
				</div>
				<textarea name="text" class="textarea h-36 w-120" required></textarea>
			</fieldset>

			<button type="submit" class="btn btn-primary mt-6">Publish Article</button>
		</form>
	</div>
</section>
