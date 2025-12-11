/**
 * Environment configuration interfaces
 * Following ISP: Each job type only depends on the config it needs
 */

// Base config shared by all jobs
export interface BaseConfig {
  TURSO_URL: string;
  TURSO_TOKEN: string;
  NODE_ENV?: 'dev' | 'production';
}

// Config for online ATC monitoring
export interface OnlineATCConfig extends BaseConfig {
  WEBHOOK_ONLINE_CONTROLLERS: string;
  WEBHOOK_UNAUTHORIZED_CONTROLLER: string;
}

// Config for Discord sync
export interface DiscordSyncConfig extends BaseConfig {
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
}

// Config for VATCAN sync
export interface VatcanConfig extends BaseConfig {
  VATCAN_API_TOKEN: string;
}

// Config for session recording
export interface RecordSessionsConfig extends BaseConfig {
  R2_ACCESS_KEY_ID: string;
  R2_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  RECORD_SESSIONS_DELAY: number;
}

// Config for Moodle sync
export interface MoodleConfig extends BaseConfig {
  MOODLE_TOKEN: string;
  MOODLE_URL: string;
}

// Full environment config (union of all)
export interface FullEnvConfig
  extends OnlineATCConfig,
    DiscordSyncConfig,
    VatcanConfig,
    RecordSessionsConfig,
    MoodleConfig {
  PUBLIC_WEB_URL: string;
  PUBLIC_OVERSEER_URL: string;
  UPTIME_PORT?: number;
}

/**
 * Extract specific config from full environment
 */
export function extractOnlineATCConfig(env: FullEnvConfig): OnlineATCConfig {
  return {
    TURSO_URL: env.TURSO_URL,
    TURSO_TOKEN: env.TURSO_TOKEN,
    NODE_ENV: env.NODE_ENV,
    WEBHOOK_ONLINE_CONTROLLERS: env.WEBHOOK_ONLINE_CONTROLLERS,
    WEBHOOK_UNAUTHORIZED_CONTROLLER: env.WEBHOOK_UNAUTHORIZED_CONTROLLER
  };
}

export function extractDiscordConfig(env: FullEnvConfig): DiscordSyncConfig {
  return {
    TURSO_URL: env.TURSO_URL,
    TURSO_TOKEN: env.TURSO_TOKEN,
    NODE_ENV: env.NODE_ENV,
    DISCORD_BOT_TOKEN: env.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID: env.DISCORD_GUILD_ID
  };
}

export function extractVatcanConfig(env: FullEnvConfig): VatcanConfig {
  return {
    TURSO_URL: env.TURSO_URL,
    TURSO_TOKEN: env.TURSO_TOKEN,
    NODE_ENV: env.NODE_ENV,
    VATCAN_API_TOKEN: env.VATCAN_API_TOKEN
  };
}

export function extractMoodleConfig(env: FullEnvConfig): MoodleConfig {
  return {
    TURSO_URL: env.TURSO_URL,
    TURSO_TOKEN: env.TURSO_TOKEN,
    NODE_ENV: env.NODE_ENV,
    MOODLE_TOKEN: env.MOODLE_TOKEN,
    MOODLE_URL: env.MOODLE_URL
  };
}

export function extractRecordSessionsConfig(env: FullEnvConfig): RecordSessionsConfig {
  return {
    TURSO_URL: env.TURSO_URL,
    TURSO_TOKEN: env.TURSO_TOKEN,
    NODE_ENV: env.NODE_ENV,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_ACCESS_KEY: env.R2_ACCESS_KEY,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
    RECORD_SESSIONS_DELAY: env.RECORD_SESSIONS_DELAY
  };
}
