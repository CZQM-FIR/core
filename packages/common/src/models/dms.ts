import {
  dmsAcknowledgements,
  dmsAssets,
  dmsDocuments,
  dmsGroups,
} from "@czqm/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import type { DB } from "../db";
import { User } from "./user";

type CreateDmsDocumentInput = {
  required: boolean;
  name: string;
  short: string;
  description?: string | null;
  groupId?: string | null;
  sort?: number;
};

type UpdateDmsDocumentInput = {
  required: boolean;
  name: string;
  description?: string | null;
  groupId?: string | null;
  short: string;
  sort?: number;
};

type CreateDmsGroupInput = {
  name: string;
  sort?: number;
  slug: string;
};

type UpdateDmsGroupInput = {
  name: string;
  sort: number;
  slug: string;
};

type CreateDmsAssetInput = {
  documentId: string;
  version: string;
  effectiveDate?: Date;
  expiryDate?: Date | null;
  public?: boolean;
  url: string;
};

type UpdateDmsAssetInput = {
  documentId: string;
  version: string;
  effectiveDate: Date;
  expiryDate?: Date | null;
  public: boolean;
  url: string;
};

type DmsAssetLike = {
  id: string;
  effectiveDate: Date | string;
  expiryDate: Date | string | null;
  public: boolean;
};

export type DmsAcknowledgeErrorCode =
  | "DOCUMENT_NOT_REQUIRED"
  | "NO_ACTIVE_ASSET"
  | "ASSET_NOT_ACTIVE"
  | "ALREADY_ACKNOWLEDGED";

export type DmsAcknowledgementCandidate = {
  cid: number;
  name: string;
  role: string;
  active: "active" | "inactive" | "loa";
};

export type DmsAcknowledgedCandidate = DmsAcknowledgementCandidate & {
  acknowledgedAt: Date;
};

export type DmsDocumentAcknowledgementSummary = {
  required: boolean;
  currentAssetId: string | null;
  currentAssetVersion: string | null;
  acknowledged: DmsAcknowledgedCandidate[];
  pending: DmsAcknowledgementCandidate[];
};

export class DmsAcknowledgeError extends Error {
  code: DmsAcknowledgeErrorCode;

  constructor(code: DmsAcknowledgeErrorCode, message: string) {
    super(message);
    this.name = "DmsAcknowledgeError";
    this.code = code;
  }
}

/**
 * Detects a SQLite UNIQUE constraint violation across the libsql driver shapes
 * we see in practice. Prefers the structured error code/cause exposed by libsql
 * over string-matching the raw message.
 */
const isUniqueConstraintError = (error: unknown): boolean => {
  const codes = new Set<string>();
  const messages: string[] = [];

  const collect = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return;
    const record = candidate as { code?: unknown; message?: unknown };
    if (typeof record.code === "string") {
      codes.add(record.code);
    }
    if (typeof record.message === "string") {
      messages.push(record.message);
    }
  };

  collect(error);
  if (error && typeof error === "object" && "cause" in error) {
    collect((error as { cause: unknown }).cause);
  }

  for (const code of codes) {
    if (
      code === "SQLITE_CONSTRAINT" ||
      code === "SQLITE_CONSTRAINT_UNIQUE" ||
      code === "SQLITE_CONSTRAINT_PRIMARYKEY"
    ) {
      return true;
    }
  }

  return messages.some(
    (message) =>
      message.includes("UNIQUE constraint failed") ||
      message.includes("dms_acknowledgements_user_asset_unique_idx"),
  );
};

const toDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getCurrentDmsAsset = <T extends DmsAssetLike>(
  assets: T[],
  nowInput: Date | string = new Date(),
): T | null => {
  const now = toDate(nowInput);
  if (!now) {
    return null;
  }

  const eligibleAssets = assets.filter((asset) => {
    if (!asset.public) {
      return false;
    }

    const effectiveDate = toDate(asset.effectiveDate);
    if (!effectiveDate || effectiveDate > now) {
      return false;
    }

    const expiryDate = toDate(asset.expiryDate);
    if (expiryDate && expiryDate <= now) {
      return false;
    }

    return true;
  });

  if (eligibleAssets.length === 0) {
    return null;
  }

  return eligibleAssets.sort((a, b) => {
    const aEffective = toDate(a.effectiveDate)?.getTime() ?? 0;
    const bEffective = toDate(b.effectiveDate)?.getTime() ?? 0;

    if (aEffective !== bEffective) {
      return bEffective - aEffective;
    }

    return a.id.localeCompare(b.id);
  })[0];
};

