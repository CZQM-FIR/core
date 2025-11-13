<script lang="ts">
	import { getCurrentUserInfo } from '$lib/remote/users.remote';
	import { getIndividualsWaitlistEntries } from '$lib/remote/waitlist.remote';
</script>

<section class="container mx-auto my-6">
	<h1 class="text-3xl font-semibold">Hey there, {(await getCurrentUserInfo()).name_first}!</h1>

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
				<div class="my-4 flex flex-col gap-5 text-lg">
					<p>
						You are currently on the <strong class="text-blue-400">{entry.waitlist.name}</strong>
						waitlist. You are currently number
						<strong class="text-blue-400">{entry.position + 1}</strong>
						in line.
						{#if entry.waitlist.waitTime}
							The estimated wait time for someone joining the waitlist now is approximately
							<strong class="text-blue-400">{entry.waitlist.waitTime}</strong>.
						{/if}
					</p>
					<p>
						Please note that the waitlist times, if listed, are estimates. Waitlists are subject to
						Instructor availability. We are a 100% volunteer team, so please be patient. Please do
						not reach out to Instructors or Mentors regarding training unless they reach out first.
					</p>
					<p>
						Our waitlist operates in a first come first serve basis. You will be contacted when you
						may begin training along with further instructions.
					</p>
				</div>
			{/each}
		{/if}
	{:catch error}
		<p class="text-red-500">Error loading your waitlist entries: {error.message}</p>
	{/await}
</section>
