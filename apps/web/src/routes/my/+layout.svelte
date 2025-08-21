<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import { User, Users, LogOut, Blocks, Settings } from '@lucide/svelte';
  import NavLink from './NavLink.svelte';
  import { PUBLIC_OVERSEER_URL } from '$env/static/public';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  function getGreeting(): string {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return 'Good Morning';
    } else if (currentHour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  }
</script>

<section id="my" class="">
  <div class="container mx-auto min-h-screen">
    <h1 class="pt-6 text-2xl">{getGreeting()}, {data.user?.name_first}!</h1>
    <div class="divider"></div>
    <div class="flex flex-col gap-3 md:flex-row">
      <!-- sidebar -->
      <div class="w- flex min-w-56 flex-col rounded-2xl p-2 md:min-h-[30rem]">
        <h3 class="m-0 p-0 text-center text-lg font-semibold">MyCZQM</h3>
        <div class="divider m-0 p-0"></div>
        <ul class="mt-1 ps-2">
          <NavLink name="My Profile" icon={User} href="/my" />
          <!-- <NavLink name="Tickets" icon={Mail} href="/my/tickets" /> -->
          <NavLink name="Preferences" icon={Settings} href="/my/preferences" />
          <NavLink name="Integrations" icon={Blocks} href="/my/integrations" />
          {#if data.user.flags.some((f) => ['staff', 'admin'].includes(f.flag.name))}
            <NavLink name="Overseer" icon={Users} href={PUBLIC_OVERSEER_URL} external />
          {/if}
          <NavLink name="Logout" icon={LogOut} href="/auth/logout" />
        </ul>
      </div>
      <!-- content -->
      <div>
        {@render children()}
      </div>
    </div>
  </div>
</section>
