import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { expenses, incomes, budgets } from "@shared/schema";
import { db, pool } from "./db";
import { runMonthlySummaryNow, generateAndEmailSummaryForUser } from "./jobs/monthlySummary";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  // Expenses routes
  app.get(api.expenses.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const expensesList = await storage.getExpenses(req.user!.id);
    res.json(expensesList);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(req.user!.id, input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.expenses.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    try {
      const input = api.expenses.update.input.parse(req.body);
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
      if (!expense || expense.userId !== req.user!.id) {
        return res.status(404).json({ message: "Expense not found" });
      }
      const updated = await storage.updateExpense(id, req.user!.id, input);
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    
    // Check ownership
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!expense || expense.userId !== req.user!.id) {
       return res.status(404).json({ message: "Expense not found" });
    }

    await storage.deleteExpense(id, req.user!.id);
    res.sendStatus(204);
  });

  // Incomes routes
  app.get(api.incomes.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const incomesList = await storage.getIncomes(req.user!.id);
    res.json(incomesList);
  });

  app.post(api.incomes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.incomes.create.input.parse(req.body);
      const income = await storage.createIncome(req.user!.id, input);
      res.status(201).json(income);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.incomes.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    try {
      const input = api.incomes.update.input.parse(req.body);
      const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
      if (!income || income.userId !== req.user!.id) {
        return res.status(404).json({ message: "Income not found" });
      }
      const updated = await storage.updateIncome(id, req.user!.id, input);
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.incomes.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);

    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    if (!income || income.userId !== req.user!.id) {
      return res.status(404).json({ message: "Income not found" });
    }

    await storage.deleteIncome(id, req.user!.id);
    res.sendStatus(204);
  });

  // Goals routes
  app.get(api.goals.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const goal = await storage.getGoals(req.user!.id);
    if (!goal) return res.status(404).json({ message: "Goals not set" });
    res.json(goal);
  });

  app.post(api.goals.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.goals.create.input.parse(req.body);
      const existing = await storage.getGoals(req.user!.id);
      if (existing) {
        return res.status(400).json({ message: "Goals already exist" });
      }
      const goal = await storage.createGoals(req.user!.id, input);
      res.status(201).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.goals.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.goals.update.input.parse(req.body);
      const existing = await storage.getGoals(req.user!.id);
      if (!existing) {
        return res.status(404).json({ message: "Goals not set" });
      }
      const goal = await storage.updateGoals(req.user!.id, input);
      res.status(200).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Budget routes
  app.get(api.budgets.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const budgetsList = await storage.getBudgets(req.user!.id);
    res.json(budgetsList);
  });

  app.post(api.budgets.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.budgets.create.input.parse(req.body);
      const budget = await storage.createBudget(req.user!.id, input);
      res.status(201).json(budget);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.budgets.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    try {
      const input = api.budgets.update.input.parse(req.body);
      const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
      if (!budget || budget.userId !== req.user!.id) {
        return res.status(404).json({ message: "Budget not found" });
      }
      const updated = await storage.updateBudget(id, req.user!.id, input);
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.budgets.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);

    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    if (!budget || budget.userId !== req.user!.id) {
      return res.status(404).json({ message: "Budget not found" });
    }

    await storage.deleteBudget(id, req.user!.id);
    res.sendStatus(204);
  });

  app.get(api.userSettings.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(404);
    res.json({
      email: user.email,
      summaryEnabled: user.summaryEnabled,
      budgetEnabled: user.budgetEnabled || false,
    });
  });

  app.patch(api.userSettings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.userSettings.update.input.parse(req.body);
    const user = await storage.updateUserSettings(req.user!.id, input);
    res.json({
      email: user.email,
      summaryEnabled: user.summaryEnabled,
      budgetEnabled: user.budgetEnabled || false,
    });
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("select 1");
      const smtpConfigured = Boolean(
        process.env.SMTP_HOST &&
          process.env.SMTP_PORT &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASS,
      );
      res.json({
        ok: true,
        database: "ok",
        openaiKey: Boolean(process.env.OPENAI_API_KEY),
        smtpConfigured,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        database: "error",
        openaiKey: Boolean(process.env.OPENAI_API_KEY),
      });
    }
  });

  const adminEnabled = process.env.ENABLE_ADMIN_ENDPOINTS === "true";
  const adminToken = process.env.ADMIN_TOKEN;

  function requireAdmin(req: Request, res: Response): boolean {
    if (!adminEnabled) {
      res.status(404).json({ message: "Not found" });
      return false;
    }
    const tokenHeader = req.headers["x-admin-token"];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    if (!adminToken || token !== adminToken) {
      res.status(403).json({ message: "Forbidden" });
      return false;
    }
    return true;
  }

  app.post("/api/admin/summary/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await runMonthlySummaryNow();
    res.status(200).json({ message: "Summary job triggered" });
  });

  app.post("/api/admin/email/test", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const input = z
      .object({ to: z.string().email() })
      .parse(req.body);
    const user = await storage.getUserByEmail(input.to);
    if (!user) {
      return res.status(404).json({ message: "User not found for that email" });
    }
    const result = await generateAndEmailSummaryForUser(user, { forceSend: true, forceRegenerate: true });
    res.status(200).json({
      message:
        result.sent
          ? "Summary email sent"
          : `Summary email not sent: ${result.reason}`,
    });
  });

  app.post("/api/admin/summary/send-all", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const users = await storage.getAllUsers();
    const sent: { username: string; email: string }[] = [];
    const skipped: { username: string; email: string | null; reason: string }[] = [];

    for (const user of users) {
      const result = await generateAndEmailSummaryForUser(user, {
        forceSend: true,
        forceRegenerate: true,
      });

      if (result.sent) {
        sent.push({ username: user.username, email: user.email ?? "" });
      } else {
        skipped.push({
          username: user.username,
          email: user.email ?? null,
          reason: result.reason,
        });
      }
    }

    res.status(200).json({
      message: `Attempted summaries for ${users.length} users`,
      sent,
      skipped,
    });
  });

  return httpServer;
}
