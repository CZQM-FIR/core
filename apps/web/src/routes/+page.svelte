<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<section id="hero" class="hero min-h-screen">
  <div class="hero-overlay bg-opacity-60"></div>
  <div class="hero-content text-neutral-content text-center">
    <div class="max-w-md">
      <h1 class="mb-5 text-5xl font-bold">Canada's Gateway to the East Coast</h1>
      <p class="mb-5">
        Providing realistic ATC services across the maritime provinces on the VATSIM network.
      </p>
      <a href="/about" class="btn btn-primary">Learn More</a>
    </div>
  </div>
</section>

<section class="bg-primary min-h-30 py-8">
  <div class="container mx-auto">
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <h1 class="mb-3 text-3xl font-semibold">
          Top Controllers for {new Date().toLocaleString('en-US', { month: 'long' })}
        </h1>
        <ul class="bg-base-100 max-w-120 rounded px-4 py-3">
          {#each data.top5Controllers as controller, i}
            <li>
              #{i + 1}
              <a href="/controller/{controller.cid}" class="hover:link text-lg font-semibold"
                >{controller.name_full}</a
              >
              - {(controller.totalDuration / 3600).toFixed(2)}
              hours
              {#if i < 4}
                <div class="divider m-0"></div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      <div>
        <h1 class="mb-3 text-3xl font-semibold">Upcomming Events</h1>
        <ul class="bg-base-100 max-w-120 rounded px-4 py-3">
          {#if data.events.length === 0}
            <p class="w-full text-center">No Upcoming Events</p>
          {/if}
          {#each data.events as event}
            <li>
              <a href="/event/{event.id}" class="hover:link">
                <span class="text-lg font-semibold">{event.name}</span>
                <span class="font-light">
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
                  })}z</span
                >
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</section>

<style>
  #hero {
    background:
      linear-gradient(rgba(0, 0, 0, 0.473), rgba(0, 0, 0, 0.473)),
      url('https://files.czqm.ca/images/hero-bg.jpg') no-repeat center / cover;
  }
</style>
