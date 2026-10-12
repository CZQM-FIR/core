import "@czqm/common/arktype-config";
import { type } from "arktype";
import { env as dynamicPublicEnv } from "$env/dynamic/public";
import { env as dynamicPrivateEnv } from "$env/dynamic/private";
import { building } from "$app/environment";

export const Env = type({
  TURSO_URL: "string",
  TURSO_TOKEN: "string",
  VATSIM_BOOKINGS_API_TOKEN: "string",
  PUBLIC_WEB_URL: "string.url",
  PUBLIC_OVERSEER_URL: "string.url",
  PUBLIC_VECTOR_URL: "string.url",
});

let parsedEnv: typeof Env.infer | undefined;

function getEnv(): typeof Env.infer {
  if (!parsedEnv) {
    const result = Env({
      ...dynamicPrivateEnv,
      ...dynamicPublicEnv,
    });

    if (result instanceof type.errors) {
      throw new Error(`Invalid environment variables: ${result.summary}`);
    }

    parsedEnv = result as typeof Env.infer;
  }
  return parsedEnv;
}

export default new Proxy({} as typeof Env.infer, {
  get(_target, prop) {
    if (building) {
      return undefined;
    }
    const env = getEnv();
    return env[prop as keyof typeof env];
  },
});
