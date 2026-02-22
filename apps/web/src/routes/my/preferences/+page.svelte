<script lang="ts">
  import type { PageData } from './$types';
  import type { ActionData } from './$types';
  import Toggle from '$lib/components/Toggle.svelte';
  import { onMount } from 'svelte';

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  let hideToast = $state(false);

  const reqNotifTooltip = 'Required notification - cannot be disabled';

  const notificationKeys = [
    'policyChanges',
    'urgentFirUpdates',
    'trainingUpdates',
    'unauthorizedConnection',
    'newEventPosted',
    'newNewsArticlePosted'
  ] as const;

  let notifications = $state({
    policyChanges: true,
    urgentFirUpdates: true,
    trainingUpdates: true,
    unauthorizedConnection: true,
    newEventPosted: true,
    newNewsArticlePosted: true
  });

  let privacy = $state<{ name: 'full' | 'initial' | 'cid' }>({
    name: 'full'
  });

  onMount(() => {
    setTimeout(() => {
      hideToast = true;
    }, 5000);
  });

  $effect(() => {
    // Use form result preferences if available (after successful submission), otherwise use initial data
    const preferences = form?.preferences ?? data.preferences;

    const getPreferenceValue = (key: string): string | boolean | undefined => {
      if (Array.isArray(preferences)) {
        const preference = preferences.find(
          (entry: { key: string; value: string }) => entry.key === key
        );
        return preference?.value;
      }

      return preferences[key as keyof typeof preferences];
    };

    for (const key of notificationKeys) {
      const value = getPreferenceValue(key);
      notifications[key] = value === true || value === 'true';
    }

    const nameValue = getPreferenceValue('displayName');
    privacy.name =
      nameValue === 'full' || nameValue === 'initial' || nameValue === 'cid' ? nameValue : 'full';
  });
</script>

<section>
  <h1 class="text-2xl font-semibold">Notification Preferences</h1>
  <p class="font-light">
    Notifications will be sent as a private message in Discord and/or as an email from <em
      >noreply@czqm.ca</em
    >. Please ensure the "Allow DMs from other members in this server" privacy setting is enabled in
    Discord to receive notifications.
  </p>
  <p class="mt-1 font-light">
    Some notification types are required and cannot be disabled. Should you have any questions or
    concerns, please contact the webmaster <a href="/contact" class="link">here</a>.
  </p>

  {#if form?.success && !hideToast}
    <div class="alert alert-success mt-4">
      <span>Your preferences have been saved successfully!</span>
    </div>
  {/if}

  <!-- {#if data.discord} -->
  <form method="POST" action="?/savePreferences">
    <input type="text" readonly hidden name="type" value="notification" />
    <div class="mt-6 flex flex-col gap-3 overflow-x-auto">
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
                checked={notifications.policyChanges}
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
                checked={notifications.urgentFirUpdates}
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
                checked={notifications.trainingUpdates}
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
                checked={notifications.unauthorizedConnection}
                readonly
                tooltip={reqNotifTooltip}
              /></td
            >
          </tr>
          <tr class="h-10">
            <td class="py-1 text-gray-400">Event Posted</td>
            <td class="py-1"
              ><Toggle name="newEventPosted" checked={notifications.newEventPosted} /></td
            >
          </tr>
          <tr class="h-10">
            <td class="py-1 text-gray-400">News Article Posted</td>
            <td class="py-1"
              ><Toggle
                name="newNewsArticlePosted"
                checked={notifications.newNewsArticlePosted}
              /></td
            >
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-6">
      <button type="submit" class="btn btn-primary">Save Notification Preferences</button>
    </div>
  </form>
  <!-- {:else}
    <h2 class="mt-6 text-center text-xl font-semibold">
      You must have your Discord account linked to configure notifications!
    </h2>
    <p class="text-center">
      Please link your Discord account <a href="/my/integrations" class="hover:link text-blue-400"
        >here</a
      >.
    </p>
  {/if} -->
  <h1 class="mt-5 text-2xl font-semibold">Privacy Preferences</h1>
  <p class="font-light">
    Our members privacy and safety is our priority. Please adjust the settings below to allow us to
    best cater to your privacy needs. Should you have any questions regarding your privaxy, please
    see our <a href="/privacy" class="link">privacy policy</a> or
    <a href="/contact" class="link">contact us</a>.
  </p>

  <form method="POST" action="?/savePreferences" class="my-6 flex flex-row gap-3">
    <input type="text" readonly hidden name="type" value="privacy" />

    <div class="flex flex-col gap-3 overflow-x-auto">
      <table class="table-compact table w-full max-w-md">
        <thead>
          <tr>
            <th class="py-2">Privacy Setting</th>
            <th class="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr class="h-10">
            <td class="py-1 text-gray-400">Display Name</td>
            <td class="py-1"
              ><select name="name" id="name" class="select" value={privacy.name}>
                <option value="full">{data.user.name_full} {data.user.cid} (full name)</option>
                <option value="initial"
                  >{data.user.name_first}
                  {data.user.name_last[0]}
                  {data.user.cid} (last initial)</option
                >
                <option value="cid">{data.user.cid} (cid only)</option>
              </select></td
            >
          </tr>
        </tbody>
      </table>
      <div class="mt-6">
        <button type="submit" class="btn btn-primary">Save Privacy Preferences</button>
      </div>
    </div>
  </form>
</section>
