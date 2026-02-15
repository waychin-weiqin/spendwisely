import cron from "node-cron";
import { DateTime } from "luxon";
import { storage } from "../storage";
import { generateMonthlySummary } from "../ai";
import { sendEmail } from "../email";
import type { Expense, Goal, Income, User, Budget } from "@shared/schema";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const TZ = "Australia/Melbourne";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCategoryTotals(expenses: Expense[]) {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    const current = totals.get(expense.category) || 0;
    totals.set(expense.category, current + Number(expense.amount));
  });
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function calculateBudgetStatus(budget: Budget, expenses: Expense[], periodStart: Date, periodEnd: Date) {
  const spent = expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expense.category === budget.category &&
        expenseDate >= periodStart &&
        expenseDate <= periodEnd
      );
    })
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const budgetAmount = Number(budget.amount);
  const remaining = budgetAmount - spent;
  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  let status: "safe" | "warning" | "danger";
  if (percentage >= 100) {
    status = "danger";
  } else if (percentage >= 80) {
    status = "warning";
  } else {
    status = "safe";
  }

  return {
    category: budget.category,
    period: budget.period,
    budgetAmount,
    spent,
    remaining,
    percentage,
    status,
  };
}

const chartWidth = 1400;
const chartHeight = 800;
const chartCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: "white" });

const SUMMARY_PROMPT_INSTRUCTIONS = `
Using the data below, write a concise monthly spending summary.

Output format (use these exact labels, each on its own line):
Headline: <one short sentence>
TL;DR: <one sentence>
Summary: <2-3 sentences>
Biggest win: <one sentence>
Watchlist: <one sentence, or "None this month">
Optional next step: <one sentence, phrased as optional>

Requirements:
- Mention the biggest positive trend
- Mention the biggest concern (if any)
- Reference at least 3 concrete numbers
- Maintain a supportive and neutral tone
- If budgets are enabled and set, comment on budget adherence

Based on the user's spending data, budgets (if enabled), and stated goal:
- Assess whether the user is on track
- Highlight any budget concerns (categories approaching or exceeding limits)
- Identify ONE high-impact adjustment
- Phrase the suggestion as optional, not mandatory

Constraints:
- Do not suggest extreme changes
- Do not mention categories that are already improving
- Quantify the impact of the suggestion
- Do not use bullet points
`.trim();

async function buildSpendingChart(expenses: Expense[]) {
  const totals = getCategoryTotals(expenses).slice(0, 6);
  const labels = totals.map((item) => item.category);
  const data = totals.map((item) => Number(item.amount));

  const configuration = {
    type: "doughnut" as const,
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "#2563EB",
            "#22C55E",
            "#F59E0B",
            "#EF4444",
            "#A855F7",
            "#06B6D4",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "right" as const,
          labels: { boxWidth: 14, font: { size: 24 } },
        },
        title: {
          display: true,
          text: "Spending Breakdown (Top Categories)",
          font: { size: 32, weight: "bold" },
          color: "#0f172a",
        },
      },
    },
  };

  return chartCanvas.renderToBuffer(configuration as any, "image/png");
}

function computeSuccess(goal: Goal, totalSpent: number, categoryTotals: Map<string, number>, totalIncome: number) {
  if (goal.successType === "none") {
    return { isMet: null, message: "No specific target set." };
  }

  const target = Number(goal.successAmount ?? 0);
  const income = totalIncome;

  switch (goal.successType) {
    case "max_spend":
      return {
        isMet: totalSpent <= target,
        message: `Target spend ${formatCurrency(target)}.`,
      };
    case "category_cap":
      if (!goal.successCategory) {
        return { isMet: null, message: "Category cap set." };
      }
      const spentInCategory = categoryTotals.get(goal.successCategory) || 0;
      return {
        isMet: spentInCategory <= target,
        message: `${goal.successCategory} spend ${formatCurrency(spentInCategory)} vs cap ${formatCurrency(target)}.`,
      };
    case "monthly_saving": {
      if (!income) return { isMet: null, message: "Monthly savings target set." };
      const saved = totalIncome - totalSpent;
      return {
        isMet: saved >= target,
        message: `Saved ${formatCurrency(saved)} vs goal ${formatCurrency(target)}.`,
      };
    }
    case "percent_income": {
      if (!income) return { isMet: null, message: "Savings rate target set." };
      const saved = totalIncome - totalSpent;
      const rate = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;
      return {
        isMet: rate >= target,
        message: `Saved ${rate.toFixed(1)}% vs goal ${target.toFixed(1)}%.`,
      };
    }
    default:
      return { isMet: null, message: "Goal not evaluated." };
  }
}

