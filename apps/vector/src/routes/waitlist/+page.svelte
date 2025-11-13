<script lang="ts">
	import { getCurrentUserInfo } from '$lib/remote/users.remote';
	import { getIndividualsWaitlistEntries } from '$lib/remote/waitlist.remote';
</script>

<section class="container mx-auto my-6">
	<h1 class="text-2xl font-semibold">Hey there, {(await getCurrentUserInfo()).name_first}!</h1>

	{#await getIndividualsWaitlistEntries()}
		<p>Loding your wait list information...</p>
	{:then waitlistEntries}
		{#if waitlistEntries.length === 0}
			<p>
				It looks like you are not currently on any waitlists. If you think this is a mistake, please
				contact the chief instructor via a support ticket in Discord.
			</p>
		{:else}
			{#each waitlistEntries as entry (entry.id)}
				<p class="my-4">
					You are currently on the <strong class="text-blue-400">{entry.waitlist.name}</strong>
					waitlist. You are currently number
					<strong class="text-blue-400">{entry.position + 1}</strong>
					in line.
					{#if entry.waitlist.waitTime}
						The estimated wait time for someone joining the waitlist now is approximately
						<strong class="text-blue-400">{entry.waitlist.waitTime}</strong>.
					{/if}
				</p>
			{/each}
		{/if}
	{:catch error}
		<p class="text-red-500">Error loading your waitlist entries: {error.message}</p>
	{/await}
</section>
