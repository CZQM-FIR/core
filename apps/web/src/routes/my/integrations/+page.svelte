<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import { getMyIntegrations } from '$lib/remote/integrations.remote';

  const integrationsData = getMyIntegrations();
</script>

<section>
  <h1 class="text-2xl font-semibold">Link Discord Account</h1>

  {#await integrationsData}
    <p class="p-4">Loading...</p>
  {:then data}
    {#if data.integrations.some((i) => i.type === 0)}
      <p>
        Discord account linked successfuly. Your roles will be automatically updated based on your
        current FIR status. Roles in Discord may take a few minutes after linking to update. Once
        linked and synced, roles are only updated every 6 hours.
      </p>

      <p class="italic">
        Linked Account: {data.integrations.find((i) => i.type === 0)?.integrationUserName ||
          'LINKED FROM VATCAN'}
      </p>
      <form
        action="?/unlinkDiscord"
        method="post"
        use:enhance={() => {
          return async ({ result }) => {
            await applyAction(result);
          };
        }}
      >
        <button type="submit" class="btn btn-primary mt-3">Unlink Discord Account</button>
      </form>
    {:else}
      <p class="italic">You have not yet linked your discord account...</p>
      <form action="?/linkDiscord" method="post">
        <button type="submit" class="btn btn-primary mt-3">Link Discord Account</button>
      </form>
    {/if}
  {:catch err}
    <p class="text-error p-4">{err?.message ?? 'Failed to load integrations.'}</p>
  {/await}
</section>
