import { users, expenses, incomes, goals, passwordResets, monthlySummaries, type User, type InsertUser, type Expense, type InsertExpense, type Income, type InsertIncome, type Goal, type InsertGoal, type PasswordReset, type MonthlySummary } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserSummaryEnabled(userId: number, summaryEnabled: boolean): Promise<User>;
  
  createExpense(userId: number, expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, userId: number, expense: InsertExpense): Promise<Expense>;
  getExpenses(userId: number): Promise<Expense[]>;
  deleteExpense(id: number, userId: number): Promise<void>;

  createIncome(userId: number, income: InsertIncome): Promise<Income>;
  updateIncome(id: number, userId: number, income: InsertIncome): Promise<Income>;
  getIncomes(userId: number): Promise<Income[]>;
  deleteIncome(id: number, userId: number): Promise<void>;

  getGoals(userId: number): Promise<Goal | undefined>;
  createGoals(userId: number, goals: InsertGoal): Promise<Goal>;
  updateGoals(userId: number, goals: InsertGoal): Promise<Goal>;

  createPasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<PasswordReset>;
  getPasswordResetByToken(tokenHash: string): Promise<PasswordReset | undefined>;
  markPasswordResetUsed(id: number): Promise<void>;

  createMonthlySummary(data: Omit<MonthlySummary, "id" | "createdAt" | "emailedAt">): Promise<MonthlySummary>;
  getMonthlySummary(userId: number, periodStart: Date, periodEnd: Date): Promise<MonthlySummary | undefined>;
  markMonthlySummaryEmailed(id: number): Promise<void>;
  updateMonthlySummary(id: number, summary: string): Promise<MonthlySummary>;

  getExpensesForRange(userId: number, start: Date, end: Date): Promise<Expense[]>;
  getIncomesForRange(userId: number, start: Date, end: Date): Promise<Income[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore = new PgSession({
    pool,
    createTableIfMissing: true,
  });

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserSummaryEnabled(userId: number, summaryEnabled: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ summaryEnabled })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createExpense(userId: number, insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values({ ...insertExpense, userId })
      .returning();
    return expense;
  }

  async updateExpense(id: number, userId: number, insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .update(expenses)
      .set({ ...insertExpense })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return expense;
  }

  async getExpenses(userId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async deleteExpense(id: number, userId: number): Promise<void> {
    await db
      .delete(expenses)
      .where(
        and(eq(expenses.id, id), eq(expenses.userId, userId))
      );
  }

  async createIncome(userId: number, insertIncome: InsertIncome): Promise<Income> {
    const [income] = await db
      .insert(incomes)
      .values({ ...insertIncome, userId })
      .returning();
    return income;
  }

  async updateIncome(id: number, userId: number, insertIncome: InsertIncome): Promise<Income> {
    const [income] = await db
      .update(incomes)
      .set({ ...insertIncome })
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning();
    return income;
  }

  async getIncomes(userId: number): Promise<Income[]> {
    return await db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, userId))
      .orderBy(desc(incomes.date));
  }

  async deleteIncome(id: number, userId: number): Promise<void> {
    await db
      .delete(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
  }

  async getGoals(userId: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.userId, userId));
    return goal;
  }

  async createGoals(userId: number, insertGoals: InsertGoal): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values({ ...insertGoals, userId })
      .returning();
    return goal;
  }

  async updateGoals(userId: number, insertGoals: InsertGoal): Promise<Goal> {
    const [goal] = await db
      .update(goals)
      .set({
        ...insertGoals,
        updatedAt: new Date(),
      })
      .where(eq(goals.userId, userId))
      .returning();
    return goal;
  }

  async createPasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<PasswordReset> {
    const [reset] = await db
      .insert(passwordResets)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return reset;
  }

  async getPasswordResetByToken(tokenHash: string): Promise<PasswordReset | undefined> {
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), isNull(passwordResets.usedAt)));
    return reset;
  }

  async markPasswordResetUsed(id: number): Promise<void> {
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, id));
  }

  async createMonthlySummary(
    data: Omit<MonthlySummary, "id" | "createdAt" | "emailedAt">,
  ): Promise<MonthlySummary> {
    const [summary] = await db
      .insert(monthlySummaries)
      .values(data)
      .returning();
    return summary;
  }

  async getMonthlySummary(userId: number, periodStart: Date, periodEnd: Date): Promise<MonthlySummary | undefined> {
    const [summary] = await db
      .select()
      .from(monthlySummaries)
      .where(
        and(
          eq(monthlySummaries.userId, userId),
          eq(monthlySummaries.periodStart, periodStart),
          eq(monthlySummaries.periodEnd, periodEnd),
        ),
      );
    return summary;
  }

  async markMonthlySummaryEmailed(id: number): Promise<void> {
    await db
      .update(monthlySummaries)
      .set({ emailedAt: new Date() })
      .where(eq(monthlySummaries.id, id));
  }

  async updateMonthlySummary(id: number, summary: string): Promise<MonthlySummary> {
    const [updated] = await db
      .update(monthlySummaries)
      .set({ summary, emailedAt: null })
      .where(eq(monthlySummaries.id, id))
      .returning();
    return updated;
  }

  async getExpensesForRange(userId: number, start: Date, end: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lte(expenses.date, end)))
      .orderBy(desc(expenses.date));
  }

  async getIncomesForRange(userId: number, start: Date, end: Date): Promise<Income[]> {
    return await db
      .select()
      .from(incomes)
      .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lte(incomes.date, end)))
      .orderBy(desc(incomes.date));
  }
}

export const storage = new DatabaseStorage();
