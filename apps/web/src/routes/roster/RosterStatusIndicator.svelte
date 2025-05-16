<script lang="ts">
  interface Props {
    roster: Number;
    position?: string;
    div?: boolean;
  }

  let { roster, position = '', div = false }: Props = $props();
</script>

{#if div}
  {#if roster === -1}
    <div class="text-center">---</div>
  {:else if roster === 0}
    <div class="text-error-content text-center">
      <div class="badge badge-error badge-lg">{position || 'In Training'}</div>
    </div>
  {:else if roster === 1}
    <div class="text-warning-content text-center">
      <div class="badge badge-warning badge-lg">{position || 'Solo'}</div>
    </div>
  {:else if roster === 2}
    <div class="text-success-content text-center">
      <div class="badge badge-success badge-lg">{position || 'Certified'}</div>
    </div>
  {/if}
{:else if roster === -1}
  <td class="text-center"> --- </td>
{:else if roster === 0}
  <td class="text-error-content text-center"
    ><div class="badge badge-error badge-lg">{position || 'In Training'}</div></td
  >
{:else if roster === 1}
  <td class="text-warning-content text-center"
    ><div class="badge badge-warning badge-lg">{position || 'Solo'}</div></td
  >
{:else if roster === 2}
  <td class="text-success-content text-center"
    ><div class="badge badge-success badge-lg">{position || 'Certified'}</div></td
  >
{/if}
