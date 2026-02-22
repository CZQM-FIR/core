<script lang="ts">
	import { getUserAdminDetails } from '$lib/remote/user-admin.remote';
	import ManageUserEndorsements from './ManageUserEndorsements.svelte';
	import ManageUserInfo from './ManageUserInfo.svelte';
	import ManageUserRoster from './ManageUserRoster.svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageData } from './$types';
	import UserActivity from './UserActivity.svelte';
	import ManageFlags from './ManageFlags.svelte';
	import ManageUserActiveStatus from './ManageUserActiveStatus.svelte';

	let { data }: { data: PageData } = $props();
</script>

<section>
	<div class="container mx-auto mt-6">
		<a href="/a/users" class="text-primary hover:link mb-2 flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Users
		</a>

		{#await getUserAdminDetails(data.id)}
			<p>Loading user data...</p>
		{:then details}
			<div class="flex flex-col flex-wrap gap-5 lg:flex-row">
				<ManageUserInfo {details} />
				<ManageUserRoster {details} />
				<ManageUserActiveStatus {details} />
				<ManageUserEndorsements {details} />
				<ManageFlags {details} />
				<UserActivity {details} showExternal={true} />
			</div>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load user details.'}</p>
		{/await}
	</div>
</section>