export const isDmsAssetActive = <T extends DmsAssetLike>(
  asset: T,
  nowInput: Date | string = new Date(),
): boolean => getCurrentDmsAsset([asset], nowInput)?.id === asset.id;

/** Public asset whose effective date is in the future (soonest first). */
export const getNextDmsAsset = <T extends DmsAssetLike>(
  assets: T[],
  nowInput: Date | string = new Date(),
): T | null => {
  const now = toDate(nowInput);
  if (!now) {
    return null;
  }

  const upcoming = assets.filter((asset) => {
    if (!asset.public) {
      return false;
    }

    const effectiveDate = toDate(asset.effectiveDate);
    if (!effectiveDate || effectiveDate <= now) {
      return false;
    }

    return true;
  });

  if (upcoming.length === 0) {
    return null;
  }

  return upcoming.sort((a, b) => {
    const aEffective = toDate(a.effectiveDate)?.getTime() ?? 0;
    const bEffective = toDate(b.effectiveDate)?.getTime() ?? 0;

    if (aEffective !== bEffective) {
      return aEffective - bEffective;
    }

    return a.id.localeCompare(b.id);
  })[0];
};

export class DmsDocument {
  id: string;
  required: boolean;
  name: string;
  description: string | null;
  groupId: string | null;
  short: string;
  assets: DmsAsset[];
  group: DmsGroup | null;
  sort: number;
  private db: DB;

  constructor(
    input: {
      id: string;
      required: boolean;
      name: string;
      description: string | null;
      groupId: string | null;
      short: string;
      assets?: DmsAsset[];
      group?: DmsGroup | null;
      sort?: number;
    },
    db: DB,
  ) {
    this.id = input.id;
    this.required = input.required;
    this.name = input.name;
    this.description = input.description;
    this.groupId = input.groupId;
    this.short = input.short;
    this.assets = input.assets ?? [];
    this.group = input.group ?? null;
    this.sort = input.sort ?? 99;
    this.db = db;
  }

  static async fromId(db: DB, id: string): Promise<DmsDocument> {
    const document = await db.query.dmsDocuments.findFirst({
      where: { id },
      with: {
        assets: {
          orderBy: (asset) => [desc(asset.effectiveDate)],
        },
        group: true,
      },
    });

    if (!document) {
      throw new Error("DMS document not found");
    }

    const dmsDocument = new DmsDocument(
      {
        id: document.id,
        required: document.required,
        name: document.name,
        description: document.description,
        groupId: document.groupId,
        short: document.short,
        sort: document.sort ?? 99,
      },
      db,
    );

    dmsDocument.assets = document.assets.map(
      (asset) =>
        new DmsAsset(
          {
            id: asset.id,
            documentId: asset.documentId,
            version: asset.version,
            effectiveDate: asset.effectiveDate,
            expiryDate: asset.expiryDate,
            public: asset.public,
            url: asset.url,
            document: dmsDocument,
          },
          db,
        ),
    );

    if (document.group) {
      dmsDocument.group = new DmsGroup(
        {
          id: document.group.id,
          name: document.group.name,
          sort: document.group.sort,
          documents: [dmsDocument],
          slug: document.group.slug,
        },
        db,
      );
    }

    return dmsDocument;
  }

  static async fromGroupSlugAndShort(
    db: DB,
    groupSlug: string,
    documentShort: string,
  ): Promise<DmsDocument | null> {
    const normalizedGroupSlug = groupSlug.trim().toLowerCase();
    const normalizedDocumentShort = documentShort.trim().toLowerCase();

    if (!normalizedGroupSlug || !normalizedDocumentShort) {
      return null;
    }

    const group = await db.query.dmsGroups.findFirst({
      where: { slug: normalizedGroupSlug },
    });

    if (!group) {
      return null;
    }

    const document = await db.query.dmsDocuments.findFirst({
      where: {
        groupId: group.id,
        short: normalizedDocumentShort,
      },
    });

    if (!document) {
      return null;
    }

    return await DmsDocument.fromId(db, document.id);
  }

