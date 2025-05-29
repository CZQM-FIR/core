<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  import { page } from '$app/stores';

  let { name, href, icon, external = false } = $props();
</script>

<li class="">
  <a
    {href}
    target={external ? '_blank' : undefined}
    class="{$page.route.id == href
      ? 'link text-blue-400'
      : ''} hover:link flex flex-row items-center"
  >
    {#if icon}
      <icon size="15"></icon>
    {/if}
    <span class="ps-2 pe-1">{name}</span>
    {#if external}
      <span class="m-0 p-0 text-xs"><ExternalLink size="15" /></span>
    {/if}
  </a>
</li>
