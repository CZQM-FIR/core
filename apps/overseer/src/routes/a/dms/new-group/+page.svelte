<script>
	import { createGroup } from '$lib/remote/dms.remote';
	import { ChevronLeft } from '@lucide/svelte';
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create New Group</h1>
		<a href="/a/dms" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to DMS
		</a>
		<div class="divider"></div>

		<form {...createGroup} class="flex flex-col gap-4">
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Group Name</legend>
				<input {...createGroup.fields.name.as('text')} class="input" required />
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Slug</legend>
				<input {...createGroup.fields.slug.as('text')} class="input" required />
				<p class="label text-error text-sm">
					{createGroup.fields.slug
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Sort Order</legend>
				<input {...createGroup.fields.sort.as('number')} class="input" value="99" />
				<p class="label text-error text-sm">
					{createGroup.fields.sort
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
				<p class="label text-sm">Groups are sorted from 1-99 by this value.</p>
			</fieldset>

			<button class="btn btn-primary max-w-36">Create Group</button>
		</form>
	</div>
</section>
