import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 1. Users Table (passwordless / magic-link)
export const softlyUsersTable = pgTable("softly_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2. Sessions Table (updated with optional user_id FK)
export const softlySessionsTable = pgTable("softly_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").references(() => softlyUsersTable.id, { onDelete: "set null" }),
  username: text("username").notNull(),
  helpPreferences: jsonb("help_preferences").$type<string[]>().default([]),
  checkInTime: text("check_in_time"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 3. Activity Log Table
export const softlyActivityLogTable = pgTable("softly_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => softlyUsersTable.id, { onDelete: "set null" }),
  sessionId: text("session_id").references(() => softlySessionsTable.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // "log_entry", "chat_message", "read_view", "move_view", "read_recommendation_requested", "move_recommendation_requested"
  status: text("status").notNull(), // "started", "completed", "abandoned"
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 4. Notification Preferences Table
export const softlyNotificationPreferencesTable = pgTable(
  "softly_notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => softlyUsersTable.id, { onDelete: "cascade" }),
    preferredTimeSlot: text("preferred_time_slot").notNull(), // e.g. "19:00-21:00"
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// 5. Magic Link Tokens Table (passwordless auth)
export const softlyMagicLinkTokensTable = pgTable("softly_magic_link_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});


export const softlyEntriesTable = pgTable(
  "softly_entries",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => softlySessionsTable.id, { onDelete: "cascade" }),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    bookName: text("book_name").notNull().default(""),
    pagesRead: integer("pages_read").notNull().default(0),
    steps: integer("steps").notNull().default(0),
    stretched: boolean("stretched").notNull().default(false),
    skincare: boolean("skincare").notNull().default(false),
    waterLiters: numeric("water_liters", {
      precision: 6,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    enjoyedMeal: boolean("enjoyed_meal").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionDateUnique: uniqueIndex("softly_entries_session_date_unique").on(
      table.sessionId,
      table.entryDate,
    ),
  }),
);

export const softlyChatMessagesTable = pgTable("softly_chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => softlySessionsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Zod schemas
export const insertSoftlyUserSchema = createInsertSchema(softlyUsersTable).omit({
  id: true,
  createdAt: true,
});
export const insertSoftlySessionSchema = createInsertSchema(softlySessionsTable).omit({
  createdAt: true,
});
export const insertSoftlyActivityLogSchema = createInsertSchema(softlyActivityLogTable).omit({
  id: true,
  createdAt: true,
});
export const insertSoftlyNotificationPreferenceSchema = createInsertSchema(
  softlyNotificationPreferencesTable,
).omit({ id: true, createdAt: true });
export const insertSoftlyMagicLinkTokenSchema = createInsertSchema(
  softlyMagicLinkTokensTable,
).omit({ id: true, createdAt: true });
export const insertSoftlyEntrySchema = createInsertSchema(softlyEntriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertSoftlyChatMessageSchema = createInsertSchema(
  softlyChatMessagesTable,
).omit({ createdAt: true });

// TypeScript types
export type InsertSoftlyUser = z.infer<typeof insertSoftlyUserSchema>;
export type SoftlyUser = typeof softlyUsersTable.$inferSelect;
export type InsertSoftlySession = z.infer<typeof insertSoftlySessionSchema>;
export type SoftlySession = typeof softlySessionsTable.$inferSelect;
export type InsertSoftlyActivityLog = z.infer<typeof insertSoftlyActivityLogSchema>;
export type SoftlyActivityLog = typeof softlyActivityLogTable.$inferSelect;
export type InsertSoftlyNotificationPreference = z.infer<
  typeof insertSoftlyNotificationPreferenceSchema
>;
export type SoftlyNotificationPreference =
  typeof softlyNotificationPreferencesTable.$inferSelect;
export type InsertSoftlyMagicLinkToken = z.infer<
  typeof insertSoftlyMagicLinkTokenSchema
>;
export type SoftlyMagicLinkToken = typeof softlyMagicLinkTokensTable.$inferSelect;
export type InsertSoftlyEntry = z.infer<typeof insertSoftlyEntrySchema>;
export type SoftlyEntry = typeof softlyEntriesTable.$inferSelect;
export type InsertSoftlyChatMessage = z.infer<typeof insertSoftlyChatMessageSchema>;
export type SoftlyChatMessage = typeof softlyChatMessagesTable.$inferSelect;