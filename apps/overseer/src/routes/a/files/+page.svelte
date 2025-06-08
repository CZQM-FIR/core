<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<section class="container mx-auto">
	<h1 class="pt-6 text-2xl font-semibold">File Upload</h1>
	<div class="divider"></div>

	<form method="post" enctype="multipart/form-data" class="flex flex-row gap-3">
		<input type="file" name="file" required class="file-input" />
		<button type="submit" class="btn btn-success">Upload File</button>
	</form>
	{#if form?.success}
		<p>
			File uploaded. <a
				href={`https://files.czqm.ca/${form.key}`}
				class="text-primary hover:link"
				target="_blank"
				rel="noopener">https://files.czqm.ca/{form.key}</a
			>
		</p>
	{/if}
</section>
