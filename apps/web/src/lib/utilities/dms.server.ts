import { db } from '$lib/db';
import { DmsDocument } from '@czqm/common';
import { GetObjectCommand, S3Client, type GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

const getR2Client = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_ACCESS_KEY
    }
  });

/**
 * Resolves a DMS document by group slug + short, picks an asset via the supplied
 * selector, fetches it from R2, and returns a streaming Response. Throws SvelteKit
 * errors for missing document, missing asset, or R2 failures.
 */
export async function streamDmsAsset(
  groupSlug: string,
  documentShort: string,
  selectAsset: (doc: DmsDocument) => { url: string } | null,
  missingAssetMessage: string
): Promise<Response> {
  const document = await DmsDocument.fromGroupSlugAndShort(db, groupSlug, documentShort);

  if (!document) {
    throw error(404, 'Document not found');
  }

  const asset = selectAsset(document);
  if (!asset) {
    throw error(404, missingAssetMessage);
  }

  const s3 = getR2Client();
  let assetObject: GetObjectCommandOutput;
  try {
    assetObject = await s3.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: asset.url
      })
    );
  } catch {
    throw error(500, 'Failed to fetch asset from R2');
  }

  if (!assetObject.Body) {
    throw error(404, 'Asset file not found');
  }

  const headers = new Headers({
    'Content-Type': assetObject.ContentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=60'
  });

  if (typeof assetObject.ContentLength === 'number') {
    headers.set('Content-Length', String(assetObject.ContentLength));
  }

  const body = assetObject.Body as unknown as {
    transformToWebStream?: () => ReadableStream<Uint8Array>;
    transformToByteArray: () => Promise<Uint8Array>;
  };

  // Prefer streaming the SDK body directly (web ReadableStream on Cloudflare Workers /
  // browser-like runtimes) so large PDFs aren't fully buffered into memory. Fall back
  // to buffering only when the runtime doesn't expose a web stream.
  if (typeof body.transformToWebStream === 'function') {
    return new Response(body.transformToWebStream(), {
      status: 200,
      headers
    });
  }

  const bytes = await body.transformToByteArray();
  return new Response(bytes, {
    status: 200,
    headers
  });
}
