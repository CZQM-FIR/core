<script lang="ts">
  import { page } from '$app/state';
  import { getEvent } from '$lib/remote/events.remote';
  import sanitize from 'sanitize-html';
  import { marked } from 'marked';

  const eventID = $derived(Number(page.params.eventID));
</script>

{#await getEvent(eventID)}
  <section id="event" class="min-h-screen">
    <div class="container mx-auto py-6">Loading event...</div>
  </section>
{:then event}
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
{:catch}
  <section id="event" class="min-h-screen">
    <div class="container mx-auto py-6">Event not found.</div>
  </section>
{/await}
