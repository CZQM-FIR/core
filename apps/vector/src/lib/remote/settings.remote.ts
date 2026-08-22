import { command, query } from '$app/server';
import { db } from '$lib/db';
import { appSettings } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { type } from 'arktype';
import { authorizeVectorAdminAccess } from './auth';
import { COURSE_STATUS_NOTIFICATIONS_KEY } from '$lib/courseEnrollmentEmails';

export const getCourseStatusNotificationsEnabled = query(async () => {
	await authorizeVectorAdminAccess();

	const [row] = await db
		.select({ value: appSettings.value })
		.from(appSettings)
		.where(eq(appSettings.key, COURSE_STATUS_NOTIFICATIONS_KEY))
		.limit(1);

	return row?.value !== 'false';
});

export const setCourseStatusNotificationsEnabled = command(type('boolean'), async (enabled) => {
	await authorizeVectorAdminAccess();

	const value = enabled ? 'true' : 'false';

	await db
		.insert(appSettings)
		.values({
			key: COURSE_STATUS_NOTIFICATIONS_KEY,
			value
		})
		.onConflictDoUpdate({
			target: appSettings.key,
			set: { value }
		});

	getCourseStatusNotificationsEnabled().refresh();

	return enabled;
});
