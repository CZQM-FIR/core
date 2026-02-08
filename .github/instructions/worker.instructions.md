---
applyTo: "apps/worker/**/*.ts"
---

# Cloudflare Worker Instructions

## Worker Architecture

The worker handles scheduled cron jobs and webhook endpoints:

- Discord member sync (`*/2 * * * *` - every 2 minutes)
- VATCAN data pull (`*/15 * * * *` - every 15 minutes)
- Recurring events processing (`0 0 * * *` - daily at midnight)

## Worker Structure

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event.cron));
  },
  
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, env);
  }
} satisfies ExportedHandler<Env>;
```

## Environment Variables

Access environment variables through the `env` parameter:

```typescript
const tursoUrl = env.TURSO_URL;
const tursoToken = env.TURSO_TOKEN;
```

## Database Access

Initialize database client in each handler:

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_TOKEN
});

const db = drizzle(client);
```

## Error Handling

Always catch and log errors properly:

```typescript
try {
  await performTask();
} catch (error) {
  console.error('Task failed:', error);
  // Don't throw - let the worker continue
}
```

## Cron Job Pattern

Handle different cron schedules:

```typescript
async function handleScheduled(cron: string) {
  switch (cron) {
    case '*/2 * * * *':
      await syncDiscordMembers();
      break;
    case '*/15 * * * *':
      await pullVATCANData();
      break;
    case '0 0 * * *':
      await processRecurringEvents();
      break;
  }
}
```

## API Calls

Use fetch for external API calls:

```typescript
const response = await fetch('https://api.external.com/data', {
  headers: {
    'Authorization': `Bearer ${env.API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

if (!response.ok) {
  throw new Error(`API call failed: ${response.status}`);
}

const data = await response.json();
```

## Rate Limiting & Retries

Implement basic retry logic for external API calls:

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Webhook Handlers

Validate webhook signatures and handle requests:

```typescript
async function handleRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  
  if (url.pathname === '/webhook/discord') {
    // Validate signature
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    
    if (!isValidSignature(signature, timestamp, await request.text())) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    // Handle webhook
    return new Response('OK', { status: 200 });
  }
  
  return new Response('Not found', { status: 404 });
}
```

## Best Practices

- Keep functions pure and stateless
- Use `ctx.waitUntil()` for background tasks
- Log important events for debugging
- Handle all errors gracefully
- Don't store state in global variables
- Keep cron handlers idempotent
- Validate all external data
- Use proper TypeScript types from `worker-configuration.d.ts`
- Test locally with `pnpm dev` before deploying
- Monitor worker execution in Cloudflare dashboard

## Testing

Run worker locally:
```bash
pnpm dev  # Starts wrangler dev server
```

Test scheduled events:
```bash
curl http://localhost:8787/__scheduled?cron=*/2+*+*+*+*
```

## Deployment

Deploy to Cloudflare Workers:
```bash
pnpm deploy  # Builds and deploys worker
```
