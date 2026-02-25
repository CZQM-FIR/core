<script lang="ts">
	import { uploadFile } from '$lib/remote/files.remote';

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

	<form {...uploadFile} method="post" enctype="multipart/form-data" class="flex flex-row gap-3">
		<input type="file" name="file" required class="file-input" />
		<button type="submit" class="btn btn-success">Upload File</button>
	</form>
	{#if uploadFile.result?.success}
		<p class="my-2">File uploaded! Please copy the link below.</p>
		<div class="flex items-center gap-2">
			<input
				type="text"
				value={`https://files.czqm.ca/${uploadFile.result.key}`}
				readonly
				class="input input-bordered w-full max-w-xs"
			/>
			<button
				type="button"
				class="btn btn-outline btn-primary {copied ? 'btn-success' : ''}"
				onclickcapture={() => copyLink(`https://files.czqm.ca/${uploadFile.result!.key}`)}
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	{:else if uploadFile.result?.error}
		<p class="text-error">
			Error uploading file: {uploadFile.result.error}
		</p>
	{/if}
</section>
