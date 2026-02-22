import { db } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
  const user = await User.fromCid(db, locals.user.cid);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    preferences: user.getAllPreferences()
  };
}) satisfies PageServerLoad;

export const actions = {
  savePreferences: async ({ request, locals }) => {
    const formData = await request.formData();
    const cid = locals.user.cid;
    const user = await User.fromCid(db, cid);

    if (!user) {
      throw new Error('User not found');
    }

    const type = formData.get('type');

    // List of all preference keys from the form
    const preferenceKeys =
      type === 'notification'
        ? ([
            'policyChanges',
            'urgentFirUpdates',
            'trainingUpdates',
            'unauthorizedConnection',
            'newEventPosted',
            'newNewsArticlePosted'
          ] as const)
        : type === 'privacy'
          ? []
          : [];

    // Process each preference
    if (type === 'notification') {
      for (const key of preferenceKeys) {
        const value = formData.get(key) === 'on';
        await user.setPreference(key, value);
      }
    } else if (type === 'privacy') {
      const name = formData.get('name') as string;

      // Validate the value
      const validValues = ['full', 'initial', 'cid'] as const;
      if (!validValues.includes(name as (typeof validValues)[number])) {
        return {
          success: false,
          error: 'Invalid value for display name preference.'
        };
      }

      await user.setPreference('displayName', name as (typeof validValues)[number]);
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
