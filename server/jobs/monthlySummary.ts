import cron from "node-cron";
import { DateTime } from "luxon";
import { storage } from "../storage";
import { generateMonthlySummary } from "../ai";
import { sendEmail } from "../email";
import type { Expense, Goal, User } from "@shared/schema";
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

const chartWidth = 1400;
const chartHeight = 800;
const chartCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: "white" });

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
  expenses: Expense[];
  periodLabel: string;
  totalSpent: number;
  totalIncome: number;
}) {
  const { goal, expenses, periodLabel, totalSpent, totalIncome } = params;
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
  const categoryTotals = getCategoryTotals(expenses);
  const categoryTotalsMap = new Map(categoryTotals.map((item) => [item.category, item.amount]));
  const topCategories = categoryTotals.slice(0, 5);
  const priorityTotals = categoryTotals.filter((item) =>
    goal.priorityCategories.includes(item.category),
  );
  const remarks = expenses
    .filter((expense) => expense.remark && expense.remark.trim().length > 0)
    .map((expense) => `${expense.category} — ${expense.remark!.trim()}`);

  const income = totalIncome;
  const saved = income - totalSpent;
  const savedRate = income > 0 ? (saved / income) * 100 : null;

  const success = computeSuccess(goal, totalSpent, categoryTotalsMap, totalIncome);

  return `
You are an empathetic financial coach. Write a concise monthly spending summary for ${periodLabel}.

User goal:
- Main goal: ${mainGoalLabels[goal.mainGoal] ?? goal.mainGoal}
- Success type: ${successTypeLabels[goal.successType] ?? goal.successType}
- Success amount: ${goal.successAmount ?? "N/A"}
- Success category: ${goal.successCategory ?? "N/A"}
- Base monthly income: ${goal.incomeMonthly ? Number(goal.incomeMonthly).toFixed(2) : "N/A"}
- Extra incomes logged: ${(totalIncome - (goal.incomeMonthly ? Number(goal.incomeMonthly) : 0)).toFixed(2)}
- Total income for month: ${totalIncome.toFixed(2)}
- Priority categories: ${goal.priorityCategories.join(", ")}
- Strictness: ${goal.strictness}

Spending data:
- Total spent: ${totalSpent.toFixed(2)}
- Number of expenses: ${expenses.length}
- Saved (income - spent): ${saved.toFixed(2)}
- Savings rate: ${savedRate !== null ? savedRate.toFixed(1) + "%" : "N/A"}
- Top categories: ${topCategories.map((c) => `${c.category} ${c.amount.toFixed(2)}`).join(", ")}
- Priority categories spend: ${priorityTotals.map((c) => `${c.category} ${c.amount.toFixed(2)}`).join(", ") || "N/A"}
- Success check: ${success.message}
- User remarks: ${remarks.length ? remarks.slice(0, 8).join("; ") : "None"}

Guidelines:
- Keep it under 180 words.
- Use 3 short sections with labels: "Summary:", "Highlights:", "Next steps:".
- If goal met, congratulate clearly in Summary.
- If goal missed, give 1-2 specific actions in Next steps.
- Mention priority categories with respect (no shaming).
- Match tone to strictness (strict = direct, balanced = gentle, flexible = insight-only).
- Weave in any user remarks to personalize (if relevant).
- Use plain text, no emojis.
`.trim();
}

function getLastMonthPeriod() {
  const now = DateTime.now().setZone(TZ);
  const periodStart = now.minus({ months: 1 }).startOf("month");
  const periodEnd = now.minus({ months: 1 }).endOf("month");
  const periodLabel = periodStart.toFormat("LLLL yyyy");
  return { now, periodStart, periodEnd, periodLabel };
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

  const { periodStart, periodEnd, periodLabel } = getLastMonthPeriod();
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

  const generatedSummary = await generateMonthlySummary(
    buildPrompt({ goal, expenses, periodLabel, totalSpent, totalIncome }),
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
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^Summary:/gm, "<strong>Summary:</strong>")
    .replace(/^Highlights:/gm, "<strong>Highlights:</strong>")
    .replace(/^Next steps:/gm, "<strong>Next steps:</strong>");

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
      <div style="background:#f1f5f9; border-radius: 12px; padding: 16px; line-height: 1.5;">
        ${htmlSummary.replace(/\n/g, "<br />")}
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
