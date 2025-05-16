<script lang="ts">
  import Icon from '@iconify/svelte';
  import { page } from '$app/stores';

  let { name, icon, href, external = false } = $props();
</script>

<li class="">
  <a
    {href}
    target={external ? '_blank' : undefined}
    class="{$page.route.id == href
      ? 'link text-blue-400'
      : ''} hover:link flex flex-row items-center"
  >
    <Icon {icon} />
    <span class="ps-2 pe-1">{name}</span>
    {#if external}
      <span class="m-0 p-0 text-xs"><Icon icon="mdi:external-link" /></span>
    {/if}
  </a>
</li>
