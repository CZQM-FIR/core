<script lang="ts">
	import { createWaitlist } from '$lib/remote/waitlist.remote';
</script>

<section class="container mx-auto py-5">
	<h1 class="text-2xl font-semibold">Create Wait List</h1>
	<p class="text-primary hover:link"><a href="/a/waitlist">&lt; Back to Waitlists</a></p>
	<div class="divider mt-0"></div>

	<form {...createWaitlist}>
		<fieldset class="fieldset my-4">
			<legend class="fieldset-legend">Wait List Name</legend>
			<input type="text" class="input" name="name" required />
			<p class="text-error text-xs">* Required</p>
		</fieldset>

		<fieldset class="fieldset my-4">
			<legend>Moodle Wait List Cohort</legend>
			<input type="text" class="input" name="wcohort" />
			<p class=" text-xs">
				The cohort that users will be added to when they are added to the waitlist.
			</p>
		</fieldset>

		<fieldset class="fieldset my-4">
			<legend>Moodle Cohort</legend>
			<input type="text" class="input" name="cohort" />
			<p class=" text-xs">
				The cohort that users will be added to when they are enrolled in the course.
			</p>
		</fieldset>

		<button class="btn btn-primary w-min">Create</button>
	</form>
</section>
