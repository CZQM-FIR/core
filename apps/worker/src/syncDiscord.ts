import { Client } from '@libsql/client';
import { type } from 'arktype';
import { LibSQLDatabase } from 'drizzle-orm/libsql';

export const syncDiscord = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
  console.log('Syncing Discord members...');

  const requests: {
    method: string;
    endpoint: string;
    body?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }[] = [];

  const priorityRequests: {
    method: string;
    endpoint: string;
    body?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }[] = [];

  const rolesData = await fetch(`https://discord.com/api/guilds/${env.DISCORD_GUILD_ID}/roles`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const RolesData = type({
    id: 'string.integer',
    name: 'string',
    managed: 'boolean'
  }).array();

  const guildRoles = RolesData(await rolesData.json());

  if (guildRoles instanceof type.errors) {
    console.error('Invalid roles data:', guildRoles.summary);
    return;
  }

  const membersData = await fetch(
    `https://discord.com/api/guilds/${env.DISCORD_GUILD_ID}/members?limit=1000`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const MembersData = type({
    roles: 'string.integer[]',
    nick: 'string | null',
    user: {
      id: 'string.integer'
    }
  }).array();

  const members = MembersData(await membersData.json());

  console.log(`Fetched ${members.length} members from Discord.`);

  if (members instanceof type.errors) {
    console.error('Invalid members data:', members.summary);
    return;
  }

  const integrations = await db.query.integrations.findMany({
    with: {
      user: {
        with: {
          rating: true,
          flags: {
            with: {
              flag: true
            }
          }
        }
      }
    }
  });

  console.log(`Fetched ${integrations.length} integrations from the database.`);

  const uncachedMembers = [];
  for (const member of members) {
    const cached = await env.CZQM_CACHE.get(`discord:${member.user.id}`);
    if (cached) {
      console.log(`Cached member: ${member.user.id} (${member.nick || member.user.id})`);
      continue;
    } else {
      uncachedMembers.push(member);
    }
    if (uncachedMembers.length >= 45) break;
  }

  for (const member of uncachedMembers) {
    if (!integrations.some((i) => i.integrationUserId === member.user.id)) {
      console.log(`Unlinked member: ${member.user.id} (${member.nick || member.user.id})`);
      await env.CZQM_CACHE.put(`discord:${member.user.id}`, 'true', {
        expirationTtl: 60 * 2 // 2 minutes
      });

      requests.push({
        method: 'PATCH',
        endpoint: `/guilds/${env.DISCORD_GUILD_ID}/members/${member.user.id}`,
        body: JSON.stringify({
          roles: [],
          nick: null
        }),
        headers: {
          'X-Audit-Log-Reason': 'Unlinked Member'
        }
      });
    } else {
      console.log(`Syncing Discord member: ${member.user.id} (${member.nick || member.user.id})`);

      await env.CZQM_CACHE.put(`discord:${member.user.id}`, 'true', {
        expirationTtl: 60 * 15 // 15 min
      });

      const user = integrations.find((i) => i.integrationUserId === member.user.id)!.user;

      const roles: string[] = [];

      // ratings
      const ratingRoleMap: Record<string, string> = {
        INAC: 'Inactive',
        SUS: 'Suspended',
        OBS: 'Observer',
        S1: 'Student 1',
        S2: 'Student 2',
        S3: 'Student 3',
        C1: 'Controller 1',
        C3: 'Controller 3',
        I1: 'Instructor 1',
        I3: 'Instructor 3',
        SUP: 'Supervisor',
        ADM: 'Admin'
      };
      const roleName = user?.rating.short && ratingRoleMap[user.rating.short];
      if (roleName) {
        const role = guildRoles.find((r) => r.name === roleName);
        if (role) {
          roles.push(role.id);
        }
      }

      // flags
      const flagRoleMap: Record<string, string> = {
        controller: 'Home Controller',
        visitor: 'Visitor',
        staff: 'Staff',
        chief: 'FIR Chief',
        deputy: 'Deputy Chief',
        'chief-instructor': 'Chief Instructor',
        events: 'Events Coordinator',
        web: 'Webmaster',
        sector: 'Facility Engineer',
        instructor: 'Instructor',
        mentor: 'Mentor'
      };
      for (const flag of user!.flags) {
        const roleName = flagRoleMap[flag.flag.name];
        if (roleName) {
          const role = guildRoles.find((r) => r.name === roleName);
          if (role) {
            roles.push(role.id);
          }
        }
      }

      // student role
      if (
        user &&
        user.flags.some((f) => f.flag.name === 'controller') &&
        user.ratingID >= 2 &&
        user.ratingID <= 4
      ) {
        const role = guildRoles.find((r) => r.name === 'Student');
        if (role) {
          roles.push(role.id);
        }
      }

      // if user is not a controller or visitor, add the 'Guest' role
      if (!user?.flags.some((f) => ['controller', 'visitor'].includes(f.flag.name))) {
        const guestRole = guildRoles.find((r) => r.name === 'Guest');
        if (guestRole) {
          roles.push(guestRole.id);
        }
      }

      const nick = user?.name_full || '';

      const additionalRoles = member.roles.filter(
        (roleId) =>
          !roles.some((role) => role === roleId) &&
          ![
            'Guest',
            'Inactive',
            'Suspended',
            'Observer',
            'Student 1',
            'Student 2',
            'Student 3',
            'Controller 1',
            'Controller 3',
            'Instructor 1',
            'Instructor 3',
            'Supervisor',
            'Admin',
            'Home Controller',
            'Visitor',
            'Staff',
            'FIR Chief',
            'Deputy Chief',
            'Chief Instructor',
            'Events Coordinator',
            'Webmaster',
            'Facility Engineer'
          ].includes(guildRoles.find((r) => r.id === roleId)?.name || '')
      );

      roles.push(...additionalRoles);

      priorityRequests.push({
        method: 'PATCH',
        endpoint: `/guilds/${env.DISCORD_GUILD_ID}/members/${member.user.id}`,
        body: JSON.stringify({
          roles,
          nick
        }),
        headers: {
          'X-Audit-Log-Reason': 'Linked Member'
        }
      });
    }
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for await (const request of [...priorityRequests, ...requests]) {
    const { method, endpoint, body, headers, query } = request;
    const url = new URL('/api' + endpoint, 'https://discord.com');
    if (query) {
      Object.entries(query).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        ...headers,
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      console.error(
        `Discord API request failed: ${response.status} ${response.statusText} for ${url.href}`
      );
    } else {
      console.log(
        `Discord API request successful: ${response.status} ${response.statusText} for ${url.href}`
      );
    }

    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
      const currentTime = Date.now();
      const waitTime = resetTime - currentTime + 1000; // add a buffer of 1 second
      console.log(`Rate limit hit, waiting for ${waitTime}ms`);
      await sleep(waitTime);
    } else {
      await sleep(500);
    }
  }

  console.log('Discord members sync completed.');
};
