import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/db';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import env from '$lib/env';
import { type } from 'arktype';
import { User } from '@czqm/common';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			file: 'File'
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400, { success: false, error: 'Invalid form data.' });
		}

		const { file } = data;

		if (!file) {
			return fail(400, { success: false, error: 'No file uploaded.' });
		}

		const actioner = await User.fromCid(db, locals.user?.cid || 0);

		if (!actioner || !actioner.hasFlag(['admin', 'staff'])) {
			return fail(401);
		}

		const fileName: string | null = file?.name ? `upload/${Date.now()}-${file?.name}` : null;

		if (fileName && file) {
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
						Body: new Uint8Array(await file.arrayBuffer()),
						ContentType: file.type
					})
				);
			} catch (error) {
				console.error(error);
				return fail(500, { success: false, error: 'Failed to upload file to R2.' + error });
			}
		}

		return { success: true, key: fileName };
	}
};
