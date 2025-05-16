import { relations, type InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersToFlags } from './usersToFlags.js';

export const flags = sqliteTable('flags', {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	showInSelect: int({ mode: 'boolean' }).default(true)
});

export const flagsRelations = relations(flags, ({ many }) => ({
	usersToFlags: many(usersToFlags)
}));

export type Flag = InferSelectModel<typeof flags>;
