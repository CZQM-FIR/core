import type { PrefetchRoute } from '$lib/prefetch.svelte';
import { getHomepageData } from '$lib/remote/home.remote';
import { getNewsArticle, getNewsArticles } from '$lib/remote/news.remote';
import { getEvent, getEventsSplit } from '$lib/remote/events.remote';
import { getDocumentByShort, getActiveGroups } from '$lib/remote/dms.remote';
import { getRosterData, getSoloEndorsements } from '$lib/remote/roster.remote';
import { getStaffPageData } from '$lib/remote/staff.remote';
import { getControllerProfile } from '$lib/remote/profiles.remote';
import { getMyProfile } from '$lib/remote/my.remote';
import { getMyPreferences } from '$lib/remote/preferences.remote';
import { getMyIntegrations } from '$lib/remote/integrations.remote';
import { getMyTickets } from '$lib/remote/tickets.remote';

/** Queries to start fetching when the user hovers a link to the matching route. */
export const prefetchRoutes: PrefetchRoute[] = [
  { pattern: /^\/?$/, queries: () => [getHomepageData()] },
  { pattern: /^\/news\/?$/, queries: () => [getNewsArticles()] },
  { pattern: /^\/news\/(\d+)\/?$/, queries: (m) => [getNewsArticle(Number(m[1]))] },
  { pattern: /^\/events\/?$/, queries: () => [getEventsSplit()] },
  { pattern: /^\/events\/(\d+)\/?$/, queries: (m) => [getEvent(Number(m[1]))] },
  { pattern: /^\/docs\/?$/, queries: () => [getActiveGroups()] },
  {
    pattern: /^\/docs\/([^/]+)\/([^/]+)\/?$/,
    queries: (m) => [getDocumentByShort([m[1], m[2]])]
  },
  { pattern: /^\/roster\/?$/, queries: () => [getRosterData()] },
  { pattern: /^\/roster\/solo\/?$/, queries: () => [getSoloEndorsements()] },
  { pattern: /^\/staff\/?$/, queries: () => [getStaffPageData()] },
  { pattern: /^\/controller\/(\d+)\/?$/, queries: (m) => [getControllerProfile(Number(m[1]))] },
  { pattern: /^\/my\/?$/, queries: () => [getMyProfile()] },
  { pattern: /^\/my\/preferences\/?$/, queries: () => [getMyPreferences()] },
  { pattern: /^\/my\/integrations\/?$/, queries: () => [getMyIntegrations()] },
  { pattern: /^\/my\/tickets\/?$/, queries: () => [getMyTickets()] }
];
