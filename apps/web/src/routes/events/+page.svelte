<script lang="ts">
  import type { PageData } from './$types';

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

<section id="resources" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="mt-6 text-2xl">Upcomming Events</h1>
    <div class="divider"></div>

    <div class="flex flex-row flex-wrap">
      {#if data.upcomingEvents.length === 0}
        <p class="w-full text-center">No Upcoming Events</p>
      {/if}
      {#each data.upcomingEvents as event}
        <a href="/events/{event.id}">
          <div class="card card-compact bg-base-300 w-96 shadow-xl">
            <figure>
              <img src="https://files.czqm.ca/{event.image}" alt="{event.name} Banner Image" />
            </figure>
            <div class="card-body">
              <div class="flex flex-row items-center gap-3">
                <h2 class="card-title">{event.name}</h2>
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
              <p>{truncate(event.description, 100)}</p>
            </div>
          </div>
        </a>
      {/each}
    </div>

    {#if data.pastEvents.length > 0}
      <h1 class="mt-6 text-2xl">Past Events</h1>
      <div class="divider"></div>
      <div class="flex flex-row flex-wrap">
        {#each data.pastEvents as event}
          <a href="/events/{event.id}">
            <div class="card card-compact bg-base-300 w-96 shadow-xl">
              <figure>
                <img
                  src="https://files.czqm.ca/event/{event.image}"
                  alt="{event.name} Banner Image"
                />
              </figure>
              <div class="card-body">
                <div class="flex flex-row items-center gap-3">
                  <h2 class="card-title">{event.name}</h2>
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
                <p>{truncate(event.description, 100)}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
