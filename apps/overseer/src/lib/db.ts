import { drizzle } from 'drizzle-orm/libsql';
import { relations } from '@czqm/db/relations';
import { building } from '$app/environment';
import env from '$lib/env';

function createDb() {
	if (building) {
		// Return undefined during build time to avoid connection attempts
		return undefined;
	}

	return drizzle({
		connection: {
			url: env.TURSO_URL,
			authToken: env.TURSO_TOKEN
		},
		relations
	});
}

const _db = createDb();

export const db = _db!;
