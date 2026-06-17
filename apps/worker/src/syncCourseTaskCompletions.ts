import type { DB, Env } from '@czqm/common';
import { Course } from '@czqm/common';

export const syncCourseTaskCompletions = async (
	db: DB,
	env: Pick<Env, 'VATCAN_API_TOKEN'>,
) => {
	const enrolled = await db.query.enrolledUsers.findMany({
		with: {
			waitlist: true,
		},
	});

	console.log(
		`Starting course task completions sync for ${enrolled.length} enrolled students`,
	);

	let processed = 0;

	for (const row of enrolled) {
		const course = await Course.fetchByWaitlistId(row.waitlistId, db);
		if (!course) continue;

		try {
			await course.syncTaskCompletions(row.cid, env);
			processed++;
		} catch (err) {
			console.error(
				`Failed to sync task completions for user ${row.cid} on waitlist ${row.waitlistId}:`,
				err,
			);
		}
	}

	console.log(
		`Finished course task completions sync: processed ${processed}/${enrolled.length} students`,
	);
};
