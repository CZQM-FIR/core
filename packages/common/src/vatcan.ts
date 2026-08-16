import type { Env } from "./types";

type VatcanCbtCatalogBlock = {
  id: number;
  title: string;
  sort: number;
};

type VatcanCbtCatalogResponse = {
  success: string;
  facility: {
    id: number;
    name_short: string;
    name_long: string;
  };
  data: VatcanCbtCatalogBlock[];
};

type VatcanApiErrorResponse = {
  error?: string;
  message?: string;
};

export type VatcanCbtBlockOption = {
  id: number;
  title: string;
  sort: number;
  facilityLabel: string;
  source: "division" | "facility";
  brandName: string;
};

export type VatcanCbtBlockMeta = {
  title: string;
  brandName: string;
};

export function formatCbtBlockKey(
  block: Pick<VatcanCbtBlockOption, "source" | "id">,
): string {
  return `${block.source}:${block.id}`;
}

export function parseCbtBlockKey(blockKey: string): {
  source?: "division" | "facility";
  blockId: string;
} {
  const trimmed = blockKey.trim();
  const match = trimmed.match(/^(division|facility):(\d+)$/);
  if (match) {
    return { source: match[1] as "division" | "facility", blockId: match[2] };
  }

  return { blockId: trimmed };
}

export function findVatcanCbtBlock(
  blocks: VatcanCbtBlockOption[],
  blockKey: string,
): VatcanCbtBlockOption | undefined {
  const { source, blockId } = parseCbtBlockKey(blockKey);
  const id = Number(blockId);
  if (!Number.isFinite(id)) {
    return undefined;
  }

  return blocks.find(
    (candidate) =>
      Number(candidate.id) === id &&
      (source === undefined || candidate.source === source),
  );
}

export function encodeVatcanCbtTaskValue2(
  block: Pick<VatcanCbtBlockOption, "source" | "title">,
): string {
  return `${block.source}:${block.title}`;
}

export function decodeVatcanCbtTaskValue2(
  taskValue2: string | null,
): { source: "division" | "facility"; title: string } | null {
  const trimmed = taskValue2?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(division|facility):(.*)$/s);
  if (match) {
    return {
      source: match[1] as "division" | "facility",
      title: match[2],
    };
  }

  // Legacy rows stored only the title before source encoding.
  return { source: "division", title: trimmed };
}

export function vatcanCbtBlockMetaFromOption(
  block: VatcanCbtBlockOption,
): VatcanCbtBlockMeta {
  return { title: block.title, brandName: block.brandName };
}

const CBT_CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

type CachedCatalog = {
  expiresAt: number;
  data: VatcanCbtCatalogResponse;
};

type CachedBlockOptions = {
  expiresAt: number;
  blocks: VatcanCbtBlockOption[];
};

const catalogCache: Record<"division" | "facility", Map<string, CachedCatalog>> =
  {
    division: new Map(),
    facility: new Map(),
  };

const catalogInflight: Record<
  "division" | "facility",
  Map<string, Promise<VatcanCbtCatalogResponse>>
> = {
  division: new Map(),
  facility: new Map(),
};

const blockOptionsCache = new Map<string, CachedBlockOptions>();
const blockOptionsInflight = new Map<string, Promise<VatcanCbtBlockOption[]>>();

function getCachedCatalog(
  path: "division" | "facility",
  token: string,
): VatcanCbtCatalogResponse | null {
  const entry = catalogCache[path].get(token);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.data;
}

function getStaleCatalog(
  path: "division" | "facility",
  token: string,
): VatcanCbtCatalogResponse | null {
  return catalogCache[path].get(token)?.data ?? null;
}

function setCachedCatalog(
  path: "division" | "facility",
  token: string,
  data: VatcanCbtCatalogResponse,
): void {
  catalogCache[path].set(token, {
    expiresAt: Date.now() + CBT_CATALOG_CACHE_TTL_MS,
    data,
  });
}