  static async fetchAll(db: DB): Promise<DmsDocument[]> {
    const documents = await db.query.dmsDocuments.findMany({
      with: {
        assets: {
          orderBy: (asset) => [desc(asset.effectiveDate)],
        },
        group: true,
      },
      orderBy: (document) => [asc(document.sort), asc(document.name)],
    });

    return documents.map((document) => {
      const dmsDocument = new DmsDocument(
        {
          id: document.id,
          required: document.required,
          name: document.name,
          description: document.description,
          groupId: document.groupId,
          short: document.short,
          sort: document.sort ?? 99,
        },
        db,
      );

      dmsDocument.assets = document.assets.map(
        (asset) =>
          new DmsAsset(
            {
              id: asset.id,
              documentId: asset.documentId,
              version: asset.version,
              effectiveDate: asset.effectiveDate,
              expiryDate: asset.expiryDate,
              public: asset.public,
              url: asset.url,
              document: dmsDocument,
            },
            db,
          ),
      );

      if (document.group) {
        dmsDocument.group = new DmsGroup(
          {
            id: document.group.id,
            name: document.group.name,
            sort: document.group.sort,
            documents: [dmsDocument],
            slug: document.group.slug,
          },
          db,
        );
      }

      return dmsDocument;
    });
  }

  static async getPendingForUser(
    db: DB,
    userCid: string | number,
    now: Date | string = new Date(),
  ): Promise<
    Array<{
      id: string;
      name: string;
      short: string;
      groupSlug: string | null;
      assetVersion: string;
      url: string;
    }>
  > {
    const documents = await DmsDocument.fetchAll(db);

    type PendingCandidate = {
      doc: DmsDocument;
      currentAsset: DmsAsset;
      groupSlug: string;
    };

    const candidates: PendingCandidate[] = [];
    for (const doc of documents) {
      if (!doc.required) continue;

      const groupSlug = doc.group?.slug;
      if (!groupSlug) continue;

      const currentAsset = doc.getCurrentAsset(now);
      if (!currentAsset) continue;

      candidates.push({ doc, currentAsset, groupSlug });
    }

    if (candidates.length === 0) {
      return [];
    }

    // Batch a single acknowledgement lookup across every current asset to avoid an
    // N+1 query per document, which previously ran on every controller connect.
    const currentAssetIds = Array.from(
      new Set(candidates.map((candidate) => candidate.currentAsset.id)),
    );
    const acknowledgements = await db.query.dmsAcknowledgements.findMany({
      where: {
        assetId: { in: currentAssetIds },
        userId: String(userCid),
      },
      columns: { assetId: true },
    });
    const acknowledgedAssetIds = new Set(
      acknowledgements.map((acknowledgement) => acknowledgement.assetId),
    );

    return candidates
      .filter((candidate) => !acknowledgedAssetIds.has(candidate.currentAsset.id))
      .map((candidate) => ({
        id: candidate.doc.id,
        name: candidate.doc.name,
        short: candidate.doc.short,
        groupSlug: candidate.groupSlug,
        assetVersion: candidate.currentAsset.version,
        url: `/docs/${candidate.groupSlug}/${candidate.doc.short}`,
      }));
  }

  static async create(db: DB, data: CreateDmsDocumentInput) {
    const doc = (
      await db
        .insert(dmsDocuments)
        .values({
          required: data.required,
          name: data.name,
          short: data.short,
          description: data.description ?? null,
          groupId: data.groupId ?? null,
          sort: data.sort ?? 99,
        })
        .returning({ id: dmsDocuments.id })
    )[0];

    return (await DmsDocument.fromId(db, doc.id)) as DmsDocument;
  }

  static async update(db: DB, id: string, data: UpdateDmsDocumentInput) {
    return await db
      .update(dmsDocuments)
      .set({
        required: data.required,
        name: data.name,
        description: data.description ?? null,
        short: data.short,
        sort: data.sort ?? 99,
        ...(data.groupId !== undefined ? { groupId: data.groupId } : {}),
      })
      .where(eq(dmsDocuments.id, id));
  }

  static async remove(db: DB, id: string) {
    return await db.delete(dmsDocuments).where(eq(dmsDocuments.id, id));
  }

  getCurrentAsset(now: Date | string = new Date()) {
    return getCurrentDmsAsset(this.assets, now);
  }

