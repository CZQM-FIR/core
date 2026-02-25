<script lang="ts">
  import { getControllerResources } from '$lib/remote/resources.remote';

  const resourcesData = getControllerResources();
</script>

<section id="resources" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="mt-6 text-2xl">Controller Resources</h1>
    <div class="divider"></div>
    {#await resourcesData}
      <p class="p-4">Loading...</p>
    {:then data}
      <div class="flex flex-col gap-3">
        {#each data.resources as resource}
          <a href={resource.url} target="_blank">
            <div class="card bg-base-200 shadow-xl">
              <div class="card-body">
                <div class="flex flex-row items-end gap-3">
                  <h2 class="card-title">{resource.name}</h2>
                  <div class="badge badge-neutral">
                    {resource.category[0].toUpperCase()}{resource.category.slice(1)}
                  </div>
                </div>
                <p>{resource.description}</p>
              </div>
            </div>
          </a>
        {/each}
        {#if data.resources.length === 0}
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body">
              <p>No resources available</p>
            </div>
          </div>
        {/if}
      </div>
    {:catch err}
      <p class="text-error p-4">{err?.message ?? 'Failed to load resources.'}</p>
    {/await}
  </div>
</section>
