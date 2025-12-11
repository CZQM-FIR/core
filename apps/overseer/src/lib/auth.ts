/**
 * Authentication module
 * Following DIP: Uses shared utilities for token operations
 * Following SRP: Only handles session management for this app
 */
import { authSessions, users, type AuthSession, type User } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/db';
import {
	generateSessionToken as generateToken,
	hashSessionToken,
	calculateSessionExpiry,
	shouldRefreshSession,
	isSessionExpired,
	createSessionCookieConfig,
	createDeleteCookieConfig
} from '@czqm/common/auth';

// Re-export for backward compatibility
export const generateSessionToken = generateToken;

export async function createSession(token: string, userId: number): Promise<AuthSession> {
	const sessionId = hashSessionToken(token);
	const session: AuthSession = {
		id: sessionId,
		userId,
		expiresAt: calculateSessionExpiry()
	};
	await db.insert(authSessions).values(session);
	return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = hashSessionToken(token);
	const result = await db
		.select({ user: users, session: authSessions })
		.from(authSessions)
		.innerJoin(users, eq(authSessions.userId, users.cid))
		.where(eq(authSessions.id, sessionId));

	if (result.length < 1) {
		return { session: null, user: null };
	}

	const { user, session } = result[0];

	if (isSessionExpired(session.expiresAt)) {
		await db.delete(authSessions).where(eq(authSessions.id, session.id));
		return { session: null, user: null };
	}

	if (shouldRefreshSession(session.expiresAt)) {
		session.expiresAt = calculateSessionExpiry();
		await db
			.update(authSessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(authSessions.id, session.id));
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(authSessions).where(eq(authSessions.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	const config = createSessionCookieConfig(event.url.hostname, expiresAt);
	event.cookies.set('session', token, config);
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	const config = createDeleteCookieConfig();
	event.cookies.set('session', '', config);
}

export function auth(event: RequestEvent): Promise<SessionValidationResult> {
	const token = event.cookies.get('session');
	if (!token) {
		return Promise.resolve({ session: null, user: null });
	}
	return validateSessionToken(token);
}

export type SessionValidationResult =
	| { session: AuthSession; user: User }
	| { session: null; user: null };