function buildPrompt(params: {
  goal: Goal;
  budgets: Budget[];
  budgetEnabled: boolean;
  current: {
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    expenses: Expense[];
    incomes: Income[];
    totalSpent: number;
    totalIncome: number;
  };
  previous: {
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    expenses: Expense[];
    incomes: Income[];
    totalSpent: number;
    totalIncome: number;
  };
}) {
  const { goal, budgets, budgetEnabled, current, previous } = params;
  const mainGoalLabels: Record<string, string> = {
    save_specific: "Save for a specific goal",
    reduce_spending: "Reduce overall spending",
    control_category: "Control a specific category",
    maintain: "Maintain lifestyle but track better",
    pay_down_debt: "Pay down debt",
  };
  const successTypeLabels: Record<string, string> = {
    monthly_saving: "Monthly saving target",
    max_spend: "Maximum total spend",
    category_cap: "Category cap",
    percent_income: "Percent of income saved",
    none: "No specific target",
  };

  const currentCategoryTotals = getCategoryTotals(current.expenses);
  const currentCategoryTotalsMap = new Map(currentCategoryTotals.map((item) => [item.category, item.amount]));
  const success = computeSuccess(goal, current.totalSpent, currentCategoryTotalsMap, current.totalIncome);

  // Calculate budget statuses for monthly budgets only (since this is a monthly summary)
  const monthlyBudgets = budgets.filter((b) => b.enabled && b.period === "monthly");
  const currentBudgetStatuses = monthlyBudgets.map((budget) =>
    calculateBudgetStatus(budget, current.expenses, current.periodStart, current.periodEnd)
  );
  const previousBudgetStatuses = monthlyBudgets.map((budget) =>
    calculateBudgetStatus(budget, previous.expenses, previous.periodStart, previous.periodEnd)
  );

  const structuredData = {
    meta: {
      timezone: TZ,
      currentPeriod: {
        label: current.periodLabel,
        start: current.periodStart.toISOString(),
        end: current.periodEnd.toISOString(),
      },
      previousPeriod: {
        label: previous.periodLabel,
        start: previous.periodStart.toISOString(),
        end: previous.periodEnd.toISOString(),
      },
    },
    goal: {
      mainGoal: mainGoalLabels[goal.mainGoal] ?? goal.mainGoal,
      successType: successTypeLabels[goal.successType] ?? goal.successType,
      successAmount: goal.successAmount ?? null,
      successCategory: goal.successCategory ?? null,
      incomeMonthly: goal.incomeMonthly ? Number(goal.incomeMonthly) : null,
      priorityCategories: goal.priorityCategories,
      strictness: goal.strictness,
      successCheck: success.message,
    },
    budgets: {
      enabled: budgetEnabled,
      monthlyBudgets: currentBudgetStatuses.map((status) => ({
        category: status.category,
        budgetAmount: status.budgetAmount,
        spent: status.spent,
        remaining: status.remaining,
        percentage: Number(status.percentage.toFixed(1)),
        status: status.status,
      })),
      budgetComparison: currentBudgetStatuses.map((currentStatus, index) => {
        const previousStatus = previousBudgetStatuses[index];
        return {
          category: currentStatus.category,
          currentSpent: currentStatus.spent,
          previousSpent: previousStatus.spent,
          change: currentStatus.spent - previousStatus.spent,
          currentStatus: currentStatus.status,
          previousStatus: previousStatus.status,
        };
      }),
    },
    currentMonth: {
      totals: {
        totalSpent: Number(current.totalSpent.toFixed(2)),
        totalIncome: Number(current.totalIncome.toFixed(2)),
        totalExpensesCount: current.expenses.length,
        totalIncomesCount: current.incomes.length,
      },
      expenses: current.expenses.map((expense) => ({
        id: expense.id,
        category: expense.category,
        amount: Number(expense.amount),
        date: new Date(expense.date).toISOString(),
        location: expense.location ?? null,
        remark: expense.remark ?? null,
        taxReducible: expense.taxReducible ?? null,
      })),
      incomes: current.incomes.map((income) => ({
        id: income.id,
        source: income.source ?? null,
        amount: Number(income.amount),
        date: new Date(income.date).toISOString(),
        remark: income.remark ?? null,
      })),
    },
    previousMonth: {
      totals: {
        totalSpent: Number(previous.totalSpent.toFixed(2)),
        totalIncome: Number(previous.totalIncome.toFixed(2)),
        totalExpensesCount: previous.expenses.length,
        totalIncomesCount: previous.incomes.length,
      },
      expenses: previous.expenses.map((expense) => ({
        id: expense.id,
        category: expense.category,
        amount: Number(expense.amount),
        date: new Date(expense.date).toISOString(),
        location: expense.location ?? null,
        remark: expense.remark ?? null,
        taxReducible: expense.taxReducible ?? null,
      })),
      incomes: previous.incomes.map((income) => ({
        id: income.id,
        source: income.source ?? null,
        amount: Number(income.amount),
        date: new Date(income.date).toISOString(),
        remark: income.remark ?? null,
      })),
    },
  };

  return `${SUMMARY_PROMPT_INSTRUCTIONS}

Data:
${JSON.stringify(structuredData, null, 2)}`;
}

