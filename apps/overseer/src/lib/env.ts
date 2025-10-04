import { type } from 'arktype';
import { env as dynamicPublicEnv } from '$env/dynamic/public';
import { env as dynamicPrivateEnv } from '$env/dynamic/private';
import { building } from '$app/environment';

export const Env = type({
	CLOUDFLARE_ACCOUNT_ID: 'string',
	R2_ACCESS_KEY_ID: 'string',
	R2_ACCESS_KEY: 'string',
	R2_BUCKET_NAME: 'string',
	TURSO_URL: 'string',
	TURSO_TOKEN: 'string',
	PUBLIC_WEB_URL: 'string.url'
});

let parsedEnv: typeof Env.infer | undefined;

function getEnv(): typeof Env.infer {
	if (!parsedEnv) {
		const result = Env({
			...dynamicPrivateEnv,
			...dynamicPublicEnv
		});

		if (result instanceof type.errors) {
			throw new Error(`Invalid environment variables: ${result.summary}`);
		}

		parsedEnv = result as typeof Env.infer;
	}
	return parsedEnv;
}

// Create a proxy that validates only when accessed at runtime
export default new Proxy({} as typeof Env.infer, {
	get(target, prop) {
		if (building) {
			// During build, return undefined for all properties
			return undefined;
		}
		// At runtime, validate and return the actual values
		const env = getEnv();
		return env[prop as keyof typeof env];
	}
});
