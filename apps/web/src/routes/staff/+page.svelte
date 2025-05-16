<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<section id="staf" class="container mx-auto">
  <h1 class="mt-6 text-2xl">FIR Staff</h1>
  <div class="divider"></div>

  <div class="flex flex-col gap-3">
    {#each data.staff as staff}
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <div class="flex flex-row items-end gap-3">
            <h2 class="card-title">
              <a href="/controller/{staff.cid}" class="hover:link">{staff.name_full}</a>
            </h2>
            <p class="italic">{staff.role}</p>
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
</section>
