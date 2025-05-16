import { relations, type InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { positions, users } from './index.js';

export const roster = sqliteTable('roster', {
	id: int().primaryKey({ autoIncrement: true }),
	controllerId: int('controller_id')
		.notNull()
		.references(() => users.cid, { onDelete: 'cascade' }),
	position: text('position').notNull(),
	status: int('status').notNull()
});

export const rosterRelations = relations(roster, ({ one, many }) => ({
	controller: one(users, {
		fields: [roster.controllerId],
		references: [users.cid]
	})
}));

export type RosterStatus = InferSelectModel<typeof roster>;

export type RosterPosition = 'gnd' | 'twr' | 'app' | 'ctr';

export type RosterUserData = {
	cid: number;
	name_first: string;
	name_last: string;
	name_full: string;
	email: string;
	ratingID: number;
	division: string | null;
	region: string | null;
	subdivision: string | null;
	bio: string | null;
	rating: {
		id: number;
		long: string;
		short: string;
	};
	soloEndorsements: {
		id: number;
		positionId: number | null;
		expiresAt: Date;
		position: {
			id: number;
			name: string;
			callsign: string;
			frequency: string;
		};
	}[];
	roster: {
		id: number;
		status: number;
		position: RosterPosition | string; // remove string
		controllerId: number;
	}[];
};
