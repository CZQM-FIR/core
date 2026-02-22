<script lang="ts">
	import type { PageData } from './$types';
	import { getNewsArticle, updateNewsArticle } from '$lib/remote/news.remote';
	import { ChevronLeft } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<section>
	{#await getNewsArticle(data.id)}
		<div class="container mx-auto">
			<h1 class="pt-6 text-2xl font-semibold">Loading article...</h1>
			<a href="/a/news" class="text-primary hover:link flex flex-row items-center gap-1">
				<ChevronLeft size="15" /> Back to All Articles
			</a>
		</div>
	{:then article}
		<div class="container mx-auto">
			<h1 class="pt-6 text-2xl font-semibold">Edit {article.title}</h1>
			<a href="/a/news" class="text-primary hover:link flex flex-row items-center gap-1">
				<ChevronLeft size="15" /> Back to All Articles
			</a>
			<div class="divider"></div>

			<form {...updateNewsArticle} enctype="multipart/form-data">
				<input type="hidden" name="id" value={article.id} />

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Article Name</legend>
					<input type="text" class="input" name="title" required value={article.title} />
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
					<textarea name="text" class="textarea h-36 w-120" required value={article.text}
					></textarea>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Article Image</legend>
					<input type="file" class="file-input" name="image" accept="image/*" />
					<p class="label">Optional</p>
				</fieldset>

				<button type="submit" class="btn btn-primary mt-6">Update Article</button>
			</form>
			<p>{updateNewsArticle.result?.message}</p>
		</div>
	{:catch err}
		<div class="container mx-auto">
			<p class="text-error mt-6">{err.message ?? 'Failed to load article.'}</p>
		</div>
	{/await}
</section>
