import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@czqm/db/schema';
import { building } from '$app/environment';
import env from '$lib/env';
import { relations } from '@czqm/db/relations';

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDb() {
	if (building) {
		// Return a mock during build time to avoid connection attempts
		return {} as ReturnType<typeof drizzle<typeof schema>>;
	}

	if (!_db) {
		_db = drizzle({
			connection: {
				url: env.TURSO_URL,
				authToken: env.TURSO_TOKEN
			},
			relations
		});
	}

	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(target, prop) {
		const database = getDb();
		const value = database[prop as keyof typeof database];
		// Bind methods to the database instance
		return typeof value === 'function' ? value.bind(database) : value;
	}
});
