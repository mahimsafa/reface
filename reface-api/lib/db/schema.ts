import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

// Process/upload tracking similar to Python FastAPI app's ProcessRecord
import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const processStatusEnum = pgEnum("process_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const processRecords = pgTable("process_records", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sourceImage: varchar('source_image', { length: 1024 }).notNull(),
  targetImage: varchar('target_image', { length: 1024 }).notNull(),
  resultImage: varchar('result_image', { length: 1024 }),
  status: processStatusEnum().notNull().default("pending"),
  outputPrefix: varchar('output_prefix', { length: 255 }).notNull().default("result"),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
  processStartedAt: timestamp('process_started_at', { withTimezone: false }),
  processEndedAt: timestamp('process_ended_at', { withTimezone: false }),
});
