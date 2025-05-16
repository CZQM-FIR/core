<script lang="ts">
	import { PUBLIC_WEB_URL } from '$env/static/public';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section>
	{#if !data.user}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Overseer</h1>
					<div class="flex flex-col gap-3 py-6">
						<p class="">Welcome to Overseer, the CZQM FIR's controller management system.</p>
						<p>
							You must be logged in to access this page. Please return to the main site to login.
						</p>
					</div>
					<a href={PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
				</div>
			</div>
		</div>
	{:else if data.user.flags.filter((f) => ['staff', 'admin'].includes(f.flag.name)).length > 0}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Overseer</h1>
					<div class="flex flex-col gap-3 py-6">
						<p class="">Welcome to Overseer, the CZQM FIR's controller management system.</p>
						<p>Please select a function above.</p>
					</div>
					<a href={PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Overseer</h1>
					<div class="flex flex-col gap-3 py-6">
						<p class="">
							Welcome to Overseer, the CZQM FIR's controller management system. This system is only
							available to staff members.
						</p>
						<p>If you believe you should have access, please contact the webmaster.</p>
					</div>
					<a href={PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
				</div>
			</div>
		</div>
	{/if}
</section>
