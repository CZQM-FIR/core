import { relations, type InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './index.js';

export const tickets = sqliteTable('tickets', {
  id: int().primaryKey({ autoIncrement: true }),
  subject: text().notNull(),
  description: text().notNull(),
  authorId: int('author_id')
    .notNull()
    .references(() => users.cid, { onDelete: 'cascade' }),
  typeId: int('type_id')
    .notNull()
    .references(() => ticketType.id, { onDelete: 'cascade' }),
  status: text().notNull().default('open'),
  createdAt: int('created_at').notNull().default(new Date().getTime())
});

export const ticketRelations = relations(tickets, ({ one, many }) => ({
  type: one(ticketType, {
    fields: [tickets.typeId],
    references: [ticketType.id]
  }),
  author: one(users, {
    fields: [tickets.authorId],
    references: [users.cid]
  }),
  messages: many(ticketMessages)
}));

export type Ticket = InferSelectModel<typeof tickets>;

export const ticketMessages = sqliteTable('ticket_messages', {
  id: int().primaryKey({ autoIncrement: true }),
  ticketId: int('ticket_id')
    .notNull()
    .references(() => tickets.id),
  authorId: int('author_id')
    .notNull()
    .references(() => users.cid, { onDelete: 'cascade' }),
  message: text().notNull(),
  createdAt: int('created_at').notNull().default(new Date().getTime())
});

export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id]
  }),
  author: one(users, {
    fields: [ticketMessages.authorId],
    references: [users.cid]
  })
}));

export type TicketMessage = InferSelectModel<typeof ticketMessages>;

export const ticketType = sqliteTable('ticket_types', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull()
});

export type TicketType = InferSelectModel<typeof ticketType>;
