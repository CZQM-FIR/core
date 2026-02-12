import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { getUserRole } from '$lib/utilities/getUserRole';

export const load = (async () => {
	const users = await db.query.users.findMany({
		columns: {
			cid: true,
			name_full: true,
			active: true
		},
		with: {
			flags: true,
			rating: true
		}
	});

	const usersWithRoles = await Promise.all(
		users
			.filter((u) => u.flags.some((f) => ['visitor', 'controller'].includes(f.name)))
			.map(async (user) => {
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
