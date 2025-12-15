import { db } from '$lib/db';
import env from '$lib/env';
import * as schema from '@czqm/db/schema';

export type NotificationType =
	| 'policyChanges'
	| 'urgentFirUpdates'
	| 'trainingUpdates'
	| 'unauthorizedConnection'
	| 'newEventPosted'
	| 'newNewsArticlePosted';

export interface NotificationPayload {
	type: NotificationType;
	title?: string;
	message: string;
}

const requiredNotifications = [
	'policyChanges',
	'urgentFirUpdates',
	'trainingUpdates',
	'unauthorizedConnection'
];

export const notifyUsers = async (payload: NotificationPayload, users: number[] = []) => {
	const { message, type, title } = payload;

	let members = await db.query.users.findMany({
		with: {
			flags: {
				with: {
					flag: true
				}
			},
			integrations: true,
			preferences: true
		}
	});

	if (users.length > 0) {
		members = members.filter((m) => users.includes(m.cid));
	}

	members = members.filter((m) => {
		if (!m.flags.some((f) => ['controller', 'visitor'].includes(f.flag.name))) return false; // only notify controllers and visitors
		if (!m.integrations.some((i) => i.type === 0)) return false; // must have discord integration
		if (requiredNotifications.includes(type)) {
			return true; // always notify for required notifications
		} else {
			return m.preferences.some((p) => p.key === type && p.value === 'true'); // check user preferences
		}
	});

	const values: (typeof schema.notifications.$inferInsert)[] = members.map((m) => ({
		timestamp: new Date(),
		userId: m.cid,
		type,
		message: title ? `**${title}**\n\n${message}` : message,
		buttons: [
			{
				type: 2,
				style: 5,
				label: 'Manage Notifications',
				url: `${env.PUBLIC_WEB_URL}/my/preferences`
			}
		]
	}));

	await db.insert(schema.notifications).values(values);
};
