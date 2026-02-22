<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<section id="roster">
  <div class="container mx-auto mb-12">
    <h1 class="mt-6 text-2xl">Solo Certifications</h1>
    <div class="divider"></div>
    <div class="flex flex-row flex-wrap gap-3">
      {#each data.solos as solo (solo.cid)}
        <div class="card border border-gray-600 p-4">
          <div class="tooltip" data-tip={solo.cid}>
            <a href="/controller/{solo.cid}" class="card-title text-xl">{solo.displayName}</a>
          </div>
          <p class="text-md">{solo.position.name}</p>
          <p class="text-sm text-gray-400">
            {solo.position.callsign}
            {Number(solo.position.frequency).toFixed(3)}
          </p>
          <p class="mt-2 text-sm">
            Expires: {new Date(solo.expiresAt).toISOString().split('T')[0]}
          </p>
        </div>
      {/each}
    </div>
  </div>
</section>
