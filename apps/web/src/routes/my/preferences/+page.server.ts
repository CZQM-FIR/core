import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import { User } from '@czqm/common';

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

const validDisplayNames = ['full', 'initial', 'cid'] as const;
const preferenceKeys = [
  'policyChanges',
  'urgentFirUpdates',
  'trainingUpdates',
  'unauthorizedConnection',
  'newEventPosted',
  'newNewsArticlePosted'
] as const;

export const actions: Actions = {
  savePreferences: async (event) => {
    const { user } = await auth(event);
    if (!user) {
      return { success: false, error: 'Unauthorized', preferences: null, savedType: null };
    }
    const userObj = await User.fromCid(db, user.cid);
    if (!userObj) {
      return { success: false, error: 'User not found', preferences: null, savedType: null };
    }
    const data = await event.request.formData();
    const typeVal = (data.get('type') ?? '').toString();

    if (typeVal === 'notification') {
      for (const key of preferenceKeys) {
        const value = data.get(key) === 'on';
        await userObj.setPreference(key, value);
      }
    } else if (typeVal === 'privacy') {
      const name = (data.get('name') ?? 'full').toString();
      if (!validDisplayNames.includes(name as (typeof validDisplayNames)[number])) {
        return {
          success: false,
          error: 'Invalid value for display name preference.',
          preferences: null,
          savedType: null
        };
      }
      await userObj.setPreference('displayName', name as (typeof validDisplayNames)[number]);
    } else {
      return { success: false, error: 'Invalid request', preferences: null, savedType: null };
    }

    const updatedPreferences = await db.query.preferences.findMany({
      where: { cid: user.cid }
    });
    return {
      success: true,
      preferences: updatedPreferences,
      savedType: typeVal as 'notification' | 'privacy'
    };
  }
};
