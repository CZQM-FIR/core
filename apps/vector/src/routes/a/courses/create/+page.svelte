<script lang="ts">
	import { createCourse } from '$lib/remote/courses.remote';
	import { ChevronLeft } from '@lucide/svelte';
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">Create Course</h1>
		<a href="/a/courses" class="text-primary hover:link flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Courses
		</a>
		<div class="divider"></div>

		<form {...createCourse} class="flex flex-col gap-4">
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Name</legend>
				<input {...createCourse.fields.name.as('text')} class="input" required />
				<p class="label text-error text-sm">
					{createCourse.fields.name
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Description</legend>
				<textarea {...createCourse.fields.description.as('text')} class="textarea"></textarea>
				<p class="label text-error text-sm">
					{createCourse.fields.description
						.issues()
						?.map((issue) => issue.message)
						.join(' ')}
				</p>
			</fieldset>

			<button class="btn btn-primary">Create Course</button>
		</form>
	</div>
</section>
