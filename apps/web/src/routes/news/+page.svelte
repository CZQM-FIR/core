<script lang="ts">
  import type { PageData } from './$types';
  import Icon from '@iconify/svelte';

  let { data }: { data: PageData } = $props();

  const truncate = (str: string, n: number) => {
    const firstSentence = str.split('. ')[0];
    if (firstSentence.length > n) {
      return firstSentence.slice(0, n) + '...';
    } else {
      return firstSentence;
    }
  };
</script>

<section id="join" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="pt-6 text-2xl">What's going on in the FIR?</h1>
    <div class="divider"></div>
    {#if data.news.length === 0}
      <p class="w-full text-center">No Articles Found</p>
    {/if}
    <div class="flex flex-row flex-wrap gap-3">
      {#each data.news as article}
        <a href="/news/{article.id}">
          <div class="card card-compact bg-base-300 w-96 shadow-xl">
            {#if article.image}
              <figure>
                <img
                  src="https://files.czqm.ca/{article.image}"
                  alt="{article.title} Banner Image"
                />
              </figure>
            {/if}
            <div class="card-body">
              <div class="flex flex-row items-center gap-3">
                <h2 class="card-title">{article.title}</h2>
                <div class="badge badge-neutral">
                  {new Date(article.date).toLocaleString('en-US', {
                    month: 'short',
                    day: '2-digit'
                  })}
                </div>
              </div>
              <p>{truncate(article.text, 100)}</p>
              <div class="badge badge-neutral flex flex-row gap-1">
                <Icon icon="mdi:account" />
                <p>{article.author?.name_full}</p>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>
