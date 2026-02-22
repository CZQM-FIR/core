import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import env from '$lib/env';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Event, type FlagName, User } from '@czqm/common';
import { error, redirect } from '@sveltejs/kit';
import { type } from 'arktype';

const eventManagerFlags: FlagName[] = ['admin', 'chief', 'deputy', 'chief-instructor', 'events'];

const createDateFromInput = (value: string) => {
	const parsed = new Date(value);

	if (isNaN(parsed.getTime())) {
		throw error(400, 'Invalid date value');
	}

	return parsed;
};

const getAuthorizedActioner = async () => {
	const event = getRequestEvent();

	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags: eventManagerFlags
	});

	if (!actioner) {
		throw error(403, 'Forbidden');
	}

	return actioner;
};

const uploadEventImage = async (image: File) => {
	const fileName = `event/${Date.now()}-${image.name}`;

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

export const getEvents = query(async () => {
	await getAuthorizedActioner();

	return await Event.fetchAll(db);
});

export const getEvent = query(type('number.integer >= 0'), async (id) => {
	await getAuthorizedActioner();

	const event = await Event.fetchById(db, id);

	if (!event) {
		throw error(404, 'Event not found');
	}

	return event;
});

export const deleteEvent = command(type('number.integer >= 0'), async (id) => {
	await getAuthorizedActioner();

	const event = await Event.fetchById(db, id);

	if (!event) {
		throw error(404, 'Event not found');
	}

	await Event.remove(db, id);
	getEvents().refresh();
});

export const createEvent = form(
	type({
		name: 'string',
		start: 'string',
		end: 'string',
		description: 'string',
		image: 'File'
	}),
	async ({ name, start, end, description, image }) => {
		await getAuthorizedActioner();

		if (!image.name) {
			throw error(400, 'Event image is required');
		}

		const imageKey = await uploadEventImage(image);

		await Event.create(db, {
			name,
			start: createDateFromInput(start),
			end: createDateFromInput(end),
			description,
			image: imageKey
		});

		getEvents().refresh();
		redirect(303, '/a/events');
	}
);

export const updateEvent = form('unchecked', async (rawData) => {
	const getSingleValue = (value: unknown) => {
		if (Array.isArray(value)) {
			return value[0];
		}

		return value;
	};

	const idRaw = getSingleValue(rawData.id);
	const nameRaw = getSingleValue(rawData.name);
	const startRaw = getSingleValue(rawData.start);
	const endRaw = getSingleValue(rawData.end);
	const descriptionRaw = getSingleValue(rawData.description);
	const recurringRaw = getSingleValue(rawData.recurring);
	const imageRaw = getSingleValue(rawData.image);

	if (typeof idRaw !== 'string' || !/^\d+$/.test(idRaw)) {
		throw error(400, 'Invalid event id');
	}

	if (
		typeof nameRaw !== 'string' ||
		typeof startRaw !== 'string' ||
		typeof endRaw !== 'string' ||
		typeof descriptionRaw !== 'string'
	) {
		throw error(400, 'Invalid event form data');
	}

	const id = Number(idRaw);
	const name = nameRaw;
	const start = startRaw;
	const end = endRaw;
	const description = descriptionRaw;
	const recurring = recurringRaw === 'on';
	const image = imageRaw instanceof File ? imageRaw : undefined;

	await getAuthorizedActioner();

	const existingEvent = await Event.fetchById(db, id);

	if (!existingEvent) {
		throw error(404, 'Event not found');
	}

	const hasNewImage = image instanceof File && image.name.length > 0 && image.size > 0;
	const imageKey = hasNewImage ? await uploadEventImage(image) : existingEvent.image;

	await Event.update(db, id, {
		name,
		start: createDateFromInput(start),
		end: createDateFromInput(end),
		description,
		image: imageKey,
		recurring
	});

	getEvent(id).refresh();
	getEvents().refresh();

	return {
		message: 'Event updated successfully'
	};
});
