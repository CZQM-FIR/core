---
applyTo: "apps/{web,overseer,vector}/**/*.{ts,svelte}"
---

# SvelteKit Frontend Application Instructions

## Route File Structure

SvelteKit uses file-based routing with specific file naming conventions:

### Server-Side Files
- `+page.server.ts` - Page data loading, form actions
- `+layout.server.ts` - Layout data (shared across child routes)
- `+server.ts` - API endpoints (GET, POST, etc.)

### Client-Side Files
- `+page.svelte` - Page component
- `+layout.svelte` - Layout component (wraps child routes)
- `+error.svelte` - Error boundary

## Data Loading Pattern

Always use `satisfies` for type safety:

```typescript
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
  // Check authentication if required
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  // Fetch data
  const data = await db.query.table.findFirst({
    where: eq(table.id, params.id)
  });

  return { data };
}) satisfies PageServerLoad;
```

## Component Props with Svelte 5

Use the `$props()` rune with TypeScript:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();
</script>
```

## Svelte 5 Runes

- `$state()` - Reactive state
- `$derived()` - Computed values
- `$effect()` - Side effects
- `$props()` - Component props
- `$bindable()` - Two-way binding

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

## Authentication Pattern

Check authentication in server load functions:

```typescript
export const load = (async ({ locals }) => {
  // locals.user is populated by hooks.server.ts
  if (!locals.user) {
    throw redirect(302, '/login');
  }
  
  return { user: locals.user };
}) satisfies PageServerLoad;
```

## Form Actions

Use SvelteKit's form actions for mutations:

```typescript
import type { Actions } from './$types';

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name');
    
    // Validate input
    if (!name || typeof name !== 'string') {
      return { success: false, message: 'Name is required' };
    }
    
    // Perform action
    await db.insert(table).values({ name });
    
    return { success: true };
  }
} satisfies Actions;
```

## DaisyUI Components

Use DaisyUI classes for consistent styling:

- **Buttons**: `btn btn-primary`, `btn btn-secondary`
- **Cards**: `card card-body`
- **Forms**: `form-control`, `label`, `input input-bordered`
- **Alerts**: `alert alert-info`, `alert alert-error`
- **Modals**: `modal`, `modal-box`

```svelte
<div class="card bg-base-200">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    <p>Content</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

## TailwindCSS Guidelines

- Use DaisyUI semantic classes first
- Use Tailwind utilities for spacing and layout
- Follow mobile-first responsive design
- Use Tailwind's spacing scale (e.g., `p-4`, `m-2`)

## Component Organization

- Store reusable components in `src/lib/components/`
- Keep route-specific components in the route directory
- Export shared components from `src/lib/index.ts` if needed

## Type Imports

Always import generated types from `./$types`:

```typescript
import type { PageData, PageServerLoad, Actions } from './$types';
```

## Error Handling in Components

```svelte
{#if data.error}
  <div class="alert alert-error">
    <span>{data.error}</span>
  </div>
{/if}
```

## Best Practices

- Keep components focused and small
- Use server-side rendering by default
- Only use client-side state when necessary
- Leverage SvelteKit's progressive enhancement
- Use `+page.server.ts` for data fetching, not in components
- Validate forms on both client and server side
- Use proper semantic HTML
- Ensure accessibility (ARIA labels, keyboard navigation)
