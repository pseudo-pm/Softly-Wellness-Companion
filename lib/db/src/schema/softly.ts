import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const softlySessionsTable = pgTable("softly_sessions", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
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

export const insertSoftlySessionSchema = createInsertSchema(
  softlySessionsTable,
).omit({ createdAt: true });
export const insertSoftlyEntrySchema = createInsertSchema(
  softlyEntriesTable,
).omit({ id: true, createdAt: true });

export type InsertSoftlySession = z.infer<typeof insertSoftlySessionSchema>;
export type SoftlySession = typeof softlySessionsTable.$inferSelect;
export type InsertSoftlyEntry = z.infer<typeof insertSoftlyEntrySchema>;
export type SoftlyEntry = typeof softlyEntriesTable.$inferSelect;