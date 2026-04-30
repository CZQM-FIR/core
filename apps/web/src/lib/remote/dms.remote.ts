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
  // get all groups who have at least one document with a current asset
  const groups = await DmsGroup.fetchAll(db);
  const activeGroups = [];

  for (const group of groups) {
    const documents = await group.documents;

    for (const document of documents) {
      const currentAsset = document.getCurrentAsset();
      if (currentAsset) {
        activeGroups.push(group);
        break;
      }
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
    canUserAcknowledge && user
      ? await document.getAcknowledgementForCurrentAsset(user.cid)
      : null;

  return {
    required: document.required,
    currentAssetId: currentAsset?.id ?? null,
    acknowledgedAt: acknowledgedAt ? acknowledgedAt.toISOString() : null,
    canAcknowledge:
      canUserAcknowledge &&
      document.required &&
      Boolean(currentAsset) &&
      acknowledgedAt === null
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
