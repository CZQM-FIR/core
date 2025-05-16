import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	createResource: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const link = formData.get('link') as string;
		const publicResource = Boolean(formData.get('public') as string);
		const category = formData.get('category') as string;
		const type = formData.get('type') as string;

		if (!name || !link || !category) {
			return {
				ok: false,
				status: 400,
				message: 'Missing required fields',
				name,
				link,
				publicResource,
				category
			};
		}

		const localUser = locals.user ?? null;

		if (!localUser) {
			return {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category
			};
		}

		const user = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.cid, localUser.cid),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});

		if (!user || !user.flags.some((f) => ['staff', 'admin'].includes(f.flag.name))) {
			return {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category
			};
		}

		const resource = await db.insert(schema.resources).values({
			name,
			category,
			public: publicResource,
			url: link,
			type: type ?? 'controller'
		});
	}
} satisfies Actions;
