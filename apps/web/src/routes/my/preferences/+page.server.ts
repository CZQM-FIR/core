import { db } from '$lib/db';
import { preferences } from '@czqm/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.cid, locals.user.cid),
    with: {
      flags: {
        with: {
          flag: true
        }
      },
      preferences: true,
      integrations: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.integrations.filter((i) => i.type === 0).length === 0) {
    return {
      discord: false
    };
  }

  return {
    discord: true,
    preferences: user.preferences
  };
}) satisfies PageServerLoad;

export const actions = {
  savePreferences: async ({ request, locals }) => {
    const formData = await request.formData();
    const cid = locals.user.cid;

    // List of all preference keys from the form
    const preferenceKeys = [
      'policyChanges',
      'urgentFirUpdates',
      'trainingUpdates',
      'unauthorizedConnection',
      'newEventPosted',
      'newNewsArticlePosted'
    ];

    // Process each preference
    for (const key of preferenceKeys) {
      const value = formData.get(key) === 'on' ? 'true' : 'false';

      // Check if preference already exists
      const existingPreference = await db.query.preferences.findFirst({
        where: and(eq(preferences.cid, cid), eq(preferences.key, key))
      });

      if (existingPreference) {
        // Update existing preference
        await db
          .update(preferences)
          .set({ value })
          .where(and(eq(preferences.cid, cid), eq(preferences.key, key)));
      } else {
        // Insert new preference
        await db.insert(preferences).values({
          cid,
          key,
          value
        });
      }
    }

    // Fetch and return the updated preferences
    const updatedPreferences = await db.query.preferences.findMany({
      where: eq(preferences.cid, cid)
    });

    return {
      success: true,
      preferences: updatedPreferences
    };
  }
} satisfies Actions;
