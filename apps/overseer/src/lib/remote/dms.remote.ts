import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import env from '$lib/env';
import { DmsAsset, DmsDocument, DmsGroup, User } from '@czqm/common';
import { error, invalid, redirect } from '@sveltejs/kit';
import { type } from 'arktype';
import { asc } from 'drizzle-orm';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const getDocuments = query(async () => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const documents = await DmsDocument.fetchAll(db);

	return documents;
});

export const getDocument = query(type('string'), async (id: string) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const document = await DmsDocument.fromId(db, id);

	if (!document) {
		throw error(404, 'Document not found');
	}

	return document;
});

export const editDocument = form(
	type({
		id: 'string',
		name: 'string',
		short: 'string',
		sort: type('string').pipe((value) => {
			if (value === '') {
				return 99;
			}

			return Number(value);
		}),
		required: type('string').pipe((value) => value === 'true'),
		description: 'string?'
	}),
	async ({ sort, short, id, name, required, description }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		if (!/^[a-z0-9-]+$/i.test(short)) {
			invalid(issue.short('Short URL may only contain letters, numbers, and dashes'));
		}

		const normalizedName = name.trim();
		const normalizedShort = short.trim().toLowerCase();
		const normalizedDescription = description?.trim() ? description.trim() : null;

		await DmsDocument.update(db, id, {
			name: normalizedName,
			required,
			short: normalizedShort,
			description: normalizedDescription,
			sort
		});

		getDocuments().refresh();
		getDocument(id).refresh();

		return {
			ok: true,
			message: 'Document details updated successfully.'
		};
	}
);

const getSingleValue = (value: unknown) => {
	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const parseDateInput = (value: unknown) => {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return null;
	}

	// datetime-local inputs do not include timezone information.
	// Treat them as UTC so UI and stored values stay consistent.
	const date = new Date(`${value}Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

const getR2Client = () =>
	new S3Client({
		region: 'auto',
		endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_ACCESS_KEY
		}
	});

const uploadDmsAsset = async (documentId: string, file: File) => {
	const fileName = `dms/${documentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
	const s3 = getR2Client();

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: env.R2_BUCKET_NAME,
				Key: fileName,
				Body: new Uint8Array(await file.arrayBuffer()),
				ContentType: file.type
			})
		);
	} catch {
		throw error(500, 'Failed to upload document asset');
	}

	return fileName;
};

export const createDocumentAsset = form('unchecked', async (rawData) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user || !user.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}

	const documentId = getSingleValue(rawData.documentId);
	const versionInput = getSingleValue(rawData.version);
	const effectiveDateInput = getSingleValue(rawData.effectiveDate);
	const expiryDateInput = getSingleValue(rawData.expiryDate);
	const fileInput = getSingleValue(rawData.file);
	const isPublic = getSingleValue(rawData.public) === 'on';

	if (typeof documentId !== 'string' || documentId.length === 0) {
		throw error(400, 'Document id is required');
	}

	if (typeof versionInput !== 'string' || versionInput.trim().length === 0) {
		throw error(400, 'Version is required');
	}

	const file = fileInput instanceof File ? fileInput : undefined;
	if (!file || file.name.length === 0 || file.size === 0) {
		throw error(400, 'Document asset file is required');
	}

	const effectiveDate = parseDateInput(effectiveDateInput);
	if (!effectiveDate) {
		throw error(400, 'Effective date is required');
	}

	const expiryDate = parseDateInput(expiryDateInput);
	if (expiryDate && expiryDate.getTime() <= effectiveDate.getTime()) {
		throw error(400, 'Expiry date must be after the effective date');
	}

	let document: DmsDocument;
	try {
		document = await DmsDocument.fromId(db, documentId);
	} catch {
		throw error(404, 'Document not found');
	}

	const url = await uploadDmsAsset(document.id, file);

	await DmsAsset.create(db, {
		documentId: document.id,
		version: versionInput.trim(),
		effectiveDate,
		expiryDate,
		public: isPublic,
		url
	});

	getDocument(document.id).refresh();
	getDocuments().refresh();

	return {
		ok: true,
		message: 'Document asset uploaded successfully.'
	};
});

export const updateDocumentAsset = form('unchecked', async (rawData) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user || !user.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}

	const assetId = getSingleValue(rawData.assetId);
	const effectiveDateInput = getSingleValue(rawData.effectiveDate);
	const expiryDateInput = getSingleValue(rawData.expiryDate);
	const isPublic = getSingleValue(rawData.public) === 'on';

	if (typeof assetId !== 'string' || assetId.length === 0) {
		return { ok: false, message: 'Asset id is required.' };
	}

	const effectiveDate = parseDateInput(effectiveDateInput);
	if (!effectiveDate) {
		return { ok: false, message: 'Effective date is required.' };
	}

	const expiryDate = parseDateInput(expiryDateInput);
	if (expiryDate && expiryDate.getTime() <= effectiveDate.getTime()) {
		return { ok: false, message: 'Expiry date must be after the effective date.' };
	}

	let asset: DmsAsset;
	try {
		asset = await DmsAsset.fromId(db, assetId);
	} catch {
		return { ok: false, message: 'Asset not found.' };
	}

	await DmsAsset.update(db, asset.id, {
		documentId: asset.documentId,
		version: asset.version,
		effectiveDate,
		expiryDate,
		public: isPublic,
		url: asset.url
	});

	getDocument(asset.documentId).refresh();
	getDocuments().refresh();

	return {
		ok: true,
		message: 'Document asset updated successfully.'
	};
});

