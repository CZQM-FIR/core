<script lang="ts">
  import { getActiveGroups } from '$lib/remote/dms.remote';
</script>

<section id="join" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="pt-6 text-2xl">Documents</h1>
    <div class="divider"></div>

    {#await getActiveGroups()}
      <span>Loading...</span>
    {:then groups}
      {#if groups.length === 0}
        <span>No Documents Found</span>
      {:else}
        <ul class="flex flex-col gap-3">
          {#each groups as group (group.slug)}
            <li class="card bg-base-300 p-3">
              <h2 class="mb-5 text-lg font-semibold">{group.name}</h2>
              <ul class="flex flex-col gap-3">
                {#each group.documents as doc (doc.short)}
                  <li class="card bg-base-100 p-0">
                    <a
                      href="/docs/{group.slug}/{doc.short}"
                      class="flex flex-row justify-between gap-3 p-3"
                    >
                      <div class="flex flex-col gap-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span>{doc.name}</span>
                          {#if doc.canAcknowledge}
                            <span class="badge badge-warning badge-sm"
                              >Acknowledgement required</span
                            >
                          {/if}
                        </div>
                        <span class="text-base-content/60">{doc.description}</span>
                      </div>
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      {/if}
    {/await}
  </div>
</section>
