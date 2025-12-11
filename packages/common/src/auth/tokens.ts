import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { SESSION_CONFIG } from "../constants/index.js";

/**
 * Session token utilities - pure functions for token generation and hashing
 * Following DIP: No database dependency, just token operations
 */

/**
 * Generate a cryptographically secure session token
 * @returns Base32-encoded random token
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Hash a session token for secure storage
 * @param token - The plain session token
 * @returns SHA256 hash of the token in hex format
 */
export function hashSessionToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

/**
 * Calculate session expiration date
 * @returns Date when session expires (30 days from now)
 */
export function calculateSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_CONFIG.DURATION_MS);
}

/**
 * Check if a session needs refresh (within 15 days of expiry)
 * @param expiresAt - Session expiration date
 * @returns True if session should be refreshed
 */
export function shouldRefreshSession(expiresAt: Date): boolean {
  return Date.now() >= expiresAt.getTime() - SESSION_CONFIG.REFRESH_WINDOW_MS;
}

/**
 * Check if a session is expired
 * @param expiresAt - Session expiration date
 * @returns True if session is expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return Date.now() >= expiresAt.getTime();
}
