<script lang="ts">
  import { getStaffPageData } from '$lib/remote/staff.remote';
  import { Mail } from '@lucide/svelte';

  const staffData = getStaffPageData();
</script>

<section id="staf" class="container mx-auto">
  <h1 class="mt-6 text-2xl">FIR Staff</h1>
  <div class="divider"></div>

  {#await staffData}
    <p class="p-4">Loading...</p>
  {:then data}
    <div class="flex flex-col gap-3">
      {#each data.staff as staff}
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <div class="flex w-full flex-row items-end gap-3">
              <h2 class="card-title">
                <a href="/controller/{staff.cid}" class="hover:link">{staff.name}</a>
              </h2>
              <p class="italic">{staff.role}</p>
              {#if staff.email}
                <a
                  href="mailto:{staff.email}"
                  target="_blank"
                  class="hover:link ms-auto flex flex-row items-center justify-end gap-2"
                >
                  <p class="">Contact</p>
                  <Mail size="15" />
                </a>
              {/if}
            </div>
            {#if staff.bio}
              <p>{staff.bio}</p>
            {:else}
              <p></p>
            {/if}
            {#if staff.assistants.length > 0}
              <div class="border-base-content/20 mt-2 flex flex-col gap-1 border-l-2 pl-3">
                {#each staff.assistants as assistant (assistant.cid)}
                  <div class="flex flex-row items-center gap-2 text-sm">
                    <a href="/controller/{assistant.cid}" class="hover:link text-base-content/80">
                      {assistant.name}
                    </a>
                    <span class="text-base-content/60 italic">{assistant.role}</span>
                  </div>
                {/each}
              </div>
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
          <h2>
            <a href="/controller/{user.cid}" class="hover:link text-lg">{user.displayName}</a>
          </h2>
          <p class="text-sm text-gray-400">
            {user.flags.some((f) => f.name === 'chief-instructor')
              ? 'Chief Instructor'
              : user.flags.some((f) => f.name === 'instructor')
                ? 'Instructor'
                : 'Mentor'}
          </p>
        </div>
      {/each}
    </div>
  {:catch err}
    <p class="text-error p-4">{err?.message ?? 'Failed to load staff.'}</p>
  {/await}
</section>
