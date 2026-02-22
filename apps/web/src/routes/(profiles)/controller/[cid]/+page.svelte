<script lang="ts">
  import RosterStatusIndicator from '../../../roster/RosterStatusIndicator.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let user = $derived(data.userData);

  let sessions = $derived(
    user?.sessions
      ?.filter((s) => s.positionId !== -1 && s.positionId !== 0)
      .sort((a, b) => {
        return new Date(b.logonTime).getTime() - new Date(a.logonTime).getTime();
      })
      .slice(0, 10)
  );

  let thisMonth = $derived(
    user?.sessions
      ?.filter((s) => s.positionId !== -1)
      .filter((s) => {
        let date = new Date(s.logonTime);
        return (
          date.getMonth() === new Date().getMonth() &&
          date.getFullYear() === new Date().getFullYear()
        );
      })
      .reduce((acc, session) => {
        return acc + session.duration;
      }, 0)
  );
  let thisYear = $derived(
    user?.sessions
      ?.filter((s) => s.positionId !== -1)
      .filter((s) => {
        let date = new Date(s.logonTime);
        return date.getFullYear() === new Date().getFullYear();
      })
      .reduce((acc, session) => {
        return acc + session.duration;
      }, 0)
  );
  let allTime = $derived(
    user?.sessions
      ?.filter((s) => s.positionId !== -1)
      .reduce((acc, session) => {
        return acc + session.duration;
      }, 0)
  );

  let favPosition: {
    position: { name: string; callsign: string };
    duration: number;
  } | null = $derived.by(() => {
    if (!user?.sessions) return null;

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

    let favPositionArray = Object.values(positionDurations);

    favPositionArray = favPositionArray
      .filter((p) => p.position.callsign !== 'EXTERNAL')
      .sort((a, b) => {
        return b.duration - a.duration;
      });

    return favPositionArray[0] ?? null;
  });
</script>

<section>
  <div class="container mx-auto py-6">
    <h1 class="flex flex-row items-baseline gap-3">
      <span class="text-3xl font-semibold">{user.displayName}</span><span>{data.user?.role}</span>
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
          {#if user.roster.gnd !== 'nothing'}
            <RosterStatusIndicator position="Ground" div roster={user.roster.gnd} />
          {/if}
          {#if user.roster.twr !== 'nothing'}
            <RosterStatusIndicator position="Tower" div roster={user.roster.twr} />
          {/if}
          {#if user.roster.app !== 'nothing'}
            <RosterStatusIndicator position="Terminal" div roster={user.roster.app} />
          {/if}
          {#if user.roster.ctr !== 'nothing'}
            <RosterStatusIndicator position="Centre" div roster={user.roster.ctr} />
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
