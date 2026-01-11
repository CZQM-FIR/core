---
applyTo: "packages/db/**/*.ts"
---

# Database Schema Instructions

## Schema Organization

Each database table should be in its own file in `packages/db/src/schema/`:
- File name matches table name (e.g., `users.ts` for users table)
- Export table definition and relations from each file
- Re-export all schemas from `schema/index.ts`

## Table Definition Pattern

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tableName = sqliteTable('tableName', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  // other columns...
});

export type TableName = typeof tableName.$inferSelect;
export type NewTableName = typeof tableName.$inferInsert;
```

## Relations Pattern

Always define relations for foreign keys to enable query builder with `with`:

```typescript
import { relations } from 'drizzle-orm';

export const tableNameRelations = relations(tableName, ({ one, many }) => ({
  // one-to-one or many-to-one
  relatedTable: one(relatedTable, {
    fields: [tableName.relatedId],
    references: [relatedTable.id]
  }),
  // one-to-many
  childTables: many(childTable)
}));
```

## Column Types

- **IDs**: Use `integer('id').primaryKey({ autoIncrement: true })`
- **Foreign Keys**: Use `integer('foreign_id').references(() => otherTable.id)`
- **Timestamps**: Use `integer('created_at', { mode: 'timestamp' })`
- **Text**: Use `text('column_name')` (SQLite has no varchar)
- **Booleans**: Use `integer('is_active', { mode: 'boolean' })`
- **JSON**: Use `text('data', { mode: 'json' })` with type parameter

## Indexes

Add indexes for:
- Foreign keys used in joins
- Columns frequently used in WHERE clauses
- Composite indexes for multi-column queries

```typescript
export const tableName = sqliteTable('tableName', {
  // columns...
}, (table) => ({
  foreignKeyIdx: index('foreign_key_idx').on(table.foreignKey),
  compositeIdx: index('composite_idx').on(table.col1, table.col2)
}));
```

## Migration Workflow

1. Make schema changes in appropriate file
2. Run `pnpm db:generate` to create migration files
3. Review generated SQL in `packages/db/migrations/`
4. Run `pnpm db:migrate` to apply migrations
5. Commit both schema changes and migration files

## Type Safety

- Always export inferred types: `export type TableName = typeof tableName.$inferSelect`
- Use these types throughout the application
- Import as: `import { type User, users } from '@czqm/db/schema'`

## Best Practices

- Use descriptive column names (e.g., `created_at` not `ts`)
- Add NOT NULL constraints where appropriate
- Use default values for timestamps and booleans
- Document complex schemas with comments
- Keep related tables' foreign keys consistent
- Use camelCase for table names (SQLite convention in this project)
