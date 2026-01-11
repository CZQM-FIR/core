---
applyTo: "apps/{web,overseer,vector}/src/lib/utilities/**/*.ts"
---

# Utility Function Instructions

## Purpose

Utility functions encapsulate reusable data fetching and business logic:
- Database queries
- Data transformations
- Common validation logic
- Helper functions

## Function Structure

Keep utilities focused and single-purpose:

```typescript
import { db } from '$lib/db';
import { users, type User } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get a user by their CID
 * @param cid - Controller ID
 * @returns User object or null if not found
 */
export async function getUser(cid: number): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.cid, cid)
  });
  
  return user ?? null;
}
```

## Naming Conventions

- Use descriptive verb-noun names: `getUser`, `createSession`, `validateToken`
- Prefix boolean checks with `is`, `has`, `can`: `isAdmin`, `hasPermission`
- Prefix async functions appropriately: `fetchUserData`, `loadEvents`

## Type Safety

Always type parameters and return values:

```typescript
export async function getUserDisplayName(
  cid: number | undefined
): Promise<string> {
  if (!cid) return 'Unknown';
  
  const user = await getUser(cid);
  return user?.name ?? 'Unknown User';
}
```

## Error Handling

Handle errors gracefully and return sensible defaults:

```typescript
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId)
    });
    return event ?? null;
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}
```

## Database Queries

Use DrizzleORM's query builder with relations:

```typescript
export async function getUserWithPreferences(cid: number) {
  return await db.query.users.findFirst({
    where: eq(users.cid, cid),
    with: {
      preferences: true,
      sessions: {
        limit: 10,
        orderBy: (sessions, { desc }) => [desc(sessions.startTime)]
      }
    }
  });
}
```

## Caching Considerations

For frequently accessed data, consider caching:

```typescript
// Note: Be cautious with caching in serverless environments
const cache = new Map<string, { data: any; timestamp: number }>();

export async function getCachedData(key: string) {
  const cached = cache.get(key);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < 60000) { // 1 minute cache
    return cached.data;
  }
  
  const data = await fetchData();
  cache.set(key, { data, timestamp: now });
  return data;
}
```

## Export Pattern

Export utilities from index file for easier imports:

```typescript
// utilities/index.ts
export { getUser } from './getUser';
export { getUserDisplayName } from './getUserDisplayName';
export { getEvent } from './getEvent';
```

## Best Practices

- Keep functions pure when possible
- Avoid side effects in utility functions
- Document complex logic with JSDoc comments
- Use consistent error handling patterns
- Return null instead of throwing for "not found" cases
- Throw errors for unexpected failures
- Test utilities with different inputs mentally
- Keep dependencies minimal
- Use TypeScript for full type safety
- Export utility types when relevant

## Anti-Patterns to Avoid

- Don't mix data fetching with UI logic
- Don't store mutable state in utility modules
- Don't perform authentication checks here (do in route handlers)
- Don't catch errors silently without logging
- Don't use `any` types
