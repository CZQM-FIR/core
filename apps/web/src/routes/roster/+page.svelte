<script lang="ts">
  import type { PageData } from './$types';
  import RosterStatusIndicator from './RosterStatusIndicator.svelte';
  import { getRosterStatus } from '$lib/utilities/getRosterStatus';
  import { CircleCheck, CircleMinus, CircleX } from '@lucide/svelte';
  import { getUserDisplayName } from '$lib/utilities/getUserDisplayName';

  let { data }: { data: PageData } = $props();

  let controllers: typeof data.controllers = $state([]);

  $effect(() => {
    controllers = data.controllers.filter((controller) => {
      return (
        controller.name_full.toLowerCase().includes(search.toLowerCase()) ||
        controller.cid.toString().includes(search) ||
        controller.rating.short.toLowerCase().includes(search.toLowerCase())
      );
    });
  });

  let search = $state('');
</script>

<section id="roster">
  <div class="container mx-auto mb-12">
    <h1 class="mt-6 text-2xl">Roster</h1>
    <div class="divider"></div>
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
                  >{getUserDisplayName(controller)} ({controller.rating.short})</a
                ></span
              >
              <span class="font-normal">{controller.role}</span>
            </th>
            <td>{controller.cid}</td>
            <td>
              {#if controller.active === 1}
                <div class="tooltip" data-tip="Active">
                  <CircleCheck size="18" class="text-success" />
                </div>
              {:else if controller.active === 0}
                <div class="tooltip" data-tip="Inactive">
                  <CircleX size="18" class="text-error" />
                </div>
              {:else if controller.active === -1}
                <div class="tooltip" data-tip="On Leave">
                  <CircleMinus size="18" class="text-warning" />
                </div>
              {/if}
            </td>
            <RosterStatusIndicator roster={getRosterStatus(controller, 'gnd')} />
            <RosterStatusIndicator roster={getRosterStatus(controller, 'twr')} />
            <RosterStatusIndicator roster={getRosterStatus(controller, 'app')} />
            <RosterStatusIndicator roster={getRosterStatus(controller, 'ctr')} />
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
