<script lang="ts">
  import type { PageData, PageProps } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: PageProps = $props();
</script>

<section>
  <h1 class="text-2xl font-semibold">Link Discord Account</h1>

  {#if data.integrations.some((i) => i.type === 0)}
    <p class="italic">
      Linked Account: {data.integrations.find((i) => i.type === 0)?.integrationUserName}
    </p>
    <form action="?/unlinkDiscord" method="post" use:enhance>
      <button type="submit" class="btn btn-primary mt-3">Unlink Discord Account</button>
    </form>
  {:else}
    <p class="italic">You have not yet linked your discord account...</p>
    <form action="?/linkDiscord" method="post" use:enhance>
      <button type="submit" class="btn btn-primary mt-3">Link Discord Account</button>
    </form>
  {/if}
</section>
