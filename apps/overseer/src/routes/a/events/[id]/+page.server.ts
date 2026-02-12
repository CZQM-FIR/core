import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { events } from '@czqm/db/schema';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { type } from 'arktype';
import env from '$lib/env';

export const load = (async ({ params }) => {
	const event = await db.query.events.findFirst({
		where: { id: Number(params.id) }
	});

	if (!event) {
		redirect(303, '/a/events');
	}

	return { event };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormCheckbox = type("'on' | 'off'").pipe((v) => v === 'on');
		const FormData = type({
			name: 'string',
			start: 'string.date',
			end: 'string.date',
			description: 'string',
			image: 'File',
			recurring: FormCheckbox,
			id: type('string.integer').pipe((v) => Number(v))
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400, { message: 'Invalid form data' });
		}

		const { id, name, start, end, description, image, recurring } = data;

		console.log(recurring);

		if (!locals.user) return fail(401);

		const actioner = await db.query.users.findFirst({
			where: { cid: locals.user!.cid },
			with: {
				flags: true
			}
		});

		if (
			!actioner ||
			!actioner.flags.some(
				(f) =>
					f.name === 'admin' ||
					f.name === 'chief' ||
					f.name === 'deputy' ||
					f.name === 'chief-instructor' ||
					f.name === 'events'
			)
		) {
			return fail(401, { message: 'Unauthorized' });
		}

		const event = await db.query.events.findFirst({
			where: { id }
		});

		if (!event) {
			return fail(404, { message: 'Event not found' });
		}

		const fileName = image.name ? `event/${Date.now()}-${image.name}` : event.image;

		if (image.name) {
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
			} catch (error) {
				console.error(error);
				return fail(500, { message: 'Failed to upload image' });
			}
		}

		await db
			.update(events)
			.set({
				name,
				start: new Date(start),
				end: new Date(end),
				description,
				image: image ? fileName : event.image,
				recurring: recurring
			})
			.where(eq(events.id, id));

		return { status: 200, message: 'Event updated successfully' };
	}
};
