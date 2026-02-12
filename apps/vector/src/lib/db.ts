import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@czqm/db/schema';
import { building } from '$app/environment';
import env from '$lib/env';
import { relations } from '@czqm/db/relations';

const createDbClient = () =>
	drizzle<typeof schema, typeof relations>({
		connection: {
			url: env.TURSO_URL,
			authToken: env.TURSO_TOKEN
		},
		schema,
		relations
	});

type Db = ReturnType<typeof createDbClient>;

let _db: Db | undefined;

function getDb() {
	if (building) {
		// Return a mock during build time to avoid connection attempts
		return {} as Db;
	}

	if (!_db) {
		_db = createDbClient();
	}

	return _db;
}

export const db = new Proxy({} as Db, {
	get(target, prop) {
		const database = getDb();
		const value = database[prop as keyof typeof database];
		// Bind methods to the database instance
		return typeof value === 'function' ? value.bind(database) : value;
	}
});
