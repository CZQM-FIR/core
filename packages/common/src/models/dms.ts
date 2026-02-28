import { dmsAssets, dmsDocuments, dmsGroups } from "@czqm/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import type { DB } from "../db";

type CreateDmsDocumentInput = {
  required: boolean;
  name: string;
  description?: string | null;
  groupId?: string | null;
  short?: string | null;
};

type UpdateDmsDocumentInput = {
  required: boolean;
  name: string;
  description?: string | null;
  groupId?: string | null;
  short?: string | null;
};

type CreateDmsGroupInput = {
  name: string;
  sort?: number;
};

type UpdateDmsGroupInput = {
  name: string;
  sort: number;
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

export class DmsDocument {
  id: string;
  required: boolean;
  name: string;
  description: string | null;
  groupId: string | null;
  short: string | null;
  assets: DmsAsset[];
  group: DmsGroup | null;
  private db: DB;

  constructor(
    input: {
      id: string;
      required: boolean;
      name: string;
      description: string | null;
      groupId: string | null;
      short: string | null;
      assets?: DmsAsset[];
      group?: DmsGroup | null;
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
        },
        db,
      );
    }

    return dmsDocument;
  }

  static async fetchAll(db: DB): Promise<DmsDocument[]> {
    const documents = await db.query.dmsDocuments.findMany({
      with: {
        assets: {
          orderBy: (asset) => [desc(asset.effectiveDate)],
        },
        group: true,
      },
      orderBy: (document) => [asc(document.name)],
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
          },
          db,
        );
      }

      return dmsDocument;
    });
  }

  static async create(db: DB, data: CreateDmsDocumentInput) {
    return await db.insert(dmsDocuments).values({
      required: data.required,
      name: data.name,
      description: data.description ?? null,
      groupId: data.groupId ?? null,
      short: data.short ?? null,
    });
  }

  static async update(db: DB, id: string, data: UpdateDmsDocumentInput) {
    return await db
      .update(dmsDocuments)
      .set({
        required: data.required,
        name: data.name,
        description: data.description ?? null,
        groupId: data.groupId ?? null,
        short: data.short ?? null,
      })
      .where(eq(dmsDocuments.id, id));
  }

  static async remove(db: DB, id: string) {
    return await db.delete(dmsDocuments).where(eq(dmsDocuments.id, id));
  }
}

export class DmsGroup {
  id: string;
  name: string;
  sort: number;
  documents: DmsDocument[];
  private db: DB;

  constructor(
    input: {
      id: string;
      name: string;
      sort: number;
      documents?: DmsDocument[];
    },
    db: DB,
  ) {
    this.id = input.id;
    this.name = input.name;
    this.sort = input.sort;
    this.documents = input.documents ?? [];
    this.db = db;
  }

  static async fromId(db: DB, id: string): Promise<DmsGroup> {
    const group = await db.query.dmsGroups.findFirst({
      where: { id },
      with: {
        documents: {
          orderBy: (document) => [asc(document.name)],
        },
      },
    });

    if (!group) {
      throw new Error("DMS group not found");
    }

    const dmsGroup = new DmsGroup(
      {
        id: group.id,
        name: group.name,
        sort: group.sort,
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
            group: dmsGroup,
          },
          db,
        ),
    );

    return dmsGroup;
  }

  static async fetchAll(db: DB): Promise<DmsGroup[]> {
    const groups = await db.query.dmsGroups.findMany({
      with: {
        documents: {
          orderBy: (document) => [asc(document.name)],
        },
      },
      orderBy: (group) => [asc(group.sort)],
    });

    return groups.map((group) => {
      const dmsGroup = new DmsGroup(
        {
          id: group.id,
          name: group.name,
          sort: group.sort,
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
              group: dmsGroup,
            },
            db,
          ),
      );

      return dmsGroup;
    });
  }

  static async create(db: DB, data: CreateDmsGroupInput) {
    return await db.insert(dmsGroups).values({
      name: data.name,
      sort: data.sort ?? 99,
    });
  }

  static async update(db: DB, id: string, data: UpdateDmsGroupInput) {
    return await db
      .update(dmsGroups)
      .set({
        name: data.name,
        sort: data.sort,
      })
      .where(eq(dmsGroups.id, id));
  }

  static async remove(db: DB, id: string) {
    return await db.delete(dmsGroups).where(eq(dmsGroups.id, id));
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
    return await db.insert(dmsAssets).values({
      documentId: data.documentId,
      version: data.version,
      effectiveDate: data.effectiveDate ?? new Date(),
      expiryDate: data.expiryDate ?? null,
      public: data.public ?? false,
      url: data.url,
    });
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
