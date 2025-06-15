import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users } from '@czqm/db/schema';
import { S3Client } from '@aws-sdk/client-s3';
import { CLOUDFLARE_ACCOUNT_ID } from '$env/static/private';
import { R2_ACCESS_KEY_ID } from '$env/static/private';
import { R2_ACCESS_KEY } from '$env/static/private';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { R2_BUCKET_NAME } from '$env/static/private';
import { events } from '@czqm/db/schema';

export const load = (async ({ params }) => {
	const event = await db.query.events.findFirst({
		where: (events, { eq }) => eq(events.id, Number(params.id))
	});

	if (!event) {
		redirect(303, '/a/events');
	}

	return { event };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const start = data.get('start') as string;
		const end = data.get('end') as string;
		const description = data.get('description') as string;
		const image = data.get('image') as File;

		if (!locals.user) return fail(401);

		const actioner = await db.query.users.findFirst({
			where: eq(users.cid, locals.user.cid),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});

		if (
			!actioner ||
			!actioner.flags.some(
				(f) =>
					f.flag.name === 'admin' ||
					f.flag.name === 'chief' ||
					f.flag.name === 'deputy' ||
					f.flag.name === 'chief-instructor' ||
					f.flag.name === 'events'
			)
		) {
			return fail(401, { message: 'Unauthorized' });
		}

		const event = await db.query.events.findFirst({
			where: eq(events.id, Number(data.get('id')))
		});

		if (!event) {
			return fail(404, { message: 'Event not found' });
		}

		const fileName = image.name ? `event/${Date.now()}-${image.name}` : event.image;

		if (image.name) {
			const s3 = new S3Client({
				region: 'auto',
				endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				credentials: {
					accessKeyId: R2_ACCESS_KEY_ID,
					secretAccessKey: R2_ACCESS_KEY
				}
			});

			try {
				await s3.send(
					new PutObjectCommand({
						Bucket: R2_BUCKET_NAME,
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
				image: image ? fileName : event.image
			})
			.where(eq(events.id, Number(data.get('id'))));

		return { status: 200, message: 'Event updated successfully' };
	}
};
