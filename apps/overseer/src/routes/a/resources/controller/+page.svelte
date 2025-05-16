<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section>
	<div class="container mx-auto">
		<form
			action="?/createResource"
			method="post"
			class="bg-base-300 flex flex-col gap-3 rounded-2xl p-4 px-6"
		>
			<h1 class="text-xl font-semibold">New Resource</h1>
			<div class="flex flex-row flex-wrap items-baseline gap-3">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Resource Name</legend>
					<input type="text" class="input" name="name" required placeholder="Resource Name" />
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Resource Link</legend>
					<input type="text" class="input w-80" required name="link" placeholder="Resource Link" />
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Category</legend>
					<input type="text" class="input" required name="cateory" placeholder="Category" />
				</fieldset>

				<div class="flex flex-row items-center gap-3">
					<span>Available to Controllers</span>
					<input type="checkbox" name="public" checked class="checkbox" />
				</div>

				<button type="submit" class="btn btn-outline btn-success ms-auto">Create Resource</button>
			</div>
		</form>
	</div>
</section>
