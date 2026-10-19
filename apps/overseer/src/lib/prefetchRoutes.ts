import type { PrefetchRoute } from '$lib/prefetch.svelte';
import { getActivityUsers, getUsers } from '$lib/remote/users.remote';
import { getUserAdminDetails } from '$lib/remote/user-admin.remote';
import { getEvent, getEvents } from '$lib/remote/events.remote';
import { getNewsArticle, getNewsArticles } from '$lib/remote/news.remote';
import { getDocumentsByGroup, getGroup, getGroups } from '$lib/remote/dms.remote';
import { getAssistants } from '$lib/remote/assistants.remote';
import {
	getAdminControllerResources,
	getAdminPilotResources
} from '$lib/remote/resources.remote';

/** Queries to start fetching when the user hovers a link to the matching route. */
export const prefetchRoutes: PrefetchRoute[] = [
	{ pattern: /^\/a\/users\/?$/, queries: () => [getUsers()] },
	{ pattern: /^\/a\/users\/(\d+)\/?$/, queries: (m) => [getUserAdminDetails(Number(m[1]))] },
	{ pattern: /^\/a\/activity\/?$/, queries: () => [getActivityUsers()] },
	{ pattern: /^\/a\/assistants\/?$/, queries: () => [getAssistants()] },
	{ pattern: /^\/a\/events\/?$/, queries: () => [getEvents()] },
	{ pattern: /^\/a\/events\/(\d+)\/?$/, queries: (m) => [getEvent(Number(m[1]))] },
	{ pattern: /^\/a\/news\/?$/, queries: () => [getNewsArticles()] },
	{ pattern: /^\/a\/news\/(\d+)\/?$/, queries: (m) => [getNewsArticle(Number(m[1]))] },
	{ pattern: /^\/a\/dms\/?$/, queries: () => [getGroups()] },
	{
		pattern: /^\/a\/dms\/groups\/([^/]+)(?:\/new-document)?\/?$/,
		queries: (m) => [getGroup(m[1]), getDocumentsByGroup(m[1])]
	},
	{ pattern: /^\/a\/resources\/controller\/?$/, queries: () => [getAdminControllerResources()] },
	{ pattern: /^\/a\/resources\/pilot\/?$/, queries: () => [getAdminPilotResources()] }
];
