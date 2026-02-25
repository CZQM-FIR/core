import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { fetchResources, sortControllerResources, sortPilotResources } from '@czqm/common';
import { error, redirect } from '@sveltejs/kit';

export const getControllerResources = query(async () => {
  const event = getRequestEvent();
  if (!event.locals.user) {
    throw redirect(303, '/auth?redirect=/controller-resources');
  }
  const user = await User.fromCid(db, event.locals.user.cid);
  if (!user) {
    throw redirect(303, '/auth?redirect=/controller-resources');
  }
  if (!user.hasFlag(['visitor', 'controller', 'admin'])) {
    throw error(403, 'Unauthorized');
  }
  const resources = await fetchResources(db, { type: 'controller', publicOnly: true });
  return {
    resources: sortControllerResources(
      resources.map((r) => ({ ...r, public: undefined, type: undefined }))
    )
  };
});

export const getPilotResources = query(async () => {
  const resources = await fetchResources(db, { type: 'pilot', publicOnly: true });
  return {
    resources: sortPilotResources(
      resources.map((r) => ({ ...r, public: undefined, type: undefined }))
    )
  };
});
