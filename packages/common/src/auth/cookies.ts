/**
 * Cookie configuration utilities
 * Following SRP: Only handles cookie-related configuration
 */

export interface CookieConfig {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  expires?: Date;
  maxAge?: number;
  path: string;
  domain?: string;
}

/**
 * Extract the base domain for cross-subdomain cookies
 * @param hostname - Full hostname (e.g., www.czqm.ca)
 * @returns Base domain with leading dot (e.g., .czqm.ca)
 */
export function getBaseDomain(hostname: string): string {
  return "." + hostname.split(".").slice(-2).join(".");
}

/**
 * Create session cookie configuration
 * @param hostname - The current request hostname
 * @param expiresAt - Session expiration date
 * @returns Cookie configuration object
 */
export function createSessionCookieConfig(
  hostname: string,
  expiresAt: Date
): CookieConfig {
  return {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
    domain: getBaseDomain(hostname),
  };
}

/**
 * Create configuration for deleting a session cookie
 * @returns Cookie configuration for deletion
 */
export function createDeleteCookieConfig(): CookieConfig {
  return {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  };
}
