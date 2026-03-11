import { pgTable, serial, timestamp, varchar, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const wishes = pgTable(
	"wishes",
	{
		id: serial().notNull().primaryKey(),
		destination: varchar("destination", { length: 255 }).notNull(),
		travelMonth: varchar("travel_month", { length: 20 }).notNull(),
		wisherName: varchar("wisher_name", { length: 100 }).notNull(),
		followersCount: integer("followers_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index("wishes_created_at_idx").on(table.createdAt),
		index("wishes_followers_count_idx").on(table.followersCount),
	]
);

export const wishFollowers = pgTable(
	"wish_followers",
	{
		id: serial().notNull().primaryKey(),
		wishId: integer("wish_id").notNull(),
		followerName: varchar("follower_name", { length: 100 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index("wish_followers_wish_id_idx").on(table.wishId),
	]
);
