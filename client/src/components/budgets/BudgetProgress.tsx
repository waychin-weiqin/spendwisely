import { Progress } from "@/components/ui/progress";
import type { BudgetStatus } from "@/lib/budget-utils";

interface BudgetProgressProps {
  budgetStatus: BudgetStatus;
  showDetails?: boolean;
}

export function BudgetProgress({ budgetStatus, showDetails = true }: BudgetProgressProps) {
  const { budget, spent, remaining, percentage, status } = budgetStatus;

  const statusColors = {
    safe: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  const statusTextColors = {
    safe: "text-green-700 dark:text-green-400",
    warning: "text-yellow-700 dark:text-yellow-400",
    danger: "text-red-700 dark:text-red-400",
  };

  const periodLabels = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{budget.category}</span>
          <span className="text-xs text-muted-foreground">
            ({periodLabels[budget.period as keyof typeof periodLabels]})
          </span>
        </div>
        {showDetails && (
          <span className={`text-xs font-medium ${statusTextColors[status]}`}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      <Progress
        value={Math.min(percentage, 100)}
        className="h-2"
        indicatorClassName={statusColors[status]}
      />

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Spent: ${spent.toFixed(2)}
          </span>
          <span>
            Budget: ${Number(budget.amount).toFixed(2)}
          </span>
        </div>
      )}

      {showDetails && remaining < 0 && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Over budget by ${Math.abs(remaining).toFixed(2)}
        </p>
      )}
    </div>
  );
}
