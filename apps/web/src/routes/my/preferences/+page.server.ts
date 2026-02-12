import { db } from '$lib/db';
import { preferences } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  const user = await db.query.users.findFirst({
    where: { cid: locals.user.cid },
    with: {
      flags: true,
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

    const type = formData.get('type');

    // List of all preference keys from the form
    const preferenceKeys =
      type === 'notification'
        ? [
            'policyChanges',
            'urgentFirUpdates',
            'trainingUpdates',
            'unauthorizedConnection',
            'newEventPosted',
            'newNewsArticlePosted'
          ]
        : type === 'privacy'
          ? []
          : [];

    // Process each preference
    if (type === 'notification') {
      for (const key of preferenceKeys) {
        const value = formData.get(key) === 'on' ? 'true' : 'false';

        // Upsert preference
        await db
          .insert(preferences)
          .values({
            cid,
            key,
            value
          })
          .onConflictDoUpdate({
            target: [preferences.cid, preferences.key],
            set: { value }
          });
      }
    } else if (type === 'privacy') {
      const name = formData.get('name') as string;

      // Validate the value
      const validValues = ['full', 'initial', 'cid'];
      if (!validValues.includes(name)) {
        return {
          success: false,
          error: 'Invalid value for display name preference.'
        };
      }

      await db
        .insert(preferences)
        .values({
          cid,
          key: 'displayName',
          value: name
        })
        .onConflictDoUpdate({
          target: [preferences.cid, preferences.key],
          set: { value: name }
        });
    }

    // Fetch and return the updated preferences
    const updatedPreferences = await db.query.preferences.findMany({
      where: { cid }
    });

    return {
      success: true,
      preferences: updatedPreferences
    };
  }
} satisfies Actions;
