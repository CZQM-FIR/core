import { type } from "arktype";

export const Env = type({
  TURSO_URL: "string",
  TURSO_TOKEN: "string",
  PUBLIC_WEB_URL: "string.url",
  PUBLIC_OVERSEER_URL: "string.url",
  CLOUDFLARE_ACCOUNT_ID: "string",
  R2_ACCESS_KEY_ID: "string",
  R2_ACCESS_KEY: "string",
  R2_BUCKET_NAME: "string",
  WEBHOOK_ONLINE_CONTROLLERS: "string",
  WEBHOOK_UNAUTHORIZED_CONTROLLER: "string",
  DISCORD_BOT_TOKEN: "string",
  DISCORD_GUILD_ID: "string.integer",
  RECORD_SESSIONS_DELAY: "string.integer.parse",
  VATCAN_API_TOKEN: "string",
  UPTIME_PORT: "string.integer.parse?",
  NODE_ENV: '"dev"|"production"?',
  MOODLE_TOKEN: "string",
  MOODLE_URL: "string.url",
  AWS_SENDER_EMAIL: "string.email",
  AWS_ACCESS_KEY_ID: "string",
  AWS_SECRET_ACCESS_KEY: "string",
  AWS_REGION: "string",
});

export type Env = typeof Env.infer;
