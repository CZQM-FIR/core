<script lang="ts">
  import sanitize from 'sanitize-html';
  import type { PageData } from './$types';
  import { marked } from 'marked';

  let { data }: { data: PageData } = $props();

  let event = $derived(data.event);
</script>

<svelte:head>
  <meta
    name="description"
    content={event.description.length > 160
      ? event.description.slice(0, 157) + '...'
      : event.description}
  />

  <!-- Twitter meta tags -->
  <meta name="twitter:card" content={event.image ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content="{event.name} - Moncton / Gander FIR" />
  <meta
    name="twitter:description"
    content={event.description.length > 160
      ? event.description.slice(0, 157) + '...'
      : event.description}
  />
  <meta
    name="twitter:image"
    content="https://files.czqm.ca/{event.image || 'upload/1750000219576-CZQM.png'}"
  />
  <meta name="twitter:site" content="@CZQM_FIR" />

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{event.name} - Moncton / Gander FIR" />
  <meta
    property="og:description"
    content={event.description.length > 160
      ? event.description.slice(0, 157) + '...'
      : event.description}
  />
  <meta
    property="og:image"
    content="https://files.czqm.ca/{event.image || 'upload/1750000219576-CZQM.png'}"
  />
  <meta property="og:url" content={'https://czqm.ca/events/' + event.id} />
  <meta property="og:site_name" content="CZQM FIR" />
</svelte:head>

<section id="event" class="min-h-screen">
  <div class="container mx-auto">
    <div class="mt-6 flex flex-row items-center gap-3">
      <h1 class="text-2xl">{event.name}</h1>
      <div class="badge badge-neutral">
        {new Date(event.start).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          timeZone: 'UTC'
        })}
        {new Date(event.start).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC'
        })}z -
        {new Date(event.end).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC'
        })}z
      </div>
    </div>
    <div class="divider"></div>
    <div class="grid grid-cols-2 grid-rows-1 gap-3">
      <a href="https://files.czqm.ca/{event.image}" class="cursor-zoom-in" target="_blank">
        <img
          src="https://files.czqm.ca/{event.image}"
          alt="{event.name} Banner Image"
          class="rounded-md"
        />
      </a>
      <div class="prose flex-1">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html sanitize(marked.parse(event.description, { async: false }))}
      </div>
    </div>
  </div>
</section>
