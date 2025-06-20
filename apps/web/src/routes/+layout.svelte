<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import {
    Shield,
    Users,
    UserPlus,
    ClipboardList,
    Map,
    User,
    PanelsTopLeft,
    LogOut,
    LogIn,
    Timer
  } from '@lucide/svelte';
  import { page } from '$app/stores';

  import CZQMLogo from '$lib/assets/images/CZQM-White.svg';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
  <title>Moncton / Gander FIR</title>
  {#if $page.route.id !== '/events/[eventID]' && $page.route.id !== '/news/[articleID]'}
    <meta
      name="description"
      content="Canada's Gateway to the East Coast - Providing realistic ATC services across the maritime provinces on the VATSIM network."
    />

    <!-- Twitter meta tags -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Moncton / Gander FIR" />
    <meta
      name="twitter:description"
      content="Canada's Gateway to the East Coast - Providing realistic ATC services across the maritime provinces on the VATSIM network."
    />
    <meta name="twitter:image" content="https://files.czqm.ca/upload/1750000219576-CZQM.png" />
    <meta name="twitter:site" content="@CZQM_FIR" />

    <!-- Open Graph meta tags -->
    <meta property="og:title" content="Moncton / Gander FIR" />
    <meta
      property="og:description"
      content="Canada's Gateway to the East Coast - Providing realistic ATC services across the maritime provinces on the VATSIM network."
    />
    <meta property="og:image" content="https://files.czqm.ca/upload/1750000219576-CZQM.png" />
    <meta property="og:url" content="https://czqm.ca" />
    <meta property="og:type" content="website" />
  {/if}
</svelte:head>

<!-- nav bar -->
<nav class="bg-base-300 w-screen">
  <div class="navbar top-0 container mx-auto">
    <div class="navbar-start">
      <div class="dropdown">
        <div
          tabindex="0"
          role="button"
          class="btn btn-ghost lg:hidden"
          aria-label="Open navigation menu"
        >
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
          <li>
            <a href="/about">About Us</a>
          </li>
          <li>
            <details>
              <summary>Controllers</summary>
              <ul class="p-2">
                <li><a href="/staff"><Shield class="mr-1" size="15" /> Staff</a></li>
                <li><a href="/roster"><Users class="mr-1" size="15" /> Roster</a></li>
                <li>
                  <a href="/roster/solo"><Timer class="mr-1" size="15" /> Solo Certifications</a>
                </li>
                <li><a href="/join"><UserPlus class="mr-1" size="15" /> Join Us</a></li>
                <li>
                  <a href="/controller-resources"
                    ><ClipboardList class="mr-1" size="15" /> Resources</a
                  >
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Pilots</summary>
              <ul class="p-2">
                <li>
                  <a href="/pilot-resources"><ClipboardList class="mr-1" size="15" /> Resources</a>
                </li>
                <li><a href="/charts"><Map class="mr-1" size="15" /> Charts</a></li>
              </ul>
            </details>
          </li>
          <li><a href="/events">Events</a></li>
          <li><a href="/news">News</a></li>
          <li><a href="/contact">Contact Us</a></li>
        </ul>
      </div>
      <a href="/" class="btn btn-ghost text-xl">CZQM / QX</a>
    </div>
    <div class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal px-1">
        <li>
          <a href="/about">About Us</a>
        </li>
        <li>
          <div class="dropdown dropdown-bottom">
            <div tabindex="0" role="button">Controllers</div>
            <ul class="menu dropdown-content rounded-box bg-base-300 z-1 w-52 p-2 shadow-sm">
              <li><a href="/staff"><Shield class="mr-1" size="15" /> Staff</a></li>
              <li><a href="/roster"><Users class="mr-1" size="15" /> Roster</a></li>
              <li>
                <a href="/roster/solo"><Timer class="mr-1" size="15" /> Solo Certifications</a>
              </li>
              <li><a href="/join"><UserPlus class="mr-1" size="15" /> Join Us</a></li>
              <li>
                <a href="/controller-resources"
                  ><ClipboardList class="mr-1" size="15" /> Resources</a
                >
              </li>
            </ul>
          </div>
        </li>
        <li>
          <div class="dropdown dropdown-bottom">
            <div tabindex="0" role="button">Pilots</div>
            <ul class="menu dropdown-content rounded-box bg-base-300 z-1 w-52 p-2 shadow-sm">
              <li>
                <a href="/pilot-resources"><ClipboardList class="mr-1" size="15" /> Resources</a>
              </li>
              <li><a href="/charts"><Map class="mr-1" size="15" /> Charts</a></li>
            </ul>
          </div>
        </li>
        <li><a href="/events">Events</a></li>
        <li><a href="/news">News</a></li>
        <li><a href="/contact">Contact Us</a></li>
      </ul>
    </div>
    <div class="navbar-end">
      {#if data.user}
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost bg-base-300">
            <User class="mr-1" size="15" />
            {data.user.name_full}
          </div>
          <ul class="menu dropdown-content rounded-box bg-base-300 z-1 p-2 shadow-sm">
            <li>
              <a href="/my" class="flex flex-row gap-3 align-middle">
                <PanelsTopLeft class="mr-1" size="15" /> myCZQM
              </a>
            </li>
            <li>
              <a href={`/auth/logout`} class="flex flex-row gap-3 align-middle">
                <LogOut class="mr-1" size="15" /> Logout
              </a>
            </li>
          </ul>
        </div>
      {:else}
        <a href={`/auth?redirect=${$page.url.pathname}`} class="btn bg-base-300">
          <LogIn class="mr-1" size="15" /> Login
        </a>
      {/if}
    </div>
  </div>
  <!-- Headline -->
  <!-- {#if $page.data.headline.article || $page.data.headline.event}
    <div id="news-header" class="bg-primary text-center p-0.5">
      <h1 class="mx-auto font-semibold">
        {#if $page.data.headline.event}
          <a class="hover:link" href="/events/{$page.data.headline.event._id}"
            ><span class="hidden md:inline">Upcoming Event:</span>
            {$page.data.headline.event.name}</a
          >
        {/if}

        {#if $page.data.headline.event && $page.data.headline.article}
          <span class="text-base-100"> | </span>
        {/if}

        {#if $page.data.headline.article}
          <a class="hover:link" href="/news/{$page.data.headline.article._id}"
            >{$page.data.headline.article.name}</a
          >
        {/if}
      </h1>
    </div>
  {/if} -->
</nav>

<!-- main content -->
<main class="min-h-screen">
  {@render children()}
</main>

<!-- footer -->
<footer class="footer sm:footer-horizontal bg-base-200 text-base-content p-10">
  <aside>
    <img src={CZQMLogo} alt="" class="hidden md:block" />
    <p>
      <strong>Moncton Gander FIR</strong><br />Not affiliated with Nav Canada.<br />For flight
      simulation use only.
    </p>
  </aside>
  <nav>
    <h3 class="footer-title">Policies</h3>
    <a href="/privacy" class="link-hover link">Privacy Policy</a>
    <a href="/branding" class="link-hover link">Branding</a>
  </nav>
  <nav>
    <h3 class="footer-title">Quick Links</h3>
    <a href="/about" class="link-hover link">About Us</a>
    <!-- <a href="https://wiki.czqm.ca/en/faqs" class="link-hover link">FAQs</a> -->
    <p class="text-gray-500">FAQs - <span class="italic">Coming Soon!</span></p>
    <a href="/join" class="link-hover link">Join Us</a>
    <a href="/contact" class="link-hover link">Contact Us</a>
    <!-- <a href="https://wiki.czqm.ca" class="link-hover link">Wiki</a> -->
    <p class="text-gray-500">Wiki - <span class="italic">Coming Soon!</span></p>
  </nav>
  <nav>
    <h3 class="footer-title">Connect With Us</h3>
    <a href="https://twitter.com/czqm_fir" class="link-hover link flex items-center"
      >X (formerly Twitter)</a
    >
    <a href="https://www.facebook.com/CZQMFIR/" class="link-hover link flex items-center"
      >FaceBook</a
    >
    <a
      href="https://www.youtube.com/channel/UCS5H_U3h6edXWashMjQpuAg"
      class="link-hover link flex items-center">Youtube</a
    >
  </nav>
</footer>
