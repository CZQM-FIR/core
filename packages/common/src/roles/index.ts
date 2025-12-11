import {
  ROLE_PRIORITY,
  DEFAULT_ROLE,
  PRIVILEGED_ROLES,
} from "../constants/index.js";

/**
 * Flag type representing a user's flag with its details
 */
export type UserFlag = {
  flag: { name: string };
};

/**
 * Get the display role for a user based on their flags
 * Uses a priority-based system that can be extended without modifying this function
 *
 * @param flags - Array of user flags
 * @returns The highest priority role name
 */
export function getUserRole(flags: UserFlag[]): string {
  const flagNames = new Set(flags.map((f) => f.flag.name));

  for (const entry of ROLE_PRIORITY) {
    const matches = entry.requireAll
      ? entry.flags.every((flag) => flagNames.has(flag))
      : entry.flags.some((flag) => flagNames.has(flag));

    if (matches) {
      return entry.role;
    }
  }

  return DEFAULT_ROLE;
}

/**
 * Check if a user has any privileged roles (instructor, mentor, staff)
 *
 * @param flags - Array of user flags
 * @returns True if user has privileged access
 */
export function hasPrivilegedAccess(flags: UserFlag[]): boolean {
  return flags.some((f) => PRIVILEGED_ROLES.includes(f.flag.name));
}

/**
 * Check if a user has a specific flag
 *
 * @param flags - Array of user flags
 * @param flagName - The flag name to check
 * @returns True if user has the flag
 */
export function hasFlag(flags: UserFlag[], flagName: string): boolean {
  return flags.some((f) => f.flag.name === flagName);
}

/**
 * Check if user is a CZQM member (controller or visitor)
 *
 * @param flags - Array of user flags
 * @returns True if user is a CZQM member
 */
export function isCzqmMember(flags: UserFlag[]): boolean {
  return hasFlag(flags, "controller") || hasFlag(flags, "visitor");
}
