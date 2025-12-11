/**
 * Session Authorization Validator
 * Following SRP: Only handles session authorization logic
 * Following OCP: Authorization rules are data-driven
 */

import { Position } from '@czqm/db/schema';
import { CZQM_POSITION_PREFIXES } from '@czqm/common/constants';
import type { UnauthorizedReason } from '@czqm/common/notifications';

export interface SessionContext {
  cid: number;
  callsign: string;
  rating: number;
  logonTime: Date;
}

export interface UserAuthContext {
  cid: number;
  active: boolean;
  hasDiscordLinked: boolean;
  rosterAuthorization: RosterStatus;
}

export type RosterStatus = 'authorized' | 'not-found' | 'unauthorized';

export interface AuthorizationResult {
  authorized: boolean;
  reason?: UnauthorizedReason;
}

/**
 * Check if a callsign belongs to a CZQM position
 */
export function isCzqmPosition(callsign: string): boolean {
  const upperCallsign = callsign.toUpperCase();
  return CZQM_POSITION_PREFIXES.some((prefix) => upperCallsign.startsWith(prefix));
}

/**
 * Check if a callsign is an observer or supervisor position
 */
export function isObserverOrSupervisor(callsign: string): boolean {
  return callsign.includes('OBS') || callsign.includes('SUP');
}

/**
 * Validate a session for authorization
 * @param session - The session context with CID, callsign, rating, and logon time
 * @param user - The user's authorization context, or null if user not found
 * @param position - The position being controlled
 * @returns AuthorizationResult with authorized boolean and optional reason if unauthorized
 */
export function validateSessionAuthorization(
  session: SessionContext,
  user: UserAuthContext | null,
  position: Position
): AuthorizationResult {
  // Unknown user connecting to CZQM position
  if (!user) {
    return { authorized: false, reason: 'nonczqm' };
  }

  // Suspended on VATSIM (rating 0 = SUS)
  if (session.rating === 0) {
    return { authorized: false, reason: 'suspended' };
  }

  // User marked as inactive
  if (!user.active) {
    return { authorized: false, reason: 'inactive' };
  }

  // No Discord account linked
  if (!user.hasDiscordLinked) {
    return { authorized: false, reason: 'discord' };
  }

  // Check roster authorization (skip for OBS positions)
  const positionType = position.callsign.split('_').pop()?.toLowerCase();
  if (positionType !== 'obs' && user.rosterAuthorization !== 'authorized') {
    return { authorized: false, reason: 'roster' };
  }

  return { authorized: true };
}

/**
 * Get roster status for a user on a position
 */
export function getRosterStatus(
  rosterEntries: Array<{ position: string; status: number }>,
  positionCallsign: string
): RosterStatus {
  const positionType = positionCallsign.split('_').pop()?.toLowerCase();
  const entry = rosterEntries.find((r) => r.position === positionType);

  if (!entry) {
    return 'not-found';
  }

  return entry.status === -1 ? 'unauthorized' : 'authorized';
}
