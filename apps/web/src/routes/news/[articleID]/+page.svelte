<script lang="ts">
  import { page } from '$app/state';
  import { getNewsArticle } from '$lib/remote/news.remote';
  import { marked } from 'marked';
  import sanitizeHtml from 'sanitize-html';
  import { User } from '@lucide/svelte';

  const articleID = $derived(Number(page.params.articleID));
</script>

{#await getNewsArticle(articleID)}
  <section id="event" class="min-h-screen">
    <div class="container mx-auto py-6">Loading article...</div>
  </section>
{:then article}
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
          <p>{article.author?.displayName || 'CZQM Staff'}</p>
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
{:catch}
  <section id="event" class="min-h-screen">
    <div class="container mx-auto py-6">Article not found.</div>
  </section>
{/await}
