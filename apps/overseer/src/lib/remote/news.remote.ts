import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import env from '$lib/env';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NewsArticle, type FlagName, User } from '@czqm/common';
import { error, redirect } from '@sveltejs/kit';
import { type } from 'arktype';

const newsAdminFlags: FlagName[] = ['admin', 'staff'];
const newsDeleteFlags: FlagName[] = ['admin', 'chief', 'deputy', 'chief-instructor', 'events'];

const getSingleValue = (value: unknown) => {
	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
};

const getAuthorizedActioner = async (requiredFlags: FlagName | FlagName[]) => {
	const event = getRequestEvent();

	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags
	});

	if (!actioner) {
		throw error(403, 'Forbidden');
	}

	return actioner;
};

const uploadNewsImage = async (image: File) => {
	const fileName = `news/${Date.now()}-${image.name}`;

	const s3 = new S3Client({
		region: 'auto',
		endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_ACCESS_KEY
		}
	});

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: env.R2_BUCKET_NAME,
				Key: fileName,
				Body: new Uint8Array(await image.arrayBuffer()),
				ContentType: image.type
			})
		);
	} catch {
		throw error(500, 'Failed to upload image');
	}

	return fileName;
};

export const getNewsArticles = query(async () => {
	await getAuthorizedActioner(newsAdminFlags);

	return await NewsArticle.fetchAllWithAuthor(db);
});

export const getNewsArticle = query(type('number.integer >= 0'), async (id) => {
	await getAuthorizedActioner(newsAdminFlags);

	const article = await NewsArticle.fetchByIdWithAuthor(db, id);

	if (!article) {
		throw error(404, 'Article not found');
	}

	return article;
});

export const deleteNewsArticle = command(type('number.integer >= 0'), async (id) => {
	await getAuthorizedActioner(newsDeleteFlags);

	const article = await NewsArticle.fetchById(db, id);

	if (!article) {
		throw error(404, 'Article not found');
	}

	await NewsArticle.remove(db, id);
	getNewsArticles().refresh();
});

export const createNewsArticle = form('unchecked', async (rawData) => {
	const title = getSingleValue(rawData.title);
	const text = getSingleValue(rawData.text);
	const anonymous = getSingleValue(rawData.anonymous);
	const imageRaw = getSingleValue(rawData.image);

	if (typeof title !== 'string' || typeof text !== 'string') {
		throw error(400, 'Invalid form data');
	}

	const actioner = await getAuthorizedActioner(newsAdminFlags);
	const image = imageRaw instanceof File ? imageRaw : undefined;
	const imageName = image && image.name && image.size > 0 ? await uploadNewsImage(image) : null;

	await NewsArticle.create(db, {
		title,
		text,
		image: imageName,
		authorID: anonymous === 'on' ? null : actioner.cid
	});

	getNewsArticles().refresh();
	redirect(303, '/a/news');
});

export const updateNewsArticle = form('unchecked', async (rawData) => {
	const idRaw = getSingleValue(rawData.id);
	const title = getSingleValue(rawData.title);
	const text = getSingleValue(rawData.text);
	const imageRaw = getSingleValue(rawData.image);

	if (typeof idRaw !== 'string' || !/^\d+$/.test(idRaw)) {
		throw error(400, 'Invalid article id');
	}

	if (typeof title !== 'string' || typeof text !== 'string') {
		throw error(400, 'Invalid form data');
	}

	await getAuthorizedActioner(newsAdminFlags);

	const id = Number(idRaw);
	const existingArticle = await NewsArticle.fetchById(db, id);

	if (!existingArticle) {
		throw error(404, 'Article not found');
	}

	const image = imageRaw instanceof File ? imageRaw : undefined;
	const hasNewImage = image instanceof File && image.name.length > 0 && image.size > 0;
	const imageName = hasNewImage ? await uploadNewsImage(image) : existingArticle.image;

	await NewsArticle.update(db, id, {
		title,
		text,
		image: imageName
	});

	getNewsArticle(id).refresh();
	getNewsArticles().refresh();

	return {
		message: 'Article updated successfully'
	};
});
