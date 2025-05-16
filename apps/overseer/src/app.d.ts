// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import * as schema from '@czqm/db/schema';

declare global {
	namespace App {
		interface Platform {
			env: {
				bucket: R2Bucket;
			};
		}
		interface Locals {
			user: schema.User | null;
			session: schema.AuthSession | null;
			bucket: R2Bucket;
		}
	}
}

export {};
