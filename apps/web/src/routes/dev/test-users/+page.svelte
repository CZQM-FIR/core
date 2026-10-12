<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  let submitting = $state(false);

  const rosterLabels: Record<number, string> = {
    0: 'training',
    2: 'certified'
  };
</script>

<section id="dev-test-users" class="min-h-screen">
  <div class="container mx-auto mb-12">
    <h1 class="mt-6 text-2xl">Dev Test Users</h1>
    <div class="divider"></div>
    <p class="mb-6 max-w-3xl text-sm text-gray-300">
      Inserts (or resets) the VATSIM Auth-Dev test users with the flags and roster certifications
      below. Only available in development. Re-running restores each user to this state.
    </p>

    <form
      method="post"
      action="?/seed"
      class="mb-6 flex flex-row flex-wrap items-center gap-3"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <button type="submit" class="btn btn-primary btn-outline" disabled={submitting}>
        {#if submitting}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Insert test users
      </button>
      {#if form?.message}
        <p class="text-sm {form.ok ? 'text-success' : 'text-error'}">
          {form.ok ? '' : 'Error: '}{form.message}
        </p>
      {/if}
    </form>

    <table class="table-zebra table">
      <thead>
        <tr>
          <th>CID</th>
          <th>Rating</th>
          <th>Role</th>
          <th>Flags</th>
          <th>Roster</th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as user (user.cid)}
          <tr>
            <td class="font-medium">{user.cid}</td>
            <td>{user.ratingLabel}</td>
            <td>{user.description}</td>
            <td>
              {#if user.flags.length === 0}
                <span class="text-gray-400">none</span>
              {:else}
                {#each user.flags as flag (flag)}
                  <span class="badge badge-neutral mr-1">{flag}</span>
                {/each}
              {/if}
            </td>
            <td>
              {#if user.roster.length === 0}
                <span class="text-gray-400">none</span>
              {:else}
                {#each user.roster as entry (entry.position)}
                  <span class="badge badge-outline mr-1">
                    {entry.position}: {rosterLabels[entry.status]}
                  </span>
                {/each}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
