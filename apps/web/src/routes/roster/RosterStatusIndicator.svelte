<script lang="ts">
  import type { RosterPositionStatus } from '@czqm/common';

  interface Props {
    roster: RosterPositionStatus;
    position?: string;
    div?: boolean;
  }

  let { roster, position = '', div = false }: Props = $props();
</script>

{#if div}
  {#if roster === 'nothing'}
    <div class="text-center">---</div>
  {:else if roster === 'training'}
    <div class="text-error-content text-center">
      <div class="badge badge-error badge-lg">{position || 'In Training'}</div>
    </div>
  {:else if roster === 'solo'}
    <div class="text-warning-content text-center">
      <a href="/roster/solo" class="hover:link badge badge-warning badge-lg">{position || 'Solo'}</a
      >
    </div>
  {:else if roster === 'certified'}
    <div class="text-success-content text-center">
      <div class="badge badge-success badge-lg">{position || 'Certified'}</div>
    </div>
  {/if}
{:else if roster === 'nothing'}
  <td class="text-center"> --- </td>
{:else if roster === 'training'}
  <td class="text-error-content text-center"
    ><div class="badge badge-error badge-lg">{position || 'In Training'}</div></td
  >
{:else if roster === 'solo'}
  <td class="text-warning-content text-center"
    ><a href="/roster/solo" class="hover:link badge badge-warning badge-lg">{position || 'Solo'}</a
    ></td
  >
{:else if roster === 'certified'}
  <td class="text-success-content text-center"
    ><div class="badge badge-success badge-lg">{position || 'Certified'}</div></td
  >
{/if}
