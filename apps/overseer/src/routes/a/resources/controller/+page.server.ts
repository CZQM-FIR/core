import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { type } from 'arktype';

export const load = (async () => {
	const resources = await db.query.resources.findMany({
		where: (resources, { eq }) => eq(resources.type, 'controller')
	});

	return {
		resources: resources.sort((a, b) => {
			const categoryOrder = [
				'Policy',
				'Software',
				'Guide',
				'Reference',
				'Letter of Agreement',
				'Other'
			];
			const aIndex = categoryOrder.indexOf(a.category);
			const bIndex = categoryOrder.indexOf(b.category);

			if (aIndex !== -1 && bIndex !== -1) {
				if (aIndex !== bIndex) return aIndex - bIndex;
			} else if (aIndex !== -1) {
				return -1;
			} else if (bIndex !== -1) {
				return 1;
			}

			return 1;
		})
	};
}) satisfies PageServerLoad;

export const actions = {
	createResource: async ({ request, locals }) => {
		const FormData = type({
			name: 'string',
			link: 'string',
			public: type("'true' | 'false'").pipe((v) => v === 'true'),
			category: 'string',
			description: 'string'
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));
		if (data instanceof type.errors) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Invalid form data',
				errors: data.summary
			});
		}
		const { name, link, public: publicResource, category, description } = data;

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

		await db.insert(schema.resources).values({
			name,
			url: link,
			public: publicResource,
			type: 'controller',
			category,
			description
		});

		return {
			ok: true,
			status: 200,
			message: 'Resource created successfully'
		};
	},
	editResource: async ({ request, locals }) => {
		const FormData = type({
			name: 'string',
			link: 'string',
			public: type("'true' | 'false'").pipe((v) => v === 'true'),
			category: 'string',
			description: 'string',
			id: type('string.integer >= 0').pipe((v) => Number(v))
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));
		if (data instanceof type.errors) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Invalid form data',
				errors: data.summary
			});
		}
		const { name, link, public: publicResource, category, description, id } = data;

		if (!name || !link || !category) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Missing required fields',
				name,
				link,
				publicResource,
				category,
				id,
				description
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
				id,
				description
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
				id,
				description
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
				id,
				description
			});
		}

		await db
			.update(schema.resources)
			.set({
				name,
				category,
				public: publicResource,
				url: link,
				type: 'controller',
				description
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
		const FormData = type({
			id: type('string.integer >= 0').pipe((v) => Number(v))
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));
		if (data instanceof type.errors) {
			return fail(400, {
				ok: false,
				status: 400,
				message: 'Invalid form data',
				errors: data.summary
			});
		}
		const { id } = data;

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
