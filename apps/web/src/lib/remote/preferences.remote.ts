import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { redirect } from '@sveltejs/kit';

const getSingle = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const getMyPreferences = query(async () => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my/preferences');
  }
  const user = await User.fromCid(db, cid);
  if (!user) {
    throw new Error('User not found');
  }
  return { preferences: user.getAllPreferences() };
});

const validDisplayNames = ['full', 'initial', 'cid'] as const;
const preferenceKeys = [
  'policyChanges',
  'urgentFirUpdates',
  'trainingUpdates',
  'unauthorizedConnection',
  'newEventPosted',
  'newNewsArticlePosted'
] as const;

export const savePreferences = form('unchecked', async (raw) => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my/preferences');
  }
  const user = await User.fromCid(db, cid);
  if (!user) {
    return { success: false, error: 'User not found', preferences: null };
  }
  const typeVal = (getSingle(raw.type) as string | undefined) ?? '';

  if (typeVal === 'notification') {
    for (const key of preferenceKeys) {
      const value = getSingle((raw as Record<string, unknown>)[key]) === 'on';
      await user.setPreference(key, value);
    }
  } else if (typeVal === 'privacy') {
    const name = getSingle(raw.name) as string;
    if (!validDisplayNames.includes(name as (typeof validDisplayNames)[number])) {
      return {
        success: false,
        error: 'Invalid value for display name preference.',
        preferences: null
      };
    }
    await user.setPreference('displayName', name as (typeof validDisplayNames)[number]);
  } else {
    return { success: false, error: 'Invalid request', preferences: null };
  }

  const updatedPreferences = await db.query.preferences.findMany({
    where: { cid }
  });
  return {
    success: true,
    preferences: updatedPreferences,
    savedType: typeVal as 'notification' | 'privacy'
  };
});
