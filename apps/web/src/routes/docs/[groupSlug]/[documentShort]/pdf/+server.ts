import { db } from '$lib/db';
import { DmsDocument } from '@czqm/common';
import { GetObjectCommand, S3Client, type GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { error, type RequestHandler } from '@sveltejs/kit';

const getR2Client = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_ACCESS_KEY
    }
  });

export const GET: RequestHandler = async ({ params }) => {
  const document = await DmsDocument.fromGroupSlugAndShort(
    db,
    params.groupSlug ?? '',
    params.documentShort ?? ''
  );

  if (!document) {
    throw error(404, 'Document not found');
  }

  const currentAsset = document.getCurrentAsset();
  if (!currentAsset) {
    throw error(404, 'No current asset available for this document');
  }

  const s3 = getR2Client();
  let assetObject: GetObjectCommandOutput;
  try {
    assetObject = await s3.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: currentAsset.url
      })
    );
  } catch {
    throw error(500, 'Failed to fetch asset from R2');
  }

  if (!assetObject.Body) {
    throw error(404, 'Asset file not found');
  }

  const bytes = await assetObject.Body.transformToByteArray();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const headers = new Headers({
    'Content-Type': assetObject.ContentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=60'
  });

  if (typeof assetObject.ContentLength === 'number') {
    headers.set('Content-Length', String(assetObject.ContentLength));
  }

  return new Response(body, {
    status: 200,
    headers
  });
};
