import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
} from "date-fns";
import type { Budget, Expense } from "@shared/schema";

export type BudgetStatus = {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "danger";
};

export function calculateBudgetStatus(
  budget: Budget,
  expenses: Expense[],
  referenceDate: Date = new Date()
): BudgetStatus {
  // Determine period boundaries
  let periodStart: Date;
  let periodEnd: Date;

  switch (budget.period) {
    case "weekly":
      periodStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
      periodEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      break;
    case "monthly":
      periodStart = startOfMonth(referenceDate);
      periodEnd = endOfMonth(referenceDate);
      break;
    case "quarterly":
      periodStart = startOfQuarter(referenceDate);
      periodEnd = endOfQuarter(referenceDate);
      break;
    default:
      throw new Error(`Unknown budget period: ${budget.period}`);
  }

  // Calculate spent amount for this category in this period
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

  // Determine status
  let status: "safe" | "warning" | "danger";
  if (percentage >= 100) {
    status = "danger";
  } else if (percentage >= 80) {
    status = "warning";
  } else {
    status = "safe";
  }

  return {
    budget,
    spent,
    remaining,
    percentage,
    status,
  };
}

export function getAllBudgetStatuses(
  budgets: Budget[],
  expenses: Expense[]
): BudgetStatus[] {
  return budgets
    .filter((b) => b.enabled)
    .map((budget) => calculateBudgetStatus(budget, expenses));
}
