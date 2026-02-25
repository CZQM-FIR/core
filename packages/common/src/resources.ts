import type { DB } from "./db";
import type { Resource } from "@czqm/db/schema";

const CONTROLLER_CATEGORY_ORDER = [
  "Policy",
  "Software",
  "Guide",
  "Reference",
  "Letter of Agreement",
  "Other",
];

export type ResourceType = "controller" | "pilot" | "both";

export interface FetchResourcesOptions {
  /** "controller" = controller + both, "pilot" = pilot + both. For admin single type use type + publicOnly: false. */
  type: ResourceType;
  publicOnly?: boolean;
}

/**
 * Fetch resources by type. When publicOnly is true, "controller" returns controller + both, "pilot" returns pilot + both.
 * When publicOnly is false or omitted (admin), type is exact (controller, pilot, or both).
 */
export async function fetchResources(
  db: DB,
  options: FetchResourcesOptions,
): Promise<Resource[]> {
  let where: { OR?: { type: string }[]; public?: boolean; type?: string };
  if (options.publicOnly === true) {
    where =
      options.type === "controller"
        ? { OR: [{ type: "controller" }, { type: "both" }], public: true }
        : options.type === "pilot"
          ? { OR: [{ type: "pilot" }, { type: "both" }], public: true }
          : { type: "both", public: true };
  } else {
    where = { type: options.type };
  }

  const rows = await db.query.resources.findMany({
    where,
    columns: {
      id: true,
      name: true,
      description: true,
      url: true,
      category: true,
      public: true,
      type: true,
    },
  });

  return rows as Resource[];
}

/**
 * Sort controller resources by category order (Policy, Software, etc.).
 */
export function sortControllerResources<T extends { category: string }>(
  resources: T[],
): T[] {
  return [...resources].sort((a, b) => {
    const aIndex = CONTROLLER_CATEGORY_ORDER.indexOf(a.category);
    const bIndex = CONTROLLER_CATEGORY_ORDER.indexOf(b.category);
    if (aIndex !== -1 && bIndex !== -1) {
      if (aIndex !== bIndex) return aIndex - bIndex;
    } else if (aIndex !== -1) {
      return -1;
    } else if (bIndex !== -1) {
      return 1;
    }
    return 1;
  });
}

/**
 * Sort pilot resources by name.
 */
export function sortPilotResources<T extends { name: string }>(
  resources: T[],
): T[] {
  return [...resources].sort((a, b) => a.name.localeCompare(b.name));
}
