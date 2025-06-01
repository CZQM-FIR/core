<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { User } from '@lucide/svelte';

	import CZQMLogo from '$lib/assets/images/CZQM-White.svg';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<!-- nav bar -->
<nav class="bg-base-300 w-screen">
	<div class="navbar top-0 container mx-auto">
		<div class="navbar-start">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h8m-8 6h16"
						/></svg
					>
				</div>
				<ul class="menu dropdown-content menu-sm rounded-box bg-base-300 z-50 mt-3 p-2 shadow-sm">
					{#if data.user?.flags.some((f) => ['staff', 'admin'].includes(f.flag.name))}
						{#if data.user?.flags.some( (f) => ['admin', 'chief', 'deputy', 'chief-instructor', 'web'].includes(f.flag.name) )}
							<li><a href="/a/users">Users</a></li>
							<li><a href="/a/activity">Activity</a></li>
						{/if}
						{#if data.user?.flags.some( (f) => ['admin', 'chief', 'deputy', 'events'].includes(f.flag.name) )}
							<li><a href="/a/events">Events</a></li>
						{/if}
						<li><a href="/a/news">News</a></li>
						<li><a href="/a/resources">Resources</a></li>
					{/if}
				</ul>
			</div>
			<a href="/" class="btn btn-ghost text-xl">CZQM / QX</a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				{#if data.user?.flags.some((f) => ['staff', 'admin'].includes(f.flag.name))}
					{#if data.user?.flags.some( (f) => ['admin', 'chief', 'deputy', 'chief-instructor', 'web'].includes(f.flag.name) )}
						<li><a href="/a/users">Users</a></li>
						<li><a href="/a/activity">Activity</a></li>
					{/if}
					{#if data.user?.flags.some( (f) => ['admin', 'chief', 'deputy', 'events'].includes(f.flag.name) )}
						<li><a href="/a/events">Events</a></li>
					{/if}
					<li><a href="/a/news">News</a></li>
					<li><a href="/a/resources">Resources</a></li>
				{/if}
			</ul>
		</div>
		<div class="navbar-end">
			{#if data.user}
				<div class="dropdown dropdown-end">
					<div tabindex="0" role="button" class="btn btn-ghost bg-base-300 cursor-default">
						{data.user.name_full}
					</div>
				</div>
			{/if}
		</div>
	</div>
</nav>

<!-- main content -->
<main class="min-h-screen">
	{@render children()}
</main>

<!-- footer -->

<footer class="footer sm:footer-horizontal bg-base-300 text-neutral-content items-center p-4">
	<aside class="grid-flow-col items-center">
		<a href="/"><img src={CZQMLogo} alt="" class="w-20" /></a>
		<p>
			<strong>Moncton Gander FIR</strong><br />Not affiliated with Nav Canada.<br />For flight
			simulation use only.
		</p>
	</aside>
	<nav class="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
		<a href="https://czqm.ca/privacy"> Privacy Policy </a>
	</nav>
</footer>
