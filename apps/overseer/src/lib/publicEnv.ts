import { type } from 'arktype';
import { env as dynamicPublicEnv } from '$env/dynamic/public';

export const Env = type({
	PUBLIC_WEB_URL: 'string.url',
	PUBLIC_FILES_BASE_URL: 'string.url'
});

const parsedEnv = Env({
	...dynamicPublicEnv,
	PUBLIC_FILES_BASE_URL: dynamicPublicEnv.PUBLIC_FILES_BASE_URL ?? 'https://files.czqm.ca'
});

if (parsedEnv instanceof type.errors) {
	throw new Error(`Invalid environment variables: ${parsedEnv.summary}`);
}

export default parsedEnv as typeof Env.infer;
