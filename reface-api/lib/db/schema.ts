import { integer, pgTable, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  provider: varchar({ length: 255 }).notNull(),
  providerId: varchar({ length: 255 }).notNull(),
  avatar: varchar({ length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
});

export const userWalletTable = pgTable("user_wallet", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => usersTable.id).notNull(),
  freeCredits: integer().notNull().default(0),
  paidCredits: integer().notNull().default(0),
  redeemedCredits: integer().notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
});

export const userCreditWalletRelation = relations(usersTable, ({ one }) => ({
	wallet: one(userWalletTable),
}));


export const creditTypesEnum = pgEnum("credit_type", [
  "free",
  "paid",
  "redeemed",
]);

export const creditHistoryTable = pgTable("credit_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => usersTable.id).notNull(),
  creditType: creditTypesEnum().notNull(),
  credits: integer().notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
});

export const creditHistoryRelation = relations(creditHistoryTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [creditHistoryTable.userId],
    references: [usersTable.id],
  }),
}));

// Process/upload tracking similar to Python FastAPI app's ProcessRecord
export const processStatusEnum = pgEnum("process_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const processRecords = pgTable("process_records", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => usersTable.id),
  sourceImage: varchar('source_image', { length: 1024 }).notNull(),
  targetImage: varchar('target_image', { length: 1024 }).notNull(),
  sourceIndex: integer('source_index').notNull().default(0),
  targetIndex: integer('target_index').notNull().default(0),
  resultImage: varchar('result_image', { length: 1024 }),
  status: processStatusEnum().notNull().default("pending"),
  outputPrefix: varchar('output_prefix', { length: 255 }).notNull().default("result"),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
  processStartedAt: timestamp('process_started_at', { withTimezone: false }),
  processEndedAt: timestamp('process_ended_at', { withTimezone: false }),
});

export const processRecordsRelation = relations(processRecords, ({ one }) => ({
  user: one(usersTable, {
    fields: [processRecords.userId],
    references: [usersTable.id],
  }),
}));

