<script lang="ts">
  interface Props {
    name: string;
    checked?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    tooltip?: string;
  }

  let { name, checked = false, disabled = false, readonly = false, tooltip }: Props = $props();
</script>

{#if tooltip}
  <div class="tooltip" data-tip={tooltip}>
    <input
      type="checkbox"
      {name}
      {checked}
      disabled={disabled || readonly}
      class="toggle checked:text-green-600 {readonly ? 'cursor-not-allowed opacity-50' : ''}"
    />
    {#if readonly}
      <input type="hidden" {name} value={checked ? 'on' : 'off'} />
    {/if}
  </div>
{:else}
  <input
    type="checkbox"
    {name}
    {checked}
    disabled={disabled || readonly}
    class="toggle checked:text-green-600 {readonly ? 'cursor-not-allowed opacity-50' : ''}"
  />
  {#if readonly}
    <input type="hidden" {name} value={checked ? 'on' : 'off'} />
  {/if}
{/if}