  getNextAsset(now: Date | string = new Date()) {
    return getNextDmsAsset(this.assets, now);
  }

  private normalizeAcknowledgementUserId(userCid: string | number): string {
    return String(userCid);
  }

  async getAcknowledgementForCurrentAsset(
    userCid: string | number,
    now: Date | string = new Date(),
  ): Promise<Date | null> {
    const currentAsset = this.getCurrentAsset(now);
    if (!currentAsset) {
      return null;
    }

    const acknowledgement = await this.db.query.dmsAcknowledgements.findFirst({
      where: {
        assetId: currentAsset.id,
        userId: this.normalizeAcknowledgementUserId(userCid),
      },
      columns: {
        acknowledgedAt: true,
      },
    });

    return acknowledgement?.acknowledgedAt ?? null;
  }

  async acknowledgeCurrentAsset(
    userCid: string | number,
    now: Date | string = new Date(),
  ): Promise<{ acknowledgedAt: Date; assetId: string }> {
    if (!this.required) {
      throw new DmsAcknowledgeError(
        "DOCUMENT_NOT_REQUIRED",
        "This document does not require acknowledgement.",
      );
    }

    const currentAsset = this.getCurrentAsset(now);
    if (!currentAsset) {
      throw new DmsAcknowledgeError(
        "NO_ACTIVE_ASSET",
        "This document does not currently have an active asset.",
      );
    }

    if (!isDmsAssetActive(currentAsset, now)) {
      throw new DmsAcknowledgeError(
        "ASSET_NOT_ACTIVE",
        "Only active document assets can be acknowledged.",
      );
    }

    const normalizedUserId = this.normalizeAcknowledgementUserId(userCid);
    const existingAcknowledgement =
      await this.db.query.dmsAcknowledgements.findFirst({
        where: {
          assetId: currentAsset.id,
          userId: normalizedUserId,
        },
        columns: {
          id: true,
        },
      });

    if (existingAcknowledgement) {
      throw new DmsAcknowledgeError(
        "ALREADY_ACKNOWLEDGED",
        "You have already acknowledged the current document asset.",
      );
    }

    try {
      const inserted = await this.db
        .insert(dmsAcknowledgements)
        .values({
          assetId: currentAsset.id,
          userId: normalizedUserId,
          acknowledgedAt: new Date(),
        })
        .returning({
          acknowledgedAt: dmsAcknowledgements.acknowledgedAt,
        });

      const acknowledgement = inserted[0];
      return {
        acknowledgedAt: acknowledgement?.acknowledgedAt ?? new Date(),
        assetId: currentAsset.id,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DmsAcknowledgeError(
          "ALREADY_ACKNOWLEDGED",
          "You have already acknowledged the current document asset.",
        );
      }

      throw error;
    }
  }

