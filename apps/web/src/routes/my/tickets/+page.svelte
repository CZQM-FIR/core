<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="flex w-full flex-col">
  {#each data.user!.tickets as ticket}
    <a
      href={`/my/tickets/${ticket.createdAt}`}
      class="flex flex-row items-baseline gap-3 rounded-lg bg-base-300 p-3 px-5"
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
</div>
