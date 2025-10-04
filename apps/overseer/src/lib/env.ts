import { type } from 'arktype';
import { env as dynamicPublicEnv } from '$env/dynamic/public';
import { env as dynamicPrivateEnv } from '$env/dynamic/private';

export const Env = type({
	CLOUDFLARE_ACCOUNT_ID: 'string',
	R2_ACCESS_KEY_ID: 'string',
	R2_ACCESS_KEY: 'string',
	R2_BUCKET_NAME: 'string',
	TURSO_URL: 'string',
	TURSO_TOKEN: 'string',
	PUBLIC_WEB_URL: 'string.url'
});

const parsedEnv = Env({
	...dynamicPrivateEnv,
	...dynamicPublicEnv
});

if (parsedEnv instanceof type.errors) {
	throw new Error(`Invalid environment variables: ${parsedEnv.summary}`);
}

export default parsedEnv as typeof Env.infer;
