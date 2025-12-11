import { hasPrivilegedAccess, type UserFlag } from "../roles/index.js";

/**
 * User query options for different access levels
 * Following OCP: Options can be extended without modifying query logic
 */
export interface UserQueryOptions {
  /** Include email in results (requires privileged access) */
  includeEmail: boolean;
  /** Include rating relation */
  includeRating: boolean;
  /** Include sessions relation */
  includeSessions: boolean;
  /** Include flags relation */
  includeFlags: boolean;
}

/**
 * Default query options for non-privileged users
 */
export const DEFAULT_USER_QUERY_OPTIONS: UserQueryOptions = {
  includeEmail: false,
  includeRating: true,
  includeSessions: true,
  includeFlags: true,
};

/**
 * Query options for privileged users (includes email)
 */
export const PRIVILEGED_USER_QUERY_OPTIONS: UserQueryOptions = {
  includeEmail: true,
  includeRating: true,
  includeSessions: true,
  includeFlags: true,
};

/**
 * Get appropriate query options based on user's access level
 * @param subjectFlags - Flags of the user making the request
 * @returns Query options appropriate for the user's access level
 */
export function getQueryOptionsForUser(
  subjectFlags: UserFlag[] | null
): UserQueryOptions {
  if (subjectFlags && hasPrivilegedAccess(subjectFlags)) {
    return PRIVILEGED_USER_QUERY_OPTIONS;
  }
  return DEFAULT_USER_QUERY_OPTIONS;
}

/**
 * Display name preference values
 */
export type DisplayNamePreference = "full" | "initial" | "cid";

/**
 * User preferences stored as key-value pairs
 */
export interface UserPreference {
  key: string;
  value: string;
}

export interface UserWithPreferences {
  name_first: string;
  name_last?: string;
  name_full: string;
  cid: number;
  preferences?: UserPreference[] | null;
}

/**
 * Get the display name for a user based on their preferences
 * Supports both array-based preferences and object-based preferences
 * @param user - User with optional preferences
 * @returns The appropriate display name
 */
export function getUserDisplayName(user: UserWithPreferences): string {
  const prefs = user.preferences;

  if (!prefs || !Array.isArray(prefs)) {
    return user.name_full;
  }

  const namePreference = prefs.find((p) => p.key === "displayName")?.value as
    | DisplayNamePreference
    | undefined;

  switch (namePreference) {
    case "cid":
      return user.cid.toString();
    case "initial": {
      const lastInitial = user.name_last?.[0]?.toUpperCase();
      // Fall back to full name if no last name available for initial
      if (!lastInitial) {
        return user.name_full;
      }
      return `${user.name_first} ${lastInitial}`;
    }
    case "full":
    default:
      return user.name_full;
  }
}
