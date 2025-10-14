<script lang="ts">
  interface Props {
    name: string;
    checked?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    tooltip?: string;
    onchange?: (event: Event) => void;
  }

  let {
    name,
    checked = $bindable(false),
    disabled = false,
    readonly = false,
    tooltip,
    onchange
  }: Props = $props();
</script>

<div class="tooltip" data-tip={tooltip}>
  <input
    type="checkbox"
    {name}
    bind:checked
    disabled={disabled || readonly}
    class="toggle checked:text-green-600 {readonly ? 'cursor-not-allowed opacity-50' : ''}"
    {onchange}
  />
  {#if readonly}
    <input type="hidden" {name} value={checked ? 'on' : 'off'} />
  {/if}
</div>
