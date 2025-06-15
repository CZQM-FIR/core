<script lang="ts">
  import type { PageData } from './$types';
  import { Mail } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
</script>

<section id="staf" class="container mx-auto">
  <h1 class="mt-6 text-2xl">FIR Staff</h1>
  <div class="divider"></div>

  <div class="flex flex-col gap-3">
    {#each data.staff as staff}
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <div class="flex w-full flex-row items-end gap-3">
            <h2 class="card-title">
              <a href="/controller/{staff.cid}" class="hover:link">{staff.name_full}</a>
            </h2>
            <p class="italic">{staff.role}</p>
            <a
              href="mailto:{staff.email}"
              target="_blank"
              class="hover:link ms-auto flex flex-row items-center justify-end gap-2"
            >
              <p class="">Contact</p>
              <Mail size="15" />
            </a>
          </div>
          {#if staff.bio}
            <p>{staff.bio}</p>
          {:else}
            <p></p>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <h1 class="mt-6 text-2xl">Training Team</h1>
  <div class="divider"></div>

  <div class="mb-8 flex flex-row flex-wrap gap-15">
    {#each data.trainingTeam as user}
      <div>
        <h2><a href="/controller/{user.cid}" class="hover:link text-lg">{user.name_full}</a></h2>
        <p class="text-sm text-gray-400">
          {user.flags.some((f) => f.flag.name === 'chief-instructor')
            ? 'Chief Instructor'
            : user.flags.some((f) => f.flag.name === 'instructor')
              ? 'Instructor'
              : 'Mentor'}
        </p>
      </div>
    {/each}
  </div>
</section>