async function fetchVatcanCbtCatalogCached(
  path: "division" | "facility",
  token: string,
): Promise<VatcanCbtCatalogResponse> {
  const cached = getCachedCatalog(path, token);
  if (cached) {
    return cached;
  }

  const inflight = catalogInflight[path].get(token);
  if (inflight) {
    return inflight;
  }

  const request = fetchVatcanCbtCatalog(path, token)
    .then((data) => {
      setCachedCatalog(path, token, data);
      catalogInflight[path].delete(token);
      return data;
    })
    .catch((err) => {
      catalogInflight[path].delete(token);
      if (isVatcanRateLimited(err)) {
        const stale = getStaleCatalog(path, token);
        if (stale) {
          return stale;
        }
      }
      throw err;
    });

  catalogInflight[path].set(token, request);
  return request;
}

function isVatcanRateLimited(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  return (
    err.name === "VatcanRateLimitError" ||
    /rate limit/i.test(err.message) ||
    /\b429\b/.test(err.message)
  );
}

function mergeCatalogBlocks(
  catalogs: {
    catalog: VatcanCbtCatalogResponse;
    source: "division" | "facility";
  }[],
): VatcanCbtBlockOption[] {
  const options: VatcanCbtBlockOption[] = [];

  for (const { catalog, source } of catalogs) {
    const facilityLabel = `${catalog.facility.name_long} (${catalog.facility.name_short})`;
    const brandName =
      source === "division" ? "VATCAN" : catalog.facility.name_short;
    for (const block of catalog.data) {
      options.push({
        id: block.id,
        title: block.title,
        sort: block.sort,
        facilityLabel,
        source,
        brandName,
      });
    }
  }

  return options.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source === "division" ? -1 : 1;
    }
    if (a.facilityLabel !== b.facilityLabel) {
      return a.facilityLabel.localeCompare(b.facilityLabel);
    }
    return a.sort - b.sort || a.title.localeCompare(b.title);
  });
}

export function getVatcanCbtTaskUrl(taskValue2: string | null): string {
  const decoded = decodeVatcanCbtTaskValue2(taskValue2);
  return decoded?.source === "facility"
    ? "https://vatcan.ca/my/cbt/CZQM"
    : "https://vatcan.ca/my/cbt";
}

export function getVatcanTaskUrl(
  taskType: string,
  taskValue2: string | null,
): string | undefined {
  switch (taskType) {
    case "vatcan_exam":
      return "https://vatcan.ca/training/exams";
    case "vatcan_cbt":
      return getVatcanCbtTaskUrl(taskValue2);
    default:
      return undefined;
  }
}

async function fetchVatcanCbtCatalog(
  path: "division" | "facility",
  token?: string,
): Promise<VatcanCbtCatalogResponse> {
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`https://vatcan.ca/api/v2/${path}/cbt`, {
    headers,
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as VatcanApiErrorResponse | null;

    const message =
      body?.message ??
      `Failed to fetch VATCAN ${path} CBT catalog: ${response.statusText}`;

    if (response.status === 429) {
      const err = new Error(message);
      err.name = "VatcanRateLimitError";
      throw err;
    }

    throw new Error(message);
  }

  return (await response.json()) as VatcanCbtCatalogResponse;
}

