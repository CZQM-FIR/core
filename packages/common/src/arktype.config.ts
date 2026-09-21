import { configure } from 'arktype/config';

// Cloudflare Workers/Pages disallow `new Function` (arktype's JIT validator path).
// Configure before any `arktype` import so scopes resolve with jitless validation.
configure({ jitless: true });
