<script lang="ts">
  import { getEventsSplit } from '$lib/remote/events.remote';

  const eventsData = getEventsSplit();

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
    <h1 class="mt-6 text-2xl">Upcoming Events</h1>
    <div class="divider"></div>
    {#await eventsData}
      <p class="w-full text-center">Loading events...</p>
    {:then data}
      <div class="flex flex-row flex-wrap gap-5">
        {#if data.upcomingEvents.length === 0}
          <p class="w-full text-center">No Upcoming Events</p>
        {/if}
        {#each data.upcomingEvents as event (event.id)}
          <a href="/events/{event.id}">
            <div class="card card-compact bg-base-300 h-full w-96 shadow-xl">
              <figure>
                <img src="https://files.czqm.ca/{event.image}" alt="{event.name} Banner Image" />
              </figure>
              <div class="card-body">
                <div class="flex flex-row items-center gap-3">
                  <h2 class="card-title">{event.name}</h2>
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
                <p>
                  {truncate(
                    event.description
                      .split('')
                      .filter((i: string) => !['*', '#', '~'].includes(i))
                      .join(''),
                    100
                  )}
                </p>
              </div>
            </div>
          </a>
        {/each}
      </div>

      {#if data.pastEvents.length > 0}
        <h1 class="mt-6 text-2xl">Past Events</h1>
        <div class="divider"></div>
        <div class="flex flex-row flex-wrap gap-5">
          {#each data.pastEvents as event (event.id)}
            <a href="/events/{event.id}">
              <div class="card card-compact bg-base-300 h-full w-96 shadow-xl">
                <figure>
                  <img src="https://files.czqm.ca/{event.image}" alt="{event.name} Banner Image" />
                </figure>
                <div class="card-body">
                  <div class="flex flex-row items-center gap-3">
                    <h2 class="card-title">{event.name}</h2>
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
                  <p>
                    {truncate(
                      event.description
                        .split('')
                        .filter((i: string) => !['*', '#', '~'].includes(i))
                        .join(''),
                      100
                    )}
                  </p>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {:catch}
      <p class="w-full text-center">Unable to load events.</p>
    {/await}
  </div>
</section>
