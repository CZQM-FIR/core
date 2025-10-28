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

	let imageError: string = $state('');

	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			imageError = '';
			return;
		}

		// Check file size (10MB = 10 * 1024 * 1024 bytes)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			imageError = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit.`;
			input.value = '';
			return;
		}

		// Check file type
		if (!file.type.startsWith('image/')) {
			imageError = 'Please upload a valid image file.';
			input.value = '';
			return;
		}

		imageError = '';
	}
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create News Article</h1>
		<div class="divider"></div>

		{#if form && form.status !== 200}
			<div role="alert" class="alert alert-error mb-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<h3 class="font-bold">Error</h3>
					<div class="text-xs">{form.message}</div>
				</div>
			</div>
		{/if}

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
				<input
					type="file"
					class="file-input"
					name="image"
					accept="image/*"
					onchange={handleImageChange}
				/>
				<p class="label">Optional - Maximum file size: 10MB</p>
				{#if imageError}
					<p class="text-error mt-1 text-sm">{imageError}</p>
				{/if}
			</fieldset>

			<fieldset class="fieldset">
				<div class="flex flex-row justify-baseline gap-2">
					<legend class="fieldset-legend">Article Text</legend>
					<a
						href="https://www.markdownguide.org/"
						class="label ms-75 hover:underline"
						target="_blank">Supports Markdown</a
					>
				</div>
				<textarea name="text" class="textarea h-36 w-120" required></textarea>
			</fieldset>

			<button type="submit" class="btn btn-primary mt-6" disabled={!!imageError}
				>Publish Article</button
			>
		</form>
	</div>
</section>
