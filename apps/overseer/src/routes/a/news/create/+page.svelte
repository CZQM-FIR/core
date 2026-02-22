<script lang="ts">
	import { createNewsArticle } from '$lib/remote/news.remote';
	import { ChevronLeft } from '@lucide/svelte';
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create News Article</h1>
		<a href="/a/news" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to All Articles
		</a>
		<div class="divider"></div>

		<form {...createNewsArticle} enctype="multipart/form-data">
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
					<a
						href="https://www.markdownguide.org/"
						class="label ms-75 hover:underline"
						target="_blank">Supports Markdown</a
					>
				</div>
				<textarea name="text" class="textarea h-36 w-120" required></textarea>
			</fieldset>

			<button type="submit" class="btn btn-primary mt-6">Publish Article</button>
		</form>
	</div>
</section>