export const deleteDocumentAsset = form('unchecked', async (rawData) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user || !user.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}

	const assetId = getSingleValue(rawData.assetId);
	if (typeof assetId !== 'string' || assetId.length === 0) {
		return { ok: false, message: 'Asset id is required.' };
	}

	let asset: DmsAsset;
	try {
		asset = await DmsAsset.fromId(db, assetId);
	} catch {
		return { ok: false, message: 'Asset not found.' };
	}

	const s3 = getR2Client();
	try {
		await s3.send(
			new DeleteObjectCommand({
				Bucket: env.R2_BUCKET_NAME,
				Key: asset.url
			})
		);
	} catch {
		return { ok: false, message: 'Failed to delete asset file from R2.' };
	}

	await DmsAsset.remove(db, asset.id);

	getDocument(asset.documentId).refresh();
	getDocuments().refresh();

	return {
		ok: true,
		message: 'Document asset deleted successfully.'
	};
});

export const getDocumentsByGroup = query(type('string'), async (groupId) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, groupId);

	if (!group) {
		throw error(404, 'Group not found');
	}

	return await db.query.dmsDocuments.findMany({
		where: { groupId },
		with: { group: true },
		orderBy: (document) => [asc(document.sort), asc(document.name)]
	});
});

export const getGroups = query(async () => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const groups = await DmsGroup.fetchAll(db);

	return groups;
});

export const getGroup = query(type('string'), async (id) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, id);

	if (!group) {
		throw error(404, 'Group not found');
	}

	return group;
});

export const createGroup = form(
	type({
		name: 'string',
		slug: type.string.pipe((str) => str.toLowerCase().trim()),
		sort: 'number?'
	}),
	async ({ name, slug, sort = 99 }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			invalid(issue.slug('Slug can only contain lowercase letters, numbers, and dashes'));
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		const existingGroup = await DmsGroup.fromSlug(db, slug);

		if (existingGroup) {
			invalid(issue.slug(`Slug is already in use by another group`));
		}

		const newGroup = await DmsGroup.create(db, {
			name,
			slug,
			sort
		});

		return redirect(303, `/a/dms/groups/${newGroup.id}`);
	}
);

export const createDocument = form(
	type({
		groupId: 'string',
		name: type.string.pipe((str) => str.trim()),
		required: type.string.pipe((value) => value === 'true'),
		short: 'string',
		description: 'string?',
		sort: type('string').pipe((value) => {
			if (value === '') {
				return 99;
			}

			return Number(value);
		})
	}),
	async ({ groupId, name, required, short, description, sort }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (name.length === 0) {
			invalid(issue.name('Name is required'));
		}

		if (!Number.isFinite(sort)) {
			invalid(issue.sort('Sort must be a number'));
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		const group = await DmsGroup.fromId(db, groupId);

		if (!group) {
			invalid(issue.groupId('Group not found'));
		}

		const normalizedShort = short?.trim().toLowerCase();

		if (normalizedShort) {
			const documents = await DmsDocument.fetchAll(db);
			const hasDuplicateShort = documents.some(
				(document) => document.short?.trim().toLowerCase() === normalizedShort
			);

			if (hasDuplicateShort) {
				invalid(issue.short('Short URL is already in use'));
			}
		}

		await DmsDocument.create(db, {
			groupId,
			name,
			required,
			short: normalizedShort,
			description: description?.trim() ? description.trim() : null,
			sort
		});

		getGroup(groupId).refresh();
		getDocumentsByGroup(groupId).refresh();
		getDocuments().refresh();

		return redirect(303, `/a/dms/groups/${groupId}`);
	}
);

export const deleteGroup = command(type('string'), async (id) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user || !user.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, id);

	if (!group) {
		throw error(404, 'Group not found');
	}

	await group.delete();

	getGroups().refresh();
	getDocuments().refresh();

	return;
});

export const editGroup = form(
	type({
		id: 'string',
		name: 'string',
		slug: type.string.pipe((str) => str.toLowerCase().trim()),
		sort: 'number'
	}),
	async ({ id, name, slug, sort }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			invalid(issue.slug('Slug can only contain lowercase letters, numbers, and dashes'));
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		await DmsGroup.update(db, id, {
			name,
			sort,
			slug
		});

		return {
			ok: true,
			id,
			name,
			slug,
			sort
		};
	}
);
