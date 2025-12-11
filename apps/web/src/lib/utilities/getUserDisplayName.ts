/**
 * User display name utility
 * Following DIP: Uses shared display name logic
 */
import { getUserDisplayName as getDisplayName, type UserWithPreferences } from '@czqm/common/users';

// Re-export for backward compatibility
export const getUserDisplayName = (user: {
  name_first: string;
  name_last: string;
  name_full: string;
  cid: number;
  preferences?: { key: string; value: string }[];
}): string => {
  return getDisplayName(user as UserWithPreferences);
};
