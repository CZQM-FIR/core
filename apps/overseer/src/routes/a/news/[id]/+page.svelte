<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();

	let article = $derived(data.article);
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Edit {article.title}</h1>
		<div class="divider"></div>

		<form method="POST" enctype="multipart/form-data">
			<input type="hidden" name="id" value={article.id} />

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Article Name</legend>
				<input type="text" class="input" name="title" required value={article.title} />
			</fieldset>

			<fieldset class="fieldset">
				<div class="flex flex-row justify-baseline gap-2">
					<legend class="fieldset-legend">Article Text</legend>
					<p class="label ms-75">Supports Markdown</p>
				</div>
				<textarea name="text" class="textarea h-36 w-120" required value={article.text}></textarea>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Article Image</legend>
				<input type="file" class="file-input" name="image" accept="image/*" />
				<p class="label">Optional</p>
			</fieldset>

			<button type="submit" class="btn btn-primary mt-6">Update Article</button>
		</form>
		<p>{form?.message}</p>
	</div>
</section>
