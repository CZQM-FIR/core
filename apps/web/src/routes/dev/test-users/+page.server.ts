import type { Actions, PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { TestUserSeeder } from '@czqm/common';

function assertDev() {
  if (!dev) {
    throw error(404, 'Not found');
  }
}

export const load = (async () => {
  assertDev();

  return {
    users: TestUserSeeder.definitions.map((definition) => ({
      cid: definition.cid,
      ratingLabel: definition.ratingLabel,
      description: definition.description,
      flags: definition.flags,
      roster: definition.roster
    }))
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  seed: async () => {
    assertDev();

    try {
      const seeded = await TestUserSeeder.seedAll(db);
      return {
        ok: true,
        message: `Inserted/reset ${seeded.length} test users.`
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to insert test users';
      return fail(500, { ok: false, message });
    }
  }
};
