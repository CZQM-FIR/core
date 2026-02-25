<script lang="ts">
  import { getMyTickets } from '$lib/remote/tickets.remote';

  const ticketsData = getMyTickets();
</script>

<div class="flex w-full flex-col">
  {#await ticketsData}
    <p class="p-4">Loading...</p>
  {:then data}
    {#each data.user?.authoredTickets ?? [] as ticket}
      <a
        href={`/my/tickets/${ticket.createdAt}`}
        class="bg-base-300 flex flex-row items-baseline gap-3 rounded-lg p-3 px-5"
      >
        <div class="text-lg font-bold">{ticket.subject}</div>
        <p class="text-md font-light">
          {new Date(ticket.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
          {new Date(ticket.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}
        </p>
        <p class="text-md ms-auto font-light">Messages: {ticket.messages.length}</p>
      </a>
    {/each}
  {:catch err}
    <p class="text-error p-4">{err?.message ?? 'Failed to load tickets.'}</p>
  {/await}
</div>
