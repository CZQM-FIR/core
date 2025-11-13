<script lang="ts">
	import env from '$lib/publicEnv';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section>
	{#if !data.user}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Vector</h1>
					<div class="flex flex-col gap-3 py-6">
						<p class="">Welcome to Vector, the CZQM FIR's training management system.</p>
						<p>
							You must be logged in to access this page. Please return to the main site to login.
						</p>
					</div>
					<a href={env.PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
				</div>
			</div>
		</div>
	{:else if data.user.flags.filter( (f) => ['staff', 'admin', 'controller', 'visitor'].includes(f.flag.name) ).length > 0}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Welcome to Vector</h1>
					<div class="flex flex-col gap-3 py-6">
						<p>
							Welcome to Vector, the CZQM FIR's training management system. View your position on
							our wait lists or join a wait list for training.
						</p>
					</div>
					<div class="flex w-full flex-row justify-center gap-3">
						<a href="/waitlist" class="btn btn-primary">Go To Wait Lists</a>
						<a href={env.PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="hero bg-base-200 min-h-screen">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Vector</h1>
					<div class="flex flex-col gap-3 py-6">
						<p class="">
							Welcome to Vector, the CZQM FIR's controller management system. This system is only
							available to CZQM home controllers and visitors.
						</p>
						<p>
							If you believe you should have access, please contact the webmaster or chief
							instructor.
						</p>
					</div>
					<a href={env.PUBLIC_WEB_URL} class="btn btn-outline">Return to Main Site</a>
				</div>
			</div>
		</div>
	{/if}
</section>
