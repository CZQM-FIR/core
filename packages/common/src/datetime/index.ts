/**
 * Date/time formatting utilities
 * Following SRP: Only handles date/time formatting
 */

/**
 * Format UTC time as HH:MMz with zero-padded hours and minutes
 * @param date - The date to format
 * @returns Formatted string like "14:05z"
 */
export function formatUtcTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}z`;
}

/**
 * Get Unix timestamp in seconds from a Date
 * @param date - The date to convert
 * @returns Unix timestamp in seconds
 */
export function getUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Format a Discord relative timestamp
 * @param date - The date to format
 * @returns Discord timestamp string like "<t:1234567890:R>"
 */
export function formatDiscordRelativeTime(date: Date): string {
  return `<t:${getUnixTimestamp(date)}:R>`;
}
