<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	if (form && !form?.success) {
		console.error(form.error);
	}

	let copied = $state(false);
	const copyLink = (link: string) => {
		navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};
</script>

<section class="container mx-auto">
	<h1 class="pt-6 text-2xl font-semibold">File Upload</h1>
	<div class="divider"></div>

	<form method="post" enctype="multipart/form-data" class="flex flex-row gap-3">
		<input type="file" name="file" required class="file-input" />
		<button type="submit" class="btn btn-success">Upload File</button>
	</form>
	{#if form?.success}
		<p class="my-2">File uploaded! Please copy the link below.</p>
		<div class="flex items-center gap-2">
			<input
				type="text"
				value={`https://files.czqm.ca/${form.key}`}
				readonly
				class="input input-bordered w-full max-w-xs"
			/>
			<button
				type="button"
				class="btn btn-outline btn-primary {copied ? 'btn-success' : ''}"
				onclick={() => copyLink(`https://files.czqm.ca/${form.key}`)}
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	{:else if form?.error}
		<p class="text-error">
			Error uploading file: {form.error}
		</p>
	{/if}
</section>
