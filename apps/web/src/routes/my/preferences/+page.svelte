<script lang="ts">
  import type { PageData } from './$types';
  import type { ActionData } from './$types';
  import Toggle from '$lib/components/Toggle.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const reqNotifTooltip = 'Required notification - cannot be disabled';

  // Function to get preference value, defaulting to true (on) if not found
  function getPreferenceValue(key: string): boolean {
    // Use form result preferences if available (after successful submission), otherwise use initial data
    const preferences = form?.preferences || data.preferences;
    if (!preferences) return true;
    const preference = preferences.find((p) => p.key === key);
    return preference ? preference.value === 'true' : true;
  }
</script>

<section>
  <h1 class="text-2xl font-semibold">Notification Preferences</h1>
  <p class="font-light">
    Notifications will be sent as a private message in Discord. Please ensure the "Allow DMs from
    other members in this server" privacy setting is enabled to receive notifications.
  </p>

  {#if form?.success}
    <div class="alert alert-success mt-4">
      <span>Your notification preferences have been saved successfully!</span>
    </div>
  {/if}

  {#if data.discord}
    <form method="POST" action="?/savePreferences">
      <div class="mt-6 overflow-x-auto">
        <table class="table-compact table w-full max-w-md">
          <thead>
            <tr>
              <th class="py-2">Notification Type</th>
              <th class="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr class="h-10">
              <td class="py-1 text-gray-400">Policy Changes</td>
              <td class="py-1"
                ><Toggle
                  name="policyChanges"
                  checked={getPreferenceValue('policyChanges')}
                  readonly
                  tooltip={reqNotifTooltip}
                /></td
              >
            </tr>
            <tr class="h-10">
              <td class="py-1 text-gray-400">Important / Urgent FIR Updates</td>
              <td class="py-1"
                ><Toggle
                  name="urgentFirUpdates"
                  checked={getPreferenceValue('urgentFirUpdates')}
                  readonly
                  tooltip={reqNotifTooltip}
                /></td
              >
            </tr>
            <tr class="h-10">
              <td class="py-1 text-gray-400">Training Updates</td>
              <td class="py-1"
                ><Toggle
                  name="trainingUpdates"
                  checked={getPreferenceValue('trainingUpdates')}
                  readonly
                  tooltip={reqNotifTooltip}
                /></td
              >
            </tr>
            <tr class="h-10">
              <td class="py-1 text-gray-400">Unauthorized Connection Alerts </td>
              <td class="py-1"
                ><Toggle
                  name="unauthorizedConnection"
                  checked={getPreferenceValue('unauthorizedConnection')}
                  readonly
                  tooltip={reqNotifTooltip}
                /></td
              >
            </tr>
            <tr class="h-10">
              <td class="py-1 text-gray-400">Event Posted</td>
              <td class="py-1"
                ><Toggle name="newEventPosted" checked={getPreferenceValue('newEventPosted')} /></td
              >
            </tr>
            <tr class="h-10">
              <td class="py-1 text-gray-400">News Article Posted</td>
              <td class="py-1"
                ><Toggle
                  name="newNewsArticlePosted"
                  checked={getPreferenceValue('newNewsArticlePosted')}
                /></td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-6">
        <button type="submit" class="btn btn-primary">Save Preferences</button>
      </div>
    </form>
  {:else}
    <h2 class="mt-6 text-center text-xl font-semibold">
      You must have your Discord account linked to configure notifications!
    </h2>
    <p class="text-center">
      Please link your Discord account <a href="/my/integrations" class="hover:link text-blue-400"
        >here</a
      >.
    </p>
  {/if}
</section>
