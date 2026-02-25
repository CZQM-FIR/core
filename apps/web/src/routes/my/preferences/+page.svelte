<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import type { PageProps } from './$types';
  import { getMyPreferences } from '$lib/remote/preferences.remote';
  import Toggle from '$lib/components/Toggle.svelte';

  let { data, form }: PageProps = $props();

  const prefsPromise = getMyPreferences();
  let preferences: Record<string, string | boolean> | Array<{ key: string; value: string }> =
    $state({});
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

  type FormResult = {
    success?: boolean;
    savedType?: 'notification' | 'privacy' | null;
    preferences?: Array<{ key: string; value: string }> | null;
  };
  const formResult = $derived((form as FormResult | null) ?? null);

  $effect(() => {
    prefsPromise.then((p) => {
      preferences = p.preferences;
    });
  });

  $effect(() => {
    const prefs = formResult?.preferences ?? preferences;
    const getPreferenceValue = (key: string): string | boolean | undefined => {
      if (Array.isArray(prefs)) {
        const preference = prefs.find((entry: { key: string; value: string }) => entry.key === key);
        return preference?.value;
      }
      return prefs[key as keyof typeof prefs];
    };
    for (const key of notificationKeys) {
      const value = getPreferenceValue(key);
      notifications[key] = value === true || value === 'true';
    }
    const nameValue = getPreferenceValue('displayName');
    privacy.name =
      nameValue === 'full' || nameValue === 'initial' || nameValue === 'cid' ? nameValue : 'full';
  });

  $effect(() => {
    if (formResult?.success) {
      hideToast = false;
      const t = setTimeout(() => {
        hideToast = true;
      }, 5000);
      return () => clearTimeout(t);
    }
  });

  const noRefreshEnhance = () => {
    return async ({ result }: { result: Parameters<typeof applyAction>[0] }) => {
      await applyAction(result);
    };
  };
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

  {#if formResult?.success && formResult?.savedType === 'notification' && !hideToast}
    <div class="alert alert-success mt-4" aria-live="polite">
      <span>Your notification preferences have been saved successfully!</span>
    </div>
  {/if}

  <!-- {#if data.discord} -->
  {#await prefsPromise}
    <p class="p-4">Loading preferences...</p>
  {:then _}
    <form action="?/savePreferences" method="post" use:enhance={noRefreshEnhance}>
      <input type="hidden" name="type" value="notification" />
      {#each notificationKeys as key}
        <input type="hidden" name={key} value={notifications[key] ? 'on' : 'off'} />
      {/each}
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
      Our members privacy and safety is our priority. Please adjust the settings below to allow us
      to best cater to your privacy needs. Should you have any questions regarding your privaxy,
      please see our <a href="/privacy" class="link">privacy policy</a> or
      <a href="/contact" class="link">contact us</a>.
    </p>

    {#if formResult?.success && formResult?.savedType === 'privacy' && !hideToast}
      <div class="alert alert-success mt-4" aria-live="polite">
        <span>Your privacy preferences have been saved successfully!</span>
      </div>
    {/if}

    <form
      action="?/savePreferences"
      method="post"
      class="my-6 flex flex-row gap-3"
      use:enhance={noRefreshEnhance}
    >
      <input type="hidden" name="type" value="privacy" />
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
                ><select name="name" id="name" class="select" bind:value={privacy.name}>
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
  {:catch err}
    <p class="text-error p-4">{err?.message ?? 'Failed to load preferences.'}</p>
  {/await}
</section>
