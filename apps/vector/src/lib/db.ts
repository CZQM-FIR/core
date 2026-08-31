import { building } from '$app/environment';
import { drizzle } from 'drizzle-orm/libsql';
import { relations } from '@czqm/db/relations';
import env from '$lib/env';

function createDb() {
	if (building) {
		return undefined;
	}

	return drizzle({
		relations,
		connection: {
			url: env.TURSO_URL,
			authToken: env.TURSO_TOKEN
		}
	});
}

const _db = createDb();

export const db = _db!;
