import type { PageServerLoad } from './$types';
import * as schema from '@czqm/db/schema';
import { db } from '$lib/db';
import { getUserRole } from '$lib/utilities/getUserRole';

export const load = (async ({ locals }) => {
	const users = await db.query.users.findMany({
		columns: {
			cid: true,
			name_full: true
		},
		with: {
			flags: {
				columns: {
					flagId: false,
					userId: false
				},
				with: {
					flag: true
				}
			},
			rating: true
		}
	});

	const usersWithRoles = await Promise.all(
		users.map(async (user) => {
			const role = await getUserRole(user.flags);
			return {
				...user,
				role
			};
		})
	);

	return {
		users: usersWithRoles
	};
}) satisfies PageServerLoad;
