import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import { type FlagName, User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	fetchResources,
	sortControllerResources,
	sortPilotResources,
	type ResourceType
} from '@czqm/common';

const staffFlags: FlagName[] = ['staff', 'admin'];

const getSingle = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const getAuthorizedActioner = async () => {
	const event = getRequestEvent();
	const actioner = await User.fromCid(db, event.locals.user?.cid ?? 0);
	if (!actioner || !actioner.hasFlag(staffFlags)) {
		throw error(403, 'Forbidden');
	}
	return actioner;
};

export const getAdminControllerResources = query(async () => {
	await getAuthorizedActioner();
	const resources = await fetchResources(db, { type: 'controller' });
	return {
		resources: sortControllerResources(resources)
	};
});

export const getAdminPilotResources = query(async () => {
	await getAuthorizedActioner();
	const resources = await fetchResources(db, { type: 'pilot' });
	return {
		resources: sortPilotResources(resources)
	};
});

type CreateResult =
	| { ok: true; status: number; message: string }
	| {
			ok: false;
			status: number;
			message: string;
			name?: string;
			link?: string;
			publicResource?: boolean;
			category?: string;
			description?: string;
	  };
type EditDeleteResult = { ok: boolean; status: number; message: string; id?: number };

const createResourceHandler = async (
	data: { name: string; link: string; public: boolean; category: string; description: string },
	resourceType: ResourceType
): Promise<CreateResult> => {
	await getAuthorizedActioner();
	await db.insert(schema.resources).values({
		name: data.name,
		url: data.link,
		public: data.public,
		type: resourceType,
		category: data.category,
		description: data.description
	});
	getAdminControllerResources().refresh();
	getAdminPilotResources().refresh();
	return { ok: true, status: 200, message: 'Resource created successfully' };
};

export const createControllerResource = form('unchecked', async (raw) => {
	const name = getSingle(raw.name) as string;
	const link = getSingle(raw.link) as string;
	const category = getSingle(raw.category) as string;
	const description = (getSingle(raw.description) as string) ?? '';
	const publicVal = getSingle(raw.public) === 'on';
	if (!name || !link || !category) {
		return {
			ok: false,
			status: 400,
			message: 'Missing required fields',
			name,
			link,
			publicResource: publicVal,
			category,
			description
		};
	}
	return createResourceHandler(
		{ name, link, public: publicVal, category, description },
		'controller'
	);
});

export const createPilotResource = form('unchecked', async (raw) => {
	const name = getSingle(raw.name) as string;
	const link = getSingle(raw.link) as string;
	const category = getSingle(raw.category) as string;
	const description = (getSingle(raw.description) as string) ?? '';
	const publicVal = getSingle(raw.public) === 'on';
	if (!name || !link || !category) {
		return {
			ok: false,
			status: 400,
			message: 'Missing required fields',
			name,
			link,
			publicResource: publicVal,
			category,
			description
		};
	}
	return createResourceHandler({ name, link, public: publicVal, category, description }, 'pilot');
});

const editResourceHandler = async (
	data: {
		name: string;
		link: string;
		public: boolean;
		category: string;
		description: string;
		id: number;
	},
	resourceType: ResourceType
): Promise<EditDeleteResult> => {
	await getAuthorizedActioner();
	const resource = await db.query.resources.findFirst({ where: { id: data.id } });
	if (!resource) {
		return { ok: false, status: 404, message: 'Resource not found', id: data.id };
	}
	await db
		.update(schema.resources)
		.set({
			name: data.name,
			category: data.category,
			public: data.public,
			url: data.link,
			type: resourceType,
			description: data.description
		})
		.where(eq(schema.resources.id, data.id));
	getAdminControllerResources().refresh();
	getAdminPilotResources().refresh();
	return { ok: true, status: 200, message: 'Resource edited successfully', id: data.id };
};

export const editControllerResource = form('unchecked', async (raw) => {
	const id = Number(getSingle(raw.id));
	if (!Number.isInteger(id) || id < 0) {
		return { ok: false, status: 400, message: 'Invalid id', id };
	}
	const name = getSingle(raw.name) as string;
	const link = getSingle(raw.link) as string;
	const category = getSingle(raw.category) as string;
	const description = (getSingle(raw.description) as string) ?? '';
	const publicVal = getSingle(raw.public) === 'on';
	if (!name || !link || !category) {
		return { ok: false, status: 400, message: 'Missing required fields', id };
	}
	return editResourceHandler(
		{ name, link, public: publicVal, category, description, id },
		'controller'
	);
});

export const editPilotResource = form('unchecked', async (raw) => {
	const id = Number(getSingle(raw.id));
	if (!Number.isInteger(id) || id < 0) {
		return { ok: false, status: 400, message: 'Invalid id', id };
	}
	const name = getSingle(raw.name) as string;
	const link = getSingle(raw.link) as string;
	const category = getSingle(raw.category) as string;
	const description = (getSingle(raw.description) as string) ?? '';
	const publicVal = getSingle(raw.public) === 'on';
	if (!name || !link || !category) {
		return { ok: false, status: 400, message: 'Missing required fields', id };
	}
	return editResourceHandler({ name, link, public: publicVal, category, description, id }, 'pilot');
});

export const deleteResource = form('unchecked', async (raw) => {
	const id = Number(getSingle(raw.id));
	if (!Number.isInteger(id) || id < 0) {
		return { ok: false, status: 400, message: 'Missing id', id };
	}
	await getAuthorizedActioner();
	const resource = await db.query.resources.findFirst({ where: { id } });
	if (!resource) {
		return { ok: false, status: 404, message: 'Resource not found', id };
	}
	await db.delete(schema.resources).where(eq(schema.resources.id, id));
	getAdminControllerResources().refresh();
	getAdminPilotResources().refresh();
	return { ok: true, status: 200, message: 'Resource deleted successfully', id };
});
