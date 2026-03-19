import {
  DmsAsset,
  DmsDocument,
  DmsGroup,
  User,
  UserHours,
  type SoloEndorsementWithPosition,
} from "./models";
import type { Flag } from "@czqm/db/schema";

const parse = (value: unknown) => JSON.parse(value as string);

export const sharedTransport = {
  User: {
    encode: (user: unknown) => {
      if (!(user instanceof User)) return;

      const value = user as {
        cid: number;
        name_first: string;
        name_last: string;
        name_full: string;
        bio: string | null;
        displayName: string;
        hours: {
          thisQuarter: number;
          thisMonth: number;
          lastMonth: number;
          thisActivityHours: number;
          lastActivityHours: number;
          thisYear: number;
          total: number;
          thisQuarterExternal: number;
          lastQuarterExternal: number;
          meetingActivityRequirement: boolean;
          allTime: number;
        };
        flags: Flag[];
        rating: {
          id: number;
          short: string;
          long: string;
        };
        email: string;
        role?: string;
        soloEndorsements?: SoloEndorsementWithPosition[];
      };

      return JSON.stringify({
        cid: value.cid,
        name_first: value.name_first,
        name_last: value.name_last,
        name_full: value.name_full,
        bio: value.bio,
        displayName: value.displayName,
        hours: {
          thisQuarter: value.hours.thisQuarter,
          thisMonth: value.hours.thisMonth,
          lastMonth: value.hours.lastMonth,
          thisActivityHours: value.hours.thisActivityHours,
          lastActivityHours: value.hours.lastActivityHours,
          thisYear: value.hours.thisYear,
          total: value.hours.total,
          thisQuarterExternal: value.hours.thisQuarterExternal,
          lastQuarterExternal: value.hours.lastQuarterExternal,
          meetingActivityRequirement: value.hours.meetingActivityRequirement,
          allTime: value.hours.allTime,
        },
        flags: value.flags,
        rating: value.rating,
        email: value.email,
        role: value.role,
        soloEndorsements: value.soloEndorsements,
      });
    },
    decode: parse,
  },

  UserHours: {
    encode: (hours: unknown) => {
      if (!(hours instanceof UserHours)) return;

      return JSON.stringify({
        thisMonth: hours.thisMonth,
        thisActivityHours: hours.thisActivityHours,
        lastActivityHours: hours.lastActivityHours,
        thisYear: hours.thisYear,
        thisQuarterExternal: hours.thisQuarterExternal,
        lastQuarterExternal: hours.lastQuarterExternal,
        allTime: hours.allTime,
        meetingActivityRequirement: hours.meetingActivityRequirement,
      });
    },
    decode: parse,
  },

  DmsDocument: {
    encode: (document: unknown) => {
      if (!(document instanceof DmsDocument)) return;

      return JSON.stringify({
        id: document.id,
        required: document.required,
        name: document.name,
        description: document.description,
        groupId: document.groupId,
        short: document.short,
        assets: document.assets.map((asset) => ({
          id: asset.id,
          documentId: asset.documentId,
          version: asset.version,
          effectiveDate: asset.effectiveDate,
          expiryDate: asset.expiryDate,
          public: asset.public,
          url: asset.url,
        })),
        group: document.group
          ? {
              id: document.group.id,
              name: document.group.name,
              sort: document.group.sort,
              slug: document.group.slug,
            }
          : null,
      });
    },
    decode: parse,
  },

  DmsGroup: {
    encode: (group: unknown) => {
      if (!(group instanceof DmsGroup)) return;

      return JSON.stringify({
        id: group.id,
        name: group.name,
        sort: group.sort,
        slug: group.slug,
        documents: group.documents.map((document) => ({
          id: document.id,
          required: document.required,
          name: document.name,
          description: document.description,
          groupId: document.groupId,
          short: document.short,
        })),
      });
    },
    decode: parse,
  },

  DmsAsset: {
    encode: (asset: unknown) => {
      if (!(asset instanceof DmsAsset)) return;

      return JSON.stringify({
        id: asset.id,
        documentId: asset.documentId,
        version: asset.version,
        effectiveDate: asset.effectiveDate,
        expiryDate: asset.expiryDate,
        public: asset.public,
        url: asset.url,
        document: {
          id: asset.document.id,
          required: asset.document.required,
          name: asset.document.name,
          description: asset.document.description,
          groupId: asset.document.groupId,
          short: asset.document.short,
        },
      });
    },
    decode: parse,
  },
};