function getLastMonthPeriod() {
  const now = DateTime.now().setZone(TZ);
  const periodStart = now.minus({ months: 1 }).startOf("month");
  const periodEnd = now.minus({ months: 1 }).endOf("month");
  const periodLabel = periodStart.toFormat("LLLL yyyy");
  return { now, periodStart, periodEnd, periodLabel };
}

function getPreviousMonthPeriod() {
  const now = DateTime.now().setZone(TZ);
  const periodStart = now.minus({ months: 2 }).startOf("month");
  const periodEnd = now.minus({ months: 2 }).endOf("month");
  const periodLabel = periodStart.toFormat("LLLL yyyy");
  return { periodStart, periodEnd, periodLabel };
}

export async function generateAndEmailSummaryForUser(
  user: User,
  options?: { forceSend?: boolean; forceRegenerate?: boolean },
) {
  if (!user.email) {
    return { sent: false, reason: "Missing email" };
  }
  if (!user.summaryEnabled && !options?.forceSend) {
    return { sent: false, reason: "Summary disabled" };
  }

  const goal = await storage.getGoals(user.id);
  if (!goal) {
    return { sent: false, reason: "Goals not set" };
  }

  const budgets = await storage.getBudgets(user.id);
  const budgetEnabled = user.budgetEnabled ?? false;

  const { periodStart, periodEnd, periodLabel } = getLastMonthPeriod();
  const previousPeriod = getPreviousMonthPeriod();
  const existing = await storage.getMonthlySummary(
    user.id,
    periodStart.toJSDate(),
    periodEnd.toJSDate(),
  );

  const expenses = await storage.getExpensesForRange(
    user.id,
    periodStart.toJSDate(),
    periodEnd.toJSDate(),
  );
  const incomes = await storage.getIncomesForRange(
    user.id,
    periodStart.toJSDate(),
    periodEnd.toJSDate(),
  );
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const extraIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const baseIncome = goal.incomeMonthly ? Number(goal.incomeMonthly) : 0;
  const totalIncome = baseIncome + extraIncome;

  const previousExpenses = await storage.getExpensesForRange(
    user.id,
    previousPeriod.periodStart.toJSDate(),
    previousPeriod.periodEnd.toJSDate(),
  );
  const previousIncomes = await storage.getIncomesForRange(
    user.id,
    previousPeriod.periodStart.toJSDate(),
    previousPeriod.periodEnd.toJSDate(),
  );
  const previousTotalSpent = previousExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const previousExtraIncome = previousIncomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const previousTotalIncome = baseIncome + previousExtraIncome;

  const generatedSummary = await generateMonthlySummary(
    buildPrompt({
      goal,
      budgets,
      budgetEnabled,
      current: {
        periodLabel,
        periodStart: periodStart.toJSDate(),
        periodEnd: periodEnd.toJSDate(),
        expenses,
        incomes,
        totalSpent,
        totalIncome,
      },
      previous: {
        periodLabel: previousPeriod.periodLabel,
        periodStart: previousPeriod.periodStart.toJSDate(),
        periodEnd: previousPeriod.periodEnd.toJSDate(),
        expenses: previousExpenses,
        incomes: previousIncomes,
        totalSpent: previousTotalSpent,
        totalIncome: previousTotalIncome,
      },
    }),
  );

  const savedSummary = existing
    ? options?.forceRegenerate
      ? await storage.updateMonthlySummary(existing.id, generatedSummary)
      : existing
    : await storage.createMonthlySummary({
        userId: user.id,
        periodStart: periodStart.toJSDate(),
        periodEnd: periodEnd.toJSDate(),
        summary: generatedSummary,
      });

  const summary = savedSummary.summary;
  const savedAmount = totalIncome - totalSpent;
  const previousSavedAmount = previousTotalIncome - previousTotalSpent;
  const spentDelta = totalSpent - previousTotalSpent;
  const spentDeltaPct = previousTotalSpent > 0 ? (spentDelta / previousTotalSpent) * 100 : null;

  const plainSummary = summary.replace(/\*\*/g, "");
  const emailBody = [
    `Hi ${user.username},`,
    "",
    `Here is your SpendWisely summary for ${periodLabel}:`,
    "",
    plainSummary,
    "",
    "If you'd like to adjust your goals, you can do so in Settings.",
    "",
    "— SpendWisely",
  ].join("\n");

  const htmlSummary = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([A-Za-z][A-Za-z\s]+):\s*(.*)$/);
      if (match) {
        const [, label, value] = match;
        return `<p style="margin: 0 0 10px;"><strong>${label}:</strong> ${value}</p>`;
      }
      return `<p style="margin: 0 0 10px;">${line}</p>`;
    })
    .join("");

  const emailHtml = `
<div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 24px;">
  <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #2563eb, #0ea5e9); padding: 24px; color: white;">
      <h1 style="margin: 0; font-size: 22px;">SpendWisely Monthly Summary</h1>
      <p style="margin: 6px 0 0; opacity: 0.9;">${periodLabel}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0;">Hi ${user.username},</p>
      <p>Here’s your personalized spending summary:</p>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 12px 0 20px;">
        <div style="background:#f8fafc; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">Total spent</p>
          <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${formatCurrency(totalSpent)}</p>
        </div>
        <div style="background:#f8fafc; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">Saved</p>
          <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${formatCurrency(savedAmount)}</p>
        </div>
        <div style="background:#f8fafc; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">Spent vs last month</p>
          <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: ${spentDelta <= 0 ? "#16a34a" : "#dc2626"};">
            ${spentDelta <= 0 ? "↓" : "↑"} ${formatCurrency(Math.abs(spentDelta))}
            ${spentDeltaPct !== null ? ` (${spentDeltaPct <= 0 ? "" : "+"}${spentDeltaPct.toFixed(1)}%)` : ""}
          </p>
        </div>
      </div>
      <div style="background:#f1f5f9; border-radius: 12px; padding: 16px; line-height: 1.5;">
        ${htmlSummary}
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <img src="cid:spending-chart" alt="Spending breakdown chart" style="width: 100%; max-width: 700px; border-radius: 12px; border: 1px solid #e2e8f0;" />
      </div>
      <p style="margin-top: 20px;">If you'd like to adjust your goals, you can do so in Settings.</p>
      <p style="margin-bottom: 0; font-weight: 600;">— SpendWisely</p>
    </div>
  </div>
</div>
`.trim();

  const chartBuffer = await buildSpendingChart(expenses);
  const sendResult = await sendEmail({
    to: user.email,
    subject: `Your ${periodLabel} SpendWisely summary`,
    text: emailBody,
    html: emailHtml,
    attachments: [
      {
        filename: "spending-breakdown.png",
        content: chartBuffer,
        cid: "spending-chart",
        contentType: "image/png",
        contentDisposition: "inline",
      },
    ],
  });

  if (!sendResult.skipped && savedSummary.id) {
    await storage.markMonthlySummaryEmailed(savedSummary.id);
    console.info(`✅ Monthly summary email sent to ${user.email} for ${periodLabel}`);
  } else {
    console.warn(`⚠️ Monthly summary email skipped for ${user.email} - no email service configured`);
  }

  return {
    sent: !sendResult.skipped,
    reason: sendResult.skipped ? "SMTP not configured" : "Sent",
  };
}

export async function runMonthlySummaryNow() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set. Skipping monthly summary job.");
    return;
  }
  const { now } = getLastMonthPeriod();
  if (now.day !== 1) return;

  const users = await storage.getAllUsers();
  for (const user of users) {
    if (!user.email) continue;
    if (!user.summaryEnabled) continue;
    await generateAndEmailSummaryForUser(user);
  }
}

export function startMonthlySummaryJob() {
  const enabled = process.env.ENABLE_SUMMARY_JOB !== "false";
  if (!enabled) return;

  cron.schedule(
    "10 0 * * *",
    () => {
      runMonthlySummaryNow().catch((err) => {
        console.error("Monthly summary job failed", err);
      });
    },
    { timezone: TZ },
  );
}
