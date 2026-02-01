import { pgTable, text, serial, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // This will store the passcode
  summaryEnabled: boolean("summary_enabled").notNull().default(true),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // Type of expense
  location: text("location").notNull(),
  date: timestamp("date").notNull(),
  remark: text("remark"),
  taxReducible: boolean("tax_reducible").notNull().default(false),
});

export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  source: text("source").notNull(),
  date: timestamp("date").notNull(),
  remark: text("remark"),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  mainGoal: text("main_goal").notNull(),
  successType: text("success_type").notNull(),
  successAmount: numeric("success_amount", { precision: 12, scale: 2 }),
  successCategory: text("success_category"),
  incomeMonthly: numeric("income_monthly", { precision: 12, scale: 2 }),
  priorityCategories: text("priority_categories").array().notNull(),
  strictness: text("strictness").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const monthlySummaries = pgTable("monthly_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  emailedAt: timestamp("emailed_at"),
});

export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  goals: many(goals),
  incomes: many(incomes),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export const monthlySummariesRelations = relations(monthlySummaries, ({ one }) => ({
  user: one(users, {
    fields: [monthlySummaries.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .omit({ summaryEnabled: true })
  .extend({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
});
export const userPublicSchema = createSelectSchema(users).omit({ password: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  userId: true 
}).extend({
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  taxReducible: z.coerce.boolean().optional().default(false),
});

export const insertIncomeSchema = createInsertSchema(incomes).omit({
  id: true,
  userId: true,
}).extend({
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
});

export const goalMainGoalEnum = z.enum([
  "save_specific",
  "reduce_spending",
  "control_category",
  "maintain",
  "pay_down_debt",
]);

export const goalSuccessTypeEnum = z.enum([
  "monthly_saving",
  "max_spend",
  "category_cap",
  "percent_income",
  "none",
]);

export const goalStrictnessEnum = z.enum([
  "strict",
  "balanced",
  "flexible",
]);

export const insertGoalSchema = z
  .object({
    mainGoal: goalMainGoalEnum,
    successType: goalSuccessTypeEnum,
    successAmount: z.coerce.number().positive().optional().nullable(),
    successCategory: z.string().optional().nullable(),
    incomeMonthly: z.coerce.number().positive().optional().nullable(),
    priorityCategories: z.array(z.string()).min(1),
    strictness: goalStrictnessEnum,
  })
  .refine(
    (data) =>
      data.successType === "none" ||
      data.successAmount !== undefined && data.successAmount !== null,
    {
      message: "Please provide a target amount.",
      path: ["successAmount"],
    },
  )
  .refine(
    (data) =>
      data.successType !== "category_cap" ||
      (data.successCategory && data.successCategory.length > 0),
    {
      message: "Please choose a category cap.",
      path: ["successCategory"],
    },
  )
  .refine(
    (data) =>
      (data.successType !== "percent_income" && data.successType !== "monthly_saving") ||
      (data.incomeMonthly !== undefined && data.incomeMonthly !== null),
    {
      message: "Please provide your monthly income.",
      path: ["incomeMonthly"],
    },
  );

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PublicUser = z.infer<typeof userPublicSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type MonthlySummary = typeof monthlySummaries.$inferSelect;
