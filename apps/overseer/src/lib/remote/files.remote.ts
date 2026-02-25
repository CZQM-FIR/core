import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import env from '$lib/env';

const getSingle = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const uploadFile = form('unchecked', async (raw) => {
	const file = getSingle(raw.file) as File | undefined;
	const event = getRequestEvent();
	const actioner = await User.fromCid(db, event.locals.user?.cid ?? 0);
	if (!actioner || !actioner.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}
	if (!file || !file.name) {
		return { success: false, error: 'No file uploaded.', key: null };
	}
	const fileName = `upload/${Date.now()}-${file.name}`;
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
	} catch (err) {
		console.error(err);
		return { success: false, error: 'Failed to upload file to R2.', key: null };
	}
	return { success: true, key: fileName };
});
