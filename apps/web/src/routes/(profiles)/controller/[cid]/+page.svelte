<script lang="ts">
  import { getRosterStatus } from '$lib/utilities/getRosterStatus';
  import RosterStatusIndicator from '../../../roster/RosterStatusIndicator.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let user = $state(data.userData);

  let sessions = user?.sessions
    ?.filter((s) => s.positionId !== -1)
    .sort((a, b) => {
      return new Date(b.logonTime).getTime() - new Date(a.logonTime).getTime();
    })
    .slice(0, 10);

  let thisMonth = user?.sessions
    ?.filter((s) => s.positionId !== -1)
    .filter((s) => {
      let date = new Date(s.logonTime);
      return (
        date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()
      );
    })
    .reduce((acc, session) => {
      return acc + session.duration;
    }, 0);
  let thisYear = user?.sessions
    ?.filter((s) => s.positionId !== -1)
    .filter((s) => {
      let date = new Date(s.logonTime);
      return date.getFullYear() === new Date().getFullYear();
    })
    .reduce((acc, session) => {
      return acc + session.duration;
    }, 0);
  let allTime = user?.sessions
    ?.filter((s) => s.positionId !== -1)
    .reduce((acc, session) => {
      return acc + session.duration;
    }, 0);

  let favPosition: {
    position: { name: string; callsign: string };
    duration: number;
  } | null = $state(null);

  if (user?.sessions) {
    const positionDurations = user.sessions
      .filter((s) => s.positionId !== -1)
      .reduce(
        (
          acc: {
            [positionId: number]: {
              position: { name: string; callsign: string };
              duration: number;
            };
          },
          session
        ) => {
          if (!acc[session.positionId]) {
            acc[session.positionId] = {
              position: session.position,
              duration: 0
            };
          }
          acc[session.positionId].duration += session.duration;
          return acc;
        },
        {}
      );

    const favPositionArray = Object.values(positionDurations);

    favPositionArray.sort((a, b) => {
      return b.duration - a.duration;
    });

    favPosition = favPositionArray[0] ?? null;
  }
</script>

<section>
  <div class="container mx-auto py-6">
    <h1 class="flex flex-row items-baseline gap-3">
      <span class="text-3xl font-semibold">{user?.name_full}</span><span>{data.role}</span>
    </h1>
    <div class="divider"></div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-4">
        <p>{user?.bio}</p>
        <ul>
          <li><span class="font-bold">VATSIM CID: </span> {user?.cid}</li>
          <li>
            <span class="font-bold">Controller Rating: </span>
            {user?.rating.long} ({user?.rating.short})
          </li>
          {#if favPosition}
            <li>
              <span class="font-semibold">Favourite Position:</span>
              {favPosition.position.callsign} ({Math.floor(
                favPosition.duration / 3600
              )}:{Math.floor((favPosition.duration % 3600) / 60)
                .toString()
                .padStart(2, '0')})
            </li>
          {/if}
        </ul>
        <div class="flex flex-row items-center justify-center gap-4">
          {#if getRosterStatus(user, 'gnd') !== -1}
            <RosterStatusIndicator position="Ground" div roster={getRosterStatus(user, 'gnd')} />
          {/if}
          {#if getRosterStatus(user, 'twr') !== -1}
            <RosterStatusIndicator position="Tower" div roster={getRosterStatus(user, 'twr')} />
          {/if}
          {#if getRosterStatus(user, 'app') !== -1}
            <RosterStatusIndicator position="Terminal" div roster={getRosterStatus(user, 'app')} />
          {/if}
          {#if getRosterStatus(user, 'ctr') !== -1}
            <RosterStatusIndicator position="Centre" div roster={getRosterStatus(user, 'ctr')} />
          {/if}
        </div>
        <div class="bg-base-300 rounded-lg p-5">
          <div class="flex flex-row items-center justify-evenly">
            <div class="flex flex-col items-center gap-1">
              <p class="text-2xl font-semibold">
                {Math.floor((thisMonth ?? 0) / 3600)}:{Math.floor(((thisMonth ?? 0) % 3600) / 60)
                  .toString()
                  .padStart(2, '0')}
              </p>
              <p class="text-sm">This Month</p>
            </div>
            <div class="flex flex-col items-center gap-1">
              <p class="text-2xl font-semibold">
                {Math.floor((thisYear ?? 0) / 3600)}:{Math.floor(((thisYear ?? 0) % 3600) / 60)
                  .toString()
                  .padStart(2, '0')}
              </p>
              <p class="text-sm">This Year</p>
            </div>
            <div class="flex flex-col items-center gap-1">
              <p class="text-2xl font-semibold">
                {Math.floor((allTime ?? 0) / 3600)}:{Math.floor(((allTime ?? 0) % 3600) / 60)
                  .toString()
                  .padStart(2, '0')}
              </p>
              <p class="text-sm">All Time</p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="bg-base-300 rounded-lg p-5">
          <h2 class="text-xl font-semibold">Most Recent 10 Connections</h2>
          <div class="overflow-x-auto">
            <table class="table-zebra table">
              <thead>
                <tr>
                  <th></th>
                  <th>Position</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {#each sessions ?? [] as session, i}
                  <tr>
                    <td>{i + 1}</td>
                    <td>{session.position.name} ({session.position.callsign})</td>
                    <td>
                      {new Date(session.logonTime).toLocaleString('en-CA', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td>
                      {Math.floor(session.duration / 3600)}:{Math.floor(
                        (session.duration % 3600) / 60
                      )
                        .toString()
                        .padStart(2, '0')}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
