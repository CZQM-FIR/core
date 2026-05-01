import { db } from '$lib/db';
import { DmsDocument } from '@czqm/common';
import { error, type RequestEvent } from '@sveltejs/kit';

/**
 * Resolves a DMS document by group slug + short, picks an asset via the supplied
 * selector, fetches it from R2 via the Cloudflare binding, and returns a
 * streaming Response. Throws SvelteKit errors for missing document, missing
 * asset, or R2 failures.
 */
export async function streamDmsAsset(
  event: RequestEvent,
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

  const bucket = event.platform?.env.bucket;
  if (!bucket) {
    console.error('[dms] R2 binding `bucket` is not available on platform.env');
    throw error(500, 'Asset storage is not configured');
  }

  let object: R2ObjectBody | null;
  try {
    object = await bucket.get(asset.url);
  } catch (err) {
    console.error('[dms] R2 fetch failed', { key: asset.url, err });
    throw error(500, 'Failed to fetch asset from R2');
  }

  if (!object) {
    throw error(404, 'Asset file not found');
  }

  const headers = new Headers({
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=60',
    'Content-Length': String(object.size),
    etag: object.httpEtag
  });

  return new Response(object.body, {
    status: 200,
    headers
  });
}
