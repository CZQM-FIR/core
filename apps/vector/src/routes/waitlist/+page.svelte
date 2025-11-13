<script lang="ts">
	import { getCurrentUserInfo } from '$lib/remote/users.remote';
	import { getIndividualsWaitlistEntries } from '$lib/remote/waitlist.remote';
</script>

<section class="container mx-auto my-6">
	<h1 class="text-2xl font-semibold">Hey there, {(await getCurrentUserInfo()).name_first}!</h1>

	{#await async () => getIndividualsWaitlistEntries()}
		<p>Loding your wait list information...</p>
	{:then waitlistEntries}
		{#if waitlistEntries.length === 0}
			<p>
				It looks like you are not currently on any waitlists. If eligible, you may join one below:
			</p>
		{/if}
	{:catch error}
		<p class="text-red-500">Error loading your waitlist entries: {error.message}</p>
	{/await}
</section>
