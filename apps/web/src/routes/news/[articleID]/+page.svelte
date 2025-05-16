<script lang="ts">
  import type { PageData } from './$types';
  import Icon from '@iconify/svelte';

  let { data }: { data: PageData } = $props();

  let article = $derived(data.article);
</script>

<section id="event" class="min-h-screen">
  <div class="container mx-auto">
    <div class="mt-6 flex flex-row items-center gap-3">
      <h1 class="text-2xl">{article.title}</h1>
      <div class="badge badge-neutral">
        {new Date(article.date).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit'
        })}
      </div>
      <div class="badge badge-neutral ms-auto flex flex-row gap-1">
        <Icon icon="mdi:account" />
        <p>{article.author?.name_full}</p>
      </div>
    </div>
    <div class="divider"></div>
    <div class="grid grid-cols-2 grid-rows-1 gap-3">
      {#if article.image}
        <a href="https://files.czqm.ca/{article.image}" class="cursor-zoom-in" target="_blank">
          <img
            src="https://files.czqm.ca/{article.image}"
            alt="{article.title} Banner Image"
            class="rounded-md"
          />
        </a>
      {/if}
      <p class="flex-1">{article.text}</p>
    </div>
  </div>
</section>
