<script lang="ts">
  import { getRosterData } from '$lib/remote/roster.remote';
  import RosterStatusIndicator from './RosterStatusIndicator.svelte';
  import { CircleCheck, CircleMinus, CircleX } from '@lucide/svelte';

  const query = getRosterData();
  let search = $state('');

  const controllers = $derived(
    (query.current?.rosterData ?? []).filter((controller) => {
      return (
        controller.displayName.toLowerCase().includes(search.toLowerCase()) ||
        controller.cid.toString().includes(search) ||
        controller.rating.toLowerCase().includes(search.toLowerCase())
      );
    })
  );
</script>

<section id="roster">
  <div class="container mx-auto mb-12">
    <h1 class="mt-6 text-2xl">Roster</h1>
    <div class="divider"></div>
    {#if query.error}
      <p class="text-error p-4">{query.error.message ?? 'Failed to load roster.'}</p>
    {:else if !query.ready}
      <p class="p-4">Loading...</p>
    {:else}
      <table class="table-zebra table">
        <thead>
          <tr>
            <!-- Name, Rating, Role -->
            <th></th>
            <!-- CID -->
            <th></th>
            <!-- Activity -->
            <th></th>
            <!-- Roster Status -->
            <th class="text-center">GND</th>
            <th class="text-center">TWR</th>
            <th class="text-center">APP</th>
            <th class="text-center">CTR</th>
          </tr>
        </thead>
        <tbody>
          {#each controllers as controller}
            <tr>
              <th class="flex flex-col">
                <span class="font-bold"
                  ><a href="/controller/{controller.cid}" class="hover:link"
                    >{controller.displayName} ({controller.rating})</a
                  ></span
                >
                <span class="font-normal">{controller.role}</span>
              </th>
              <td>{controller.cid}</td>
              <td>
                {#if controller.active === 'active'}
                  <div class="tooltip" data-tip="Active">
                    <CircleCheck size="18" class="text-success" />
                  </div>
                {:else if controller.active === 'inactive'}
                  <div class="tooltip" data-tip="Inactive">
                    <CircleX size="18" class="text-error" />
                  </div>
                {:else if controller.active === 'loa'}
                  <div class="tooltip" data-tip="On Leave">
                    <CircleMinus size="18" class="text-warning" />
                  </div>
                {/if}
              </td>
              <RosterStatusIndicator roster={controller.rosterStatuses.gnd} />
              <RosterStatusIndicator roster={controller.rosterStatuses.twr} />
              <RosterStatusIndicator roster={controller.rosterStatuses.app} />
              <RosterStatusIndicator roster={controller.rosterStatuses.ctr} />
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>
