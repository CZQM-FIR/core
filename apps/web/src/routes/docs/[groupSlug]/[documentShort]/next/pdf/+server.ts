import { streamDmsAsset } from '$lib/utilities/dms.server';
import { type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = (event) =>
  streamDmsAsset(
    event,
    event.params.groupSlug ?? '',
    event.params.documentShort ?? '',
    (doc) => doc.getNextAsset(),
    'No upcoming asset available for this document'
  );
