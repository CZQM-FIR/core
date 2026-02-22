<script lang="ts">
  import { enhance } from '$app/forms';
  import { Info } from '@lucide/svelte';

  let { data = $bindable(), form } = $props();

  let activityModal: HTMLDialogElement | null | undefined = $state();
  let externalModal: HTMLDialogElement | null | undefined = $state();

  let user = $state(data.user!);
  let bio = $state(user.bio ?? '');

  $effect(() => {
    if (form && typeof form.bio === 'string') {
      bio = form.bio;

      if (form.ok) {
        user.bio = form.bio;
      }
    }
  });
</script>

<div class="flex flex-row flex-wrap gap-3">
  <div class="bg-base-300 rounded-lg p-5">
    <h3 class="text-xl font-semibold">Your Account</h3>
    <div class="mt-2 flex flex-col">
      <p>{user.name_full} {user.cid}</p>
      <p class="font-light">{user.rating.long} ({user.rating.short})</p>
      <p class="font-light">{user.email}</p>

      <label for="incorrect-info" class="text-primary mt-3 cursor-pointer text-sm italic"
        >Incorrect Information?</label
      >

      <input type="checkbox" id="incorrect-info" class="modal-toggle" />
      <div class="modal" role="dialog">
        <div class="modal-box">
          <h3 class="text-lg font-bold">Why is my information wrong?</h3>
          <p class="py-4">We update your user info in a variety of ways:</p>
          <p>
            1) Whenever you log into the website, we pull your latest information directly from
            VATSIM. This is the best way to update your name and email.
          </p>
          <p class="mt-3">
            2) On a regular basis, we reach out to VATSIM and VATCAN to retrive the latest
            information for all users. This is the best way to update your rating
          </p>
          <div class="modal-action">
            <label class="btn" for="incorrect-info">Close</label>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="bg-base-300 flex max-w-96 flex-col gap-2 rounded-lg p-5">
    <h4 class="text-md font-semibold">Controller Bio</h4>
    <p>This bio will appear on your public profile page</p>
    <form action="?/updateBio" method="post" use:enhance>
      <textarea class="textarea" name="bio" bind:value={bio}></textarea>
      <div class="flex flex-row items-center gap-3">
        <button type="submit" class="btn btn-primary btn-outline mt-2">Save</button>
        {#if form}
          <p class="text-sm {form.ok ? 'text-success' : 'text-error'}">
            {form.ok ? '' : 'Error: '}{form.message}
          </p>
        {/if}
      </div>
    </form>
  </div>
  <div class="bg-base-300 flex w-96 flex-col gap-2 rounded-lg p-5">
    <div>
      <h4 class="text-md font-semibold">Controller Hours</h4>
      {#if user.flags.some((f) => [3].includes(f.id))}
        <p class="text-sm text-gray-300 italic">You are exempt from activity requirements.</p>
      {/if}
    </div>

    {#if user.flags.some((f) => [4, 5].includes(f.id))}
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th class="">Period</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>This Month</td>
              <td>{user.hours.thisMonth.toFixed(2)}</td>
            </tr><tr>
              <td>This Quarter</td>
              <td>{user.hours.thisQuarter.toFixed(2)}</td>
            </tr>
            <tr>
              <td>This Year</td>
              <td>{user.hours.thisYear.toFixed(2)}</td>
            </tr>
            <tr>
              <td
                onclickcapture={() => activityModal?.showModal()}
                class="hover:link flex items-baseline gap-2">Activity Hours <Info size="15" /></td
              >
              <td class={user.hours.meetingActivityRequirement ? 'text-warning' : ''}
                >{user.hours.thisActivityHours.toFixed(2)}
                {user.hours.meetingActivityRequirement ? '/ 3' : ''}</td
              >
            </tr>
            <tr>
              <td
                onclickcapture={() => externalModal?.showModal()}
                class="hover:link flex items-baseline gap-2">External Hours <Info size="15" /></td
              >
              <td
                class={user.flags.some((f) => f.id === 5) &&
                user.hours.thisQuarterExternal >= user.hours.thisActivityHours
                  ? 'text-error'
                  : ''}>{user.hours.thisQuarterExternal.toFixed(2)}</td
              >
            </tr>
            <tr>
              <td>All Time</td>
              <td>{user.hours.allTime.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <a class="link mt-auto" target="_blank" href={`https://stats.vatsim.net/stats/${user.cid}`}
        >View All Hours</a
      >
    {:else}
      <p class="py-3">
        Controller hour tracking is only available for CZQM Home Controllers and Visiting
        Controllers.
      </p>
      <p>
        View your controlling hours <a
          href={`https://stats.vatsim.net/stats/${user.cid}`}
          class="link">here</a
        >.
      </p>
    {/if}

    <dialog class="modal modal-bottom sm:modal-middle" bind:this={activityModal}>
      <div class="modal-box">
        <h3 class="text-lg font-bold">Activity Hours</h3>
        <p class="py-4">
          Activity Hours are the hours spent on CZQM positions that qualify as active time. For S1 -
          S3 controllers, this is any Ground, Tower, Terminal, or Centre position. For C1+
          controllers, this is any Terminal or Centre position. Activity Hours are measured per
          calendar quarter. Controllers are required to maintain a minimum of 3 active hours per
          quarter.
        </p>
        <div class="modal-action">
          <form method="dialog">
            <!-- if there is a button in form, it will close the modal -->
            <button class="btn">Close</button>
          </form>
        </div>
      </div>
    </dialog>

    <dialog class="modal modal-bottom sm:modal-middle" bind:this={externalModal}>
      <div class="modal-box">
        <h3 class="text-lg font-bold">External Hours</h3>
        <p class="py-4">
          External hours are hours connected to the VATSIM network as a controller in another FIR /
          ARTCC. For CZQM / QX Home Controllers, this number must be less than your activity hours
          for the quarter. For CZQM / QX Visiting Controller, this number must be equal to or more
          than your activity hours for the quarter.
        </p>
        <div class="modal-action">
          <form method="dialog">
            <!-- if there is a button in form, it will close the modal -->
            <button class="btn">Close</button>
          </form>
        </div>
      </div>
    </dialog>
  </div>
</div>
