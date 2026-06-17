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
