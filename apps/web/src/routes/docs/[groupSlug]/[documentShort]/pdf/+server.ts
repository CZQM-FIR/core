import { streamDmsAsset } from '$lib/utilities/dms.server';
import { type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ params }) =>
  streamDmsAsset(
    params.groupSlug ?? '',
    params.documentShort ?? '',
    (doc) => doc.getCurrentAsset(),
    'No current asset available for this document'
  );
