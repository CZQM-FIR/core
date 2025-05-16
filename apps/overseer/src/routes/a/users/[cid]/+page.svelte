<script lang="ts">
	import ManageUserEndorsements from './ManageUserEndorsements.svelte';
	import ManageUserInfo from './ManageUserInfo.svelte';
	import ManageUserRoster from './ManageUserRoster.svelte';

	import Icon from '@iconify/svelte';
	import type { PageData, PageProps } from './$types';
	import type { RosterPosition, RosterUserData } from '@czqm/db/schema';
	import UserActivity from './UserActivity.svelte';
	import ManageFlags from './ManageFlags.svelte';

	let { data, form }: PageProps = $props();

	let localUserData: RosterUserData = $state(data.user!);
</script>

<section>
	<div class="container mx-auto mt-6">
		<a href="/a/users" class="text-primary hover:link mb-2 flex flex-row items-center gap-1">
			<Icon icon="zondicons:cheveron-left" /> Back to Users
		</a>
		<div class="flex flex-col flex-wrap gap-5 lg:flex-row">
			<ManageUserInfo {data} />
			<ManageUserRoster {data} />
			<UserActivity {data} showExternal={true} />
			<ManageUserEndorsements {data} {localUserData} {form} />
			<ManageFlags {data} {form} />
		</div>
	</div>
</section>
