<script lang="ts">
  import { marked } from 'marked';
  import sanitizeHtml from 'sanitize-html';
  import type { PageData } from './$types';
  import { User } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let article = $derived(data.article);
</script>

<svelte:head>
  <meta
    name="description"
    content={article.text.length > 160 ? article.text.slice(0, 157) + '...' : article.text}
  />

  <!-- Twitter meta tags -->
  <meta name="twitter:card" content={article.image ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content="{article.title} - Moncton / Gander FIR" />
  <meta
    name="twitter:description"
    content={article.text.length > 160 ? article.text.slice(0, 157) + '...' : article.text}
  />
  <meta
    name="twitter:image"
    content="https://files.czqm.ca/{article.image || 'upload/1750000219576-CZQM.png'}"
  />
  <meta name="twitter:site" content="@CZQM_FIR" />

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{article.title} - Moncton / Gander FIR" />
  <meta
    property="og:description"
    content={article.text.length > 160 ? article.text.slice(0, 157) + '...' : article.text}
  />
  <meta
    property="og:image"
    content={'https://files.czqm.ca/' + (article.image || 'upload/1750000219576-CZQM.png')}
  />
  <meta property="og:url" content={'https://czqm.ca/news/' + article.id} />
  <meta property="og:site_name" content="CZQM FIR" />
</svelte:head>

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
        <User size="15" />
        <p>{article.author?.name_full}</p>
      </div>
    </div>
    <div class="divider"></div>
    <div class={article.image ? 'this article has no image' : ''}>
      {#if article.image}
        <a href="https://files.czqm.ca/{article.image}" class="cursor-zoom-in" target="_blank">
          <img
            src="https://files.czqm.ca/{article.image}"
            alt="{article.title} Banner Image"
            class="rounded-md"
          />
        </a>
      {/if}
      <div class="prose my-5 flex-1">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html sanitizeHtml(
          marked.parse(article.text, {
            async: false
          })
        )}
      </div>
    </div>
  </div>
</section>
