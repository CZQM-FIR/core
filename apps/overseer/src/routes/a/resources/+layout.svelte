<script lang="ts">
	import type { LayoutProps } from './$types';
	import { page } from '$app/stores';

	let { children }: LayoutProps = $props();
</script>

<section>
	<div class="container mx-auto py-4">
		<div class="flex flex-row flex-wrap items-baseline gap-4">
			<h1 class="text-3xl font-semibold">Resources</h1>
			<div class="join">
				<a
					href="/a/resources/controller"
					class="{$page.url.pathname.includes('controller')
						? ''
						: 'btn-outline'} btn btn-neutral text-neutral-content join-item">Controller Resources</a
				>
				<a
					href="/a/resources/pilot"
					class="{$page.url.pathname.includes('pilot')
						? ''
						: 'btn-outline'} btn btn-neutral text-neutral-content join-item">Pilot Resources</a
				>
			</div>
		</div>
		<div class="divider"></div>
	</div>
	{@render children()}
</section>
