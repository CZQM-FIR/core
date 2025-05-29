import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = (async () => {
	const resources = await db.query.resources.findMany({
		where: (resources, { eq }) => eq(resources.type, 'pilot')
	});

	return { resources };
}) satisfies PageServerLoad;

export const actions = {
	createResource: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const link = formData.get('link') as string;
		const publicResource = Boolean(formData.get('public') as string);
		const category = formData.get('category') as string;

		if (!name || !link || !category) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Missing required fields',
				name,
				link,
				publicResource,
				category
			});
		}

		const localUser = locals.user ?? null;

		if (!localUser) {
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category
			});
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
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category
			});
		}
	},
	editResource: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const link = formData.get('link') as string;
		const publicResource = Boolean(formData.get('public') as string);
		const category = formData.get('category') as string;
		const id = Number(formData.get('id'));

		if (!name || !link || !category) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Missing required fields',
				name,
				link,
				publicResource,
				category,
				id
			});
		}

		const localUser = locals.user ?? null;

		if (!localUser) {
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category,
				id
			});
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
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				name,
				link,
				publicResource,
				category,
				id
			});
		}

		const resource = await db.query.resources.findFirst({
			where: (resources, { eq }) => eq(resources.id, id)
		});

		if (!resource) {
			return fail(404, {
				ok: false,
				status: 404,
				message: 'Resource not found',
				name,
				link,
				publicResource,
				category,
				id
			});
		}

		await db
			.update(schema.resources)
			.set({
				name,
				category,
				public: publicResource,
				url: link,
				type: 'pilot'
			})
			.where(eq(schema.resources.id, id))
			.returning();

		return {
			ok: true,
			status: 200,
			message: 'Resource edited successfully',
			id
		};
	},
	deleteResource: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Missing resource id',
				id
			});
		}

		const localUser = locals.user ?? null;

		if (!localUser) {
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				id
			});
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
			return fail(401, {
				ok: false,
				status: 401,
				message: 'Unauthorized',
				id
			});
		}

		const resource = await db.query.resources.findFirst({
			where: (resources, { eq }) => eq(resources.id, id)
		});

		if (!resource) {
			return fail(404, {
				ok: false,
				status: 404,
				message: 'Resource not found',
				id
			});
		}

		await db.delete(schema.resources).where(eq(schema.resources.id, id));

		return {
			ok: true,
			status: 200,
			message: 'Resource deleted successfully',
			id
		};
	}
} satisfies Actions;