export async function fetchVatcanCbtBlockOptions(
  env: Pick<Env, "VATCAN_API_TOKEN">,
  fetchOptions?: { requireFacility?: boolean },
): Promise<VatcanCbtBlockOption[]> {
  const token = env.VATCAN_API_TOKEN;
  if (!token) {
    throw new Error("VATCAN_API_TOKEN is not configured");
  }

  const cachedBlocks = blockOptionsCache.get(token);
  if (cachedBlocks && cachedBlocks.expiresAt > Date.now()) {
    return cachedBlocks.blocks;
  }

  const inflight = blockOptionsInflight.get(token);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const loadedCatalogs: {
      catalog: VatcanCbtCatalogResponse;
      source: "division" | "facility";
    }[] = [];

    const catalogs: {
      path: "division" | "facility";
      source: "division" | "facility";
    }[] = [
      { path: "division", source: "division" },
      { path: "facility", source: "facility" },
    ];

    for (const { path, source } of catalogs) {
      try {
        const catalog = await fetchVatcanCbtCatalogCached(path, token);
        loadedCatalogs.push({ catalog, source });
      } catch (err) {
        if (source === "division") {
          throw err;
        }
        if (fetchOptions?.requireFacility) {
          throw err;
        }
        // Facility catalog may be unavailable for some API keys.
      }
    }

    const blocks = mergeCatalogBlocks(loadedCatalogs);
    blockOptionsCache.set(token, {
      expiresAt: Date.now() + CBT_CATALOG_CACHE_TTL_MS,
      blocks,
    });
    return blocks;
  })()
    .catch((err) => {
      if (isVatcanRateLimited(err)) {
        const stale = blockOptionsCache.get(token);
        if (stale) {
          return stale.blocks;
        }
      }
      throw err;
    })
    .finally(() => {
      blockOptionsInflight.delete(token);
    });

  blockOptionsInflight.set(token, request);
  return request;
}

export class VatcanNoteLockedError extends Error {
  constructor(message = "VATCAN no longer accepts edits to this training note") {
    super(message);
    this.name = "VatcanNoteLockedError";
  }
}

/** Vector training session type → VATCAN `session_type` integer. */
export const VATCAN_SESSION_TYPE_BY_VECTOR_TYPE: Record<string, number> = {
  sweatbox: 0,
  monitoring: 1,
  ots: 2,
  orientation: 3,
  generic: 3,
};

const VATCAN_SESSION_TYPE_LABELS: Record<number, string> = {
  0: "Sweatbox",
  1: "Monitoring",
  2: "OTS",
  3: "Orientation",
};

export function vatcanSessionTypeFromVector(
  sessionType: string | null | undefined,
): number {
  if (!sessionType) return 3;
  return VATCAN_SESSION_TYPE_BY_VECTOR_TYPE[sessionType] ?? 3;
}

export function vatcanSessionTypeLabel(
  sessionType: number | null | undefined,
): string | null {
  if (sessionType == null) return null;
  return VATCAN_SESSION_TYPE_LABELS[sessionType] ?? null;
}

function formatVatcanNoteTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}z`;
}

export function formatVatcanTrainingNote(
  note: string,
  actualStartedAt: Date,
  actualEndedAt: Date,
  header: {
    sessionTypeLabel: string;
    sessionDescription?: string | null;
    objectives?: { text: string; achieved: boolean }[] | null;
  },
): string {
  const start = `Start ${formatVatcanNoteTime(actualStartedAt)}`;
  const end = `End ${formatVatcanNoteTime(actualEndedAt)}`;
  const description = header.sessionDescription?.trim();
  const sessionPart = description
    ? `${header.sessionTypeLabel} session: ${description}`
    : `${header.sessionTypeLabel} session`;
  const body = `${sessionPart} | ${start} | ${end}\n\n${note}`;
  const objectives = (header.objectives ?? []).filter((objective) =>
    objective.text.trim(),
  );
  if (objectives.length === 0) return body;

  const lines = objectives.map(
    (objective) =>
      `- [${objective.achieved ? "x" : " "}] ${objective.text.trim()}`,
  );
  return `${body}\n\nObjectives:\n${lines.join("\n")}`;
}

export type VatcanTrainingNoteInput = {
  instructorCid: number;
  position: string;
  note: string;
  sessionType: number;
};

function vatcanNoteHeaders(token: string, contentType: string): HeadersInit {
  return {
    Authorization: `Token ${token}`,
    "Content-Type": contentType,
    Accept: "application/json",
  };
}

function vatcanNotePayload(input: VatcanTrainingNoteInput): {
  instructor_cid: number;
  position: string;
  note: string;
  session_type: number;
} {
  return {
    instructor_cid: input.instructorCid,
    position: input.position.trim().toUpperCase(),
    note: input.note,
    session_type: input.sessionType,
  };
}

function vatcanNoteJsonBody(input: VatcanTrainingNoteInput): string {
  return JSON.stringify(vatcanNotePayload(input));
}

function vatcanNoteFormBody(input: VatcanTrainingNoteInput): string {
  const payload = vatcanNotePayload(input);
  return new URLSearchParams({
    instructor_cid: String(payload.instructor_cid),
    position: payload.position,
    note: payload.note,
    session_type: String(payload.session_type),
  }).toString();
}

function vatcanNoteErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;

  const record = body as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof record.message === "string" && record.message.trim()) {
    parts.push(record.message.trim());
  }
  if (
    typeof record.error === "string" &&
    record.error.trim() &&
    record.error.trim() !== parts[0]
  ) {
    parts.push(record.error.trim());
  }

  if (record.errors && typeof record.errors === "object") {
    for (const [field, value] of Object.entries(
      record.errors as Record<string, unknown>,
    )) {
      const messages = Array.isArray(value) ? value : [value];
      for (const message of messages) {
        if (message != null && String(message).trim()) {
          parts.push(`${field}: ${String(message).trim()}`);
        }
      }
    }
  }

  return parts.length > 0 ? parts.join(" — ") : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : null;
  }
  return null;
}

function parseVatcanNoteId(body: unknown, depth = 0): number | null {
  if (body == null || depth > 6) return null;

  const direct = parseNumericId(body);
  if (direct != null) return direct;

  if (Array.isArray(body)) {
    for (const entry of body) {
      const nested = parseVatcanNoteId(entry, depth + 1);
      if (nested != null) return nested;
    }
    return null;
  }

  const record = asRecord(body);
  if (!record) return null;

  for (const key of ["id", "note_id", "noteId"]) {
    const nested = parseNumericId(record[key]);
    if (nested != null) return nested;
  }

  for (const key of ["data", "note", "notes", "result"]) {
    if (!(key in record)) continue;
    const nested = parseVatcanNoteId(record[key], depth + 1);
    if (nested != null) return nested;
  }

  return null;
}

export type VatcanNoteListEntry = {
  id: number;
  instructorCid: number | null;
  position: string | null;
  sessionType: number | null;
  trainingNote: string | null;
  createdAt: string | null;
};

function parseVatcanNoteList(body: unknown): VatcanNoteListEntry[] {
  const record = asRecord(body);
  const data = asRecord(record?.data);
  const rawNotes = Array.isArray(body)
    ? body
    : Array.isArray(record?.notes)
      ? record.notes
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(data?.notes)
          ? data.notes
          : [];

  const notes: VatcanNoteListEntry[] = [];
  for (const entry of rawNotes) {
    const item = asRecord(entry);
    if (!item) continue;
    const id = parseNumericId(item.id);
    if (id == null) continue;
    notes.push({
      id,
      instructorCid: parseNumericId(item.instructor_cid),
      position:
        typeof item.position_trained === "string"
          ? item.position_trained
          : typeof item.position === "string"
            ? item.position
            : null,
      sessionType: parseNumericId(item.session_type),
      trainingNote:
        typeof item.training_note === "string"
          ? item.training_note
          : typeof item.note === "string"
            ? item.note
            : null,
      createdAt:
        typeof item.created_at === "string"
          ? item.created_at
          : typeof item.friendly_time === "string"
            ? item.friendly_time
            : null,
    });
  }
  return notes;
}

export async function fetchVatcanUserNotes(
  token: string,
  studentCid: number,
): Promise<VatcanNoteListEntry[]> {
  const response = await fetch(`https://vatcan.ca/api/v2/user/${studentCid}/notes`, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json",
    },
  });
  const body = await readVatcanNoteResponse(response);
  if (!response.ok) {
    await throwVatcanNoteError(
      response,
      body,
      `Failed to fetch VATCAN training notes: ${response.statusText}`,
    );
  }
  return parseVatcanNoteList(body);
}

