<script lang="ts">
	import ManageUserEndorsements from './ManageUserEndorsements.svelte';
	import ManageUserInfo from './ManageUserInfo.svelte';
	import ManageUserRoster from './ManageUserRoster.svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import type { RosterUserData } from '@czqm/db/schema';
	import UserActivity from './UserActivity.svelte';
	import ManageFlags from './ManageFlags.svelte';
	import ManageUserActiveStatus from './ManageUserActiveStatus.svelte';

	let { data, form, params }: PageProps = $props();

	let localUserData: RosterUserData = $state(data.user!);
</script>

<section>
	<div class="container mx-auto mt-6">
		<a href="/a/users" class="text-primary hover:link mb-2 flex flex-row items-center gap-1">
			<ChevronLeft size="15" /> Back to Users
		</a>
		<div class="flex flex-col flex-wrap gap-5 lg:flex-row">
			<ManageUserInfo {data} />
			<ManageUserRoster {data} />
			<ManageUserActiveStatus {data} {form} {params} />
			<ManageUserEndorsements {data} {localUserData} {form} {params} />
			<ManageFlags {data} {form} {params} />
			<UserActivity {data} showExternal={true} />
		</div>
	</div>
</section>
