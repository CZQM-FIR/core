<script lang="ts">
  import sanitize from 'sanitize-html';
  import type { PageData } from './$types';
  import { marked } from 'marked';

  let { data }: { data: PageData } = $props();

  let event = $derived(data.event);
</script>

<section id="event" class="min-h-screen">
  <div class="container mx-auto">
    <div class="mt-6 flex flex-row items-center gap-3">
      <h1 class="text-2xl">{event.name}</h1>
      <div class="badge badge-neutral">
        {new Date(event.start).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit'
        })}
        {new Date(event.start).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}z -
        {new Date(event.end).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
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
      <div class="prose flex-1">{sanitize(marked.parse(event.description, { async: false }))}</div>
    </div>
  </div>
</section>