function latestMatchingVatcanNoteId(
  notes: VatcanNoteListEntry[],
  input: {
    instructor_cid: number;
    position: string;
    session_type: number;
    note: string;
  },
): number | null {
  const fieldMatches = notes.filter((note) => {
    if (note.instructorCid != null && note.instructorCid !== input.instructor_cid) {
      return false;
    }
    if (
      note.position != null &&
      note.position.trim().toUpperCase() !== input.position
    ) {
      return false;
    }
    if (note.sessionType != null && note.sessionType !== input.session_type) {
      return false;
    }
    return true;
  });

  const exactNote = fieldMatches.filter(
    (note) => note.trainingNote != null && note.trainingNote === input.note,
  );
  const matches = exactNote.length > 0 ? exactNote : fieldMatches;
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id - a.id;
  });

  return matches[0]?.id ?? null;
}

function parseVatcanNoteIdFromHeaders(headers: Headers): number | null {
  const location = headers.get("location") ?? headers.get("content-location");
  if (!location) return null;
  const match = location.match(/notes\/(\d+)\b/i);
  return match ? parseNumericId(match[1]) : null;
}

async function readVatcanNoteResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function throwVatcanNoteError(
  response: Response,
  body: unknown,
  fallback: string,
): Promise<never> {
  const message = vatcanNoteErrorMessage(body, fallback);

  if (response.status === 403) {
    throw new VatcanNoteLockedError(message);
  }

  throw new Error(message);
}

export async function createVatcanTrainingNote(
  env: Pick<Env, "VATCAN_API_TOKEN">,
  studentCid: number,
  input: VatcanTrainingNoteInput,
): Promise<{ id: number }> {
  const token = env.VATCAN_API_TOKEN;
  if (!token) {
    throw new Error("VATCAN_API_TOKEN is not configured");
  }

  const payload = vatcanNotePayload(input);
  const response = await fetch(
    `https://vatcan.ca/api/v2/user/${studentCid}/notes/create`,
    {
      method: "POST",
      headers: vatcanNoteHeaders(token, "application/x-www-form-urlencoded"),
      body: vatcanNoteFormBody(input),
    },
  );

  const body = await readVatcanNoteResponse(response);
  if (!response.ok) {
    console.error("VATCAN training note create failed", {
      status: response.status,
      body,
      studentCid,
      instructorCid: payload.instructor_cid,
      position: payload.position,
      sessionType: payload.session_type,
      noteLength: payload.note.length,
    });
    await throwVatcanNoteError(
      response,
      body,
      `Failed to create VATCAN training note: ${response.statusText} (position ${payload.position}, session_type ${payload.session_type})`,
    );
  }

  const id =
    parseVatcanNoteId(body) ??
    parseVatcanNoteIdFromHeaders(response.headers) ??
    latestMatchingVatcanNoteId(
      await fetchVatcanUserNotes(token, studentCid),
      payload,
    );
  if (id == null) {
    console.error("VATCAN training note create returned no id", {
      status: response.status,
      body,
      studentCid,
      instructorCid: payload.instructor_cid,
      position: payload.position,
      sessionType: payload.session_type,
    });
    throw new Error("VATCAN did not return a training note id");
  }

  return { id };
}

export async function updateVatcanTrainingNote(
  env: Pick<Env, "VATCAN_API_TOKEN">,
  studentCid: number,
  noteId: number,
  input: VatcanTrainingNoteInput,
): Promise<void> {
  const token = env.VATCAN_API_TOKEN;
  if (!token) {
    throw new Error("VATCAN_API_TOKEN is not configured");
  }

  const response = await fetch(
    `https://vatcan.ca/api/v2/user/${studentCid}/notes/${noteId}`,
    {
      method: "PATCH",
      headers: vatcanNoteHeaders(token, "application/json"),
      body: vatcanNoteJsonBody(input),
    },
  );

  if (!response.ok) {
    const body = await readVatcanNoteResponse(response);
    await throwVatcanNoteError(
      response,
      body,
      `Failed to update VATCAN training note: ${response.statusText}`,
    );
  }
}
