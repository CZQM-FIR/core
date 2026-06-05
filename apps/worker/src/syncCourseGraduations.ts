import type { DB, Env } from '@czqm/common';
import { Course } from '@czqm/common';

export const syncCourseGraduations = async (
	db: DB,
	env: Pick<Env, 'VATCAN_API_TOKEN'>,
) => {
	const enrolled = await db.query.enrolledUsers.findMany({
		with: {
			waitlist: true,
		},
	});

	for (const row of enrolled) {
		const course = await Course.fetchByWaitlistId(row.waitlistId, db);
		if (!course) continue;

		try {
			await course.graduateIfComplete(row.cid, env);
		} catch (err) {
			console.error(
				`Failed to graduate user ${row.cid} from waitlist ${row.waitlistId}:`,
				err,
			);
		}
	}
};
