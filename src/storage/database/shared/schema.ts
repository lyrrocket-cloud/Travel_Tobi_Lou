import { pgTable, serial, timestamp, varchar, integer, index, json, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 旅行规划表
export const tripPlans = pgTable(
	"trip_plans",
	{
		id: varchar("id", { length: 100 }).notNull().primaryKey(),
		wishId: varchar("wish_id", { length: 100 }).notNull(),
		destination: varchar("destination", { length: 255 }).notNull(),
		startDate: varchar("start_date", { length: 20 }),
		endDate: varchar("end_date", { length: 20 }),
		travelDays: integer("travel_days").notNull(),
		travelers: varchar("travelers", { length: 500 }).notNull(),
		days: json("days").notNull().default('[]'),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index("trip_plans_wish_id_idx").on(table.wishId),
	]
);

// 旅行记账表
export const tripExpenses = pgTable(
	"trip_expenses",
	{
		id: varchar("id", { length: 100 }).notNull().primaryKey(),
		wishId: varchar("wish_id", { length: 100 }).notNull(),
		destination: varchar("destination", { length: 255 }).notNull(),
		startDate: varchar("start_date", { length: 20 }),
		endDate: varchar("end_date", { length: 20 }),
		expenses: json("expenses").notNull().default('[]'),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index("trip_expenses_wish_id_idx").on(table.wishId),
	]
);

// 默认旅行设置表
export const defaultTrip = pgTable(
	"default_trip",
	{
		id: serial().notNull().primaryKey(),
		wishId: varchar("wish_id", { length: 100 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	}
);

export const wishes = pgTable(
	"wishes",
	{
		id: serial().notNull().primaryKey(),
		destination: varchar("destination", { length: 255 }).notNull(),
		travelYear: integer("travel_year").notNull(), // 期望出行年份
		travelMonth: varchar("travel_month", { length: 20 }).notNull(),
		wisherName: varchar("wisher_name", { length: 100 }).notNull(),
		followersCount: integer("followers_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		// 成行相关字段
		isConfirmed: integer("is_confirmed").notNull().default(0), // 0: 未成行, 1: 已成行
		confirmedDate: varchar("confirmed_date", { length: 20 }), // 具体出行日期
		travelers: varchar("travelers", { length: 500 }), // 出行人列表，逗号分隔
		isPinned: integer("is_pinned").notNull().default(0), // 0: 不置顶, 1: 置顶
		confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }), // 确认成行时间
	},
	(table) => [
		index("wishes_created_at_idx").on(table.createdAt),
		index("wishes_followers_count_idx").on(table.followersCount),
		index("wishes_is_pinned_idx").on(table.isPinned),
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
