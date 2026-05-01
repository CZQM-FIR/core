import { command, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { DmsAcknowledgeError, DmsDocument, DmsGroup, User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';

export const getGroups = query(async () => {
  // get all groups who have at least one document with a current asset
  const groups = await DmsGroup.fetchAll(db);

  return groups;
});

export const getActiveGroups = query(async () => {
  const event = getRequestEvent();
  const sessionToken = event.cookies.get('session') ?? '';
  const user = sessionToken ? await User.fromSessionToken(db, sessionToken) : null;
  const canUserAcknowledge = Boolean(user?.hasFlag(['visitor', 'controller']));

  const groups = await DmsGroup.fetchAll(db);

  // Collect (documentId -> currentAssetId) for every document that has an active asset,
  // then look up acknowledgements for the current user in a single query so we don't
  // fan out one request per document on the client.
  const documentToCurrentAssetId = new Map<string, string>();
  for (const group of groups) {
    for (const document of group.documents) {
      const currentAsset = document.getCurrentAsset();
      if (currentAsset) {
        documentToCurrentAssetId.set(document.id, currentAsset.id);
      }
    }
  }

  const acknowledgedAssetIds = new Set<string>();
  if (canUserAcknowledge && user && documentToCurrentAssetId.size > 0) {
    const currentAssetIds = Array.from(new Set(documentToCurrentAssetId.values()));
    const acknowledgements = await db.query.dmsAcknowledgements.findMany({
      where: {
        assetId: { in: currentAssetIds },
        userId: String(user.cid)
      },
      columns: { assetId: true }
    });
    for (const ack of acknowledgements) {
      acknowledgedAssetIds.add(ack.assetId);
    }
  }
  const activeGroups: Array<{
    id: string;
    slug: string;
    name: string;
    sort: number;
    documents: Array<{
      id: string;
      short: string;
      name: string;
      description: string | null;
      required: boolean;
      canAcknowledge: boolean;
    }>;
  }> = [];

  for (const group of groups) {
    const documents = group.documents
      .filter((document) => documentToCurrentAssetId.has(document.id))
      .map((document) => {
        const currentAssetId = documentToCurrentAssetId.get(document.id) ?? null;
        const acknowledged = currentAssetId ? acknowledgedAssetIds.has(currentAssetId) : false;

        return {
          id: document.id,
          short: document.short,
          name: document.name,
          description: document.description,
          required: document.required,
          canAcknowledge:
            canUserAcknowledge && document.required && currentAssetId !== null && !acknowledged
        };
      });

    if (documents.length > 0) {
      activeGroups.push({
        id: group.id,
        slug: group.slug,
        name: group.name,
        sort: group.sort,
        documents
      });
    }
  }

  return activeGroups;
});

export const getCurrentAsset = query(type('string'), async (documentId) => {
  const doc = await DmsDocument.fromId(db, documentId);
  return doc.getCurrentAsset();
});

export const getNextAsset = query(type('string'), async (documentId) => {
  const doc = await DmsDocument.fromId(db, documentId);
  return doc.getNextAsset();
});

export const getDocumentByShort = query(
  type(['string', 'string']),
  async ([groupSlug, documentShort]) => {
    const document = await DmsDocument.fromGroupSlugAndShort(db, groupSlug, documentShort);

    return document;
  }
);

export const getDocumentAcknowledgement = query(type('string'), async (documentId) => {
  const event = getRequestEvent();
  const sessionToken = event.cookies.get('session') ?? '';
  const user = sessionToken ? await User.fromSessionToken(db, sessionToken) : null;

  const document = await DmsDocument.fromId(db, documentId);
  const currentAsset = document.getCurrentAsset();
  const canUserAcknowledge = Boolean(user?.hasFlag(['visitor', 'controller']));

  const acknowledgedAt =
    canUserAcknowledge && user ? await document.getAcknowledgementForCurrentAsset(user.cid) : null;

  return {
    required: document.required,
    currentAssetId: currentAsset?.id ?? null,
    acknowledgedAt: acknowledgedAt ? acknowledgedAt.toISOString() : null,
    canAcknowledge:
      canUserAcknowledge && document.required && Boolean(currentAsset) && acknowledgedAt === null
  };
});

export const acknowledgeDocument = command(type('string'), async (documentId) => {
  const event = getRequestEvent();
  const sessionToken = event.cookies.get('session') ?? '';
  const user = sessionToken ? await User.fromSessionToken(db, sessionToken) : null;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.hasFlag(['visitor', 'controller'])) {
    throw error(403, 'Forbidden');
  }

  const document = await DmsDocument.fromId(db, documentId);

  try {
    const acknowledgement = await document.acknowledgeCurrentAsset(user.cid);
    getDocumentAcknowledgement(documentId).refresh();
    getActiveGroups().refresh();

    return {
      ok: true,
      assetId: acknowledgement.assetId,
      acknowledgedAt: acknowledgement.acknowledgedAt.toISOString()
    };
  } catch (cause) {
    if (cause instanceof DmsAcknowledgeError) {
      if (cause.code === 'ALREADY_ACKNOWLEDGED') {
        throw error(409, cause.message);
      }

      throw error(400, cause.message);
    }

    throw cause;
  }
});