  async getCurrentAssetAcknowledgementSummary(
    now: Date | string = new Date(),
  ): Promise<DmsDocumentAcknowledgementSummary> {
    const currentAsset = this.getCurrentAsset(now);
    const candidates = (await User.fromFlag(this.db, ["controller", "visitor"]))
      .map((user) => ({
        cid: user.cid,
        name: user.displayName,
        role: user.role,
        active: user.active,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!this.required || !currentAsset) {
      return {
        required: this.required,
        currentAssetId: currentAsset?.id ?? null,
        currentAssetVersion: currentAsset?.version ?? null,
        acknowledged: [],
        pending: [],
      };
    }

    const acknowledgements = await this.db.query.dmsAcknowledgements.findMany({
      where: {
        assetId: currentAsset.id,
      },
      columns: {
        userId: true,
        acknowledgedAt: true,
      },
    });

    const acknowledgementsByUserId = new Map(
      acknowledgements.map((acknowledgement) => [
        acknowledgement.userId,
        acknowledgement.acknowledgedAt,
      ]),
    );

    const acknowledged: DmsAcknowledgedCandidate[] = [];
    const pending: DmsAcknowledgementCandidate[] = [];

    for (const candidate of candidates) {
      const acknowledgedAt = acknowledgementsByUserId.get(String(candidate.cid));

      if (acknowledgedAt) {
        acknowledged.push({
          ...candidate,
          acknowledgedAt,
        });
        continue;
      }

      pending.push(candidate);
    }

    acknowledged.sort(
      (a, b) => b.acknowledgedAt.getTime() - a.acknowledgedAt.getTime(),
    );

    return {
      required: this.required,
      currentAssetId: currentAsset.id,
      currentAssetVersion: currentAsset.version,
      acknowledged,
      pending,
    };
  }
}

export class DmsGroup {
  id: string;
  name: string;
  sort: number;
  slug: string;
  documents: DmsDocument[];
  private db: DB;

  constructor(
    input: {
      id: string;
      name: string;
      sort: number;
      documents?: DmsDocument[];
      slug: string;
    },
    db: DB,
  ) {
    this.id = input.id;
    this.name = input.name;
    this.sort = input.sort;
    this.documents = input.documents ?? [];
    this.slug = input.slug;
    this.db = db;
  }

  static async fromId(db: DB, id: string): Promise<DmsGroup | null> {
    const group = await db.query.dmsGroups.findFirst({
      where: { id },
      with: {
        documents: {
          orderBy: (document) => [asc(document.sort), asc(document.name)],
        },
      },
    });

    if (!group) {
      return null;
    }

    const dmsGroup = new DmsGroup(
      {
        id: group.id,
        name: group.name,
        sort: group.sort,
        slug: group.slug,
      },
      db,
    );

    dmsGroup.documents = group.documents.map(
      (document) =>
        new DmsDocument(
          {
            id: document.id,
            required: document.required,
            name: document.name,
            description: document.description,
            groupId: document.groupId,
            short: document.short,
            sort: document.sort ?? 99,
            group: dmsGroup,
          },
          db,
        ),
    );

    return dmsGroup;
  }

  static async fromSlug(db: DB, slug: string): Promise<DmsGroup | null> {
    const group = await db.query.dmsGroups.findFirst({
      where: { slug },
    });

    if (!group) {
      return null;
    }

    return DmsGroup.fromId(db, group.id);
  }

  static async fetchAll(db: DB): Promise<DmsGroup[]> {
    const groups = await db.query.dmsGroups.findMany({
      with: {
        documents: {
          orderBy: (document) => [asc(document.sort), asc(document.name)],
          with: {
            assets: true,
          },
        },
      },
      orderBy: (group) => [asc(group.sort), asc(group.name)],
    });

    return groups.map((group) => {
      const dmsGroup = new DmsGroup(
        {
          id: group.id,
          name: group.name,
          sort: group.sort,
          slug: group.slug,
        },
        db,
      );

      dmsGroup.documents = group.documents.map((document) => {
        const dmsDocument = new DmsDocument(
          {
            id: document.id,
            required: document.required,
            name: document.name,
            description: document.description,
            groupId: document.groupId,
            short: document.short,
            sort: document.sort ?? 99,
            group: dmsGroup,
          },
          db,
        );

        dmsDocument.assets = document.assets.map(
          (asset) =>
            new DmsAsset(
              {
                id: asset.id,
                documentId: asset.documentId,
                version: asset.version,
                effectiveDate: asset.effectiveDate,
                expiryDate: asset.expiryDate,
                public: asset.public,
                url: asset.url,
                document: dmsDocument,
              },
              db,
            ),
        );

        return dmsDocument;
      });

      return dmsGroup;
    });
  }

  static async create(db: DB, data: CreateDmsGroupInput) {
    const group = (
      await db
        .insert(dmsGroups)
        .values({
          name: data.name,
          sort: data.sort ?? 99,
          slug: data.slug,
        })
        .returning({ id: dmsGroups.id })
    )[0];

    return (await DmsGroup.fromId(db, group.id)) as DmsGroup;
  }

  static async update(db: DB, id: string, data: UpdateDmsGroupInput) {
    return await db
      .update(dmsGroups)
      .set({
        name: data.name,
        sort: data.sort,
        slug: data.slug,
      })
      .where(eq(dmsGroups.id, id));
  }

  static async remove(db: DB, id: string) {
    return await db.delete(dmsGroups).where(eq(dmsGroups.id, id));
  }

  async delete() {
    return await DmsGroup.remove(this.db, this.id);
  }
}

export class DmsAsset {
  id: string;
  documentId: string;
  version: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  public: boolean;
  url: string;
  document: DmsDocument;
  private db: DB;

  constructor(
    input: {
      id: string;
      documentId: string;
      version: string;
      effectiveDate: Date;
      expiryDate: Date | null;
      public: boolean;
      url: string;
      document: DmsDocument;
    },
    db: DB,
  ) {
    this.id = input.id;
    this.documentId = input.documentId;
    this.version = input.version;
    this.effectiveDate = input.effectiveDate;
    this.expiryDate = input.expiryDate;
    this.public = input.public;
    this.url = input.url;
    this.document = input.document;
    this.db = db;
  }

  static async fromId(db: DB, id: string): Promise<DmsAsset> {
    const asset = await db.query.dmsAssets.findFirst({
      where: { id },
      with: {
        document: true,
      },
    });

    if (!asset) {
      throw new Error("DMS asset not found");
    }

    const document = new DmsDocument(
      {
        id: asset.document.id,
        required: asset.document.required,
        name: asset.document.name,
        description: asset.document.description,
        groupId: asset.document.groupId,
        short: asset.document.short,
      },
      db,
    );

    const dmsAsset = new DmsAsset(
      {
        id: asset.id,
        documentId: asset.documentId,
        version: asset.version,
        effectiveDate: asset.effectiveDate,
        expiryDate: asset.expiryDate,
        public: asset.public,
        url: asset.url,
        document,
      },
      db,
    );

    document.assets = [dmsAsset];

    return dmsAsset;
  }

  static async fetchAll(db: DB): Promise<DmsAsset[]> {
    const assets = await db.query.dmsAssets.findMany({
      with: {
        document: true,
      },
      orderBy: (asset) => [desc(asset.effectiveDate)],
    });

    return assets.map((asset) => {
      const document = new DmsDocument(
        {
          id: asset.document.id,
          required: asset.document.required,
          name: asset.document.name,
          description: asset.document.description,
          groupId: asset.document.groupId,
          short: asset.document.short,
        },
        db,
      );

      const dmsAsset = new DmsAsset(
        {
          id: asset.id,
          documentId: asset.documentId,
          version: asset.version,
          effectiveDate: asset.effectiveDate,
          expiryDate: asset.expiryDate,
          public: asset.public,
          url: asset.url,
          document,
        },
        db,
      );

      document.assets = [dmsAsset];

      return dmsAsset;
    });
  }

  static async fetchByDocumentId(
    db: DB,
    documentId: string,
  ): Promise<DmsAsset[]> {
    const document = await DmsDocument.fromId(db, documentId);
    return document.assets;
  }

  static async create(db: DB, data: CreateDmsAssetInput) {
    const asset = (
      await db
        .insert(dmsAssets)
        .values({
          documentId: data.documentId,
          version: data.version,
          effectiveDate: data.effectiveDate ?? new Date(),
          expiryDate: data.expiryDate ?? null,
          public: data.public ?? false,
          url: data.url,
        })
        .returning({ id: dmsAssets.id })
    )[0];

    return (await DmsAsset.fromId(db, asset.id)) as DmsAsset;
  }

  static async update(db: DB, id: string, data: UpdateDmsAssetInput) {
    return await db
      .update(dmsAssets)
      .set({
        documentId: data.documentId,
        version: data.version,
        effectiveDate: data.effectiveDate,
        expiryDate: data.expiryDate ?? null,
        public: data.public,
        url: data.url,
      })
      .where(eq(dmsAssets.id, id));
  }

  static async remove(db: DB, id: string) {
    return await db.delete(dmsAssets).where(eq(dmsAssets.id, id));
  }
}

export class DMS {
  static Document = DmsDocument;
  static Group = DmsGroup;
  static Asset = DmsAsset;

  groups: DmsGroup[];
  documents: DmsDocument[];
  assets: DmsAsset[];

  private db: DB;

  constructor(
    db: DB,
    groups: DmsGroup[],
    documents: DmsDocument[],
    assets: DmsAsset[],
  ) {
    this.groups = groups;
    this.documents = documents;
    this.assets = assets;
    this.db = db;
  }

  static async fetch(db: DB) {
    const [groups, documents, assets] = await Promise.all([
      DmsGroup.fetchAll(db),
      DmsDocument.fetchAll(db),
      DmsAsset.fetchAll(db),
    ]);

    return new DMS(db, groups, documents, assets);
  }
}
