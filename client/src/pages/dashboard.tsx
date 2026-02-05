import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { useGoals } from "@/hooks/use-goals";
import { format, subDays, isSameMonth, isAfter, isBefore, startOfDay, startOfMonth, addMonths, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, MapPin, Tag, Wallet, Banknote, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { CreateExpenseDialog } from "@/components/expenses/CreateExpenseDialog";
import { CreateIncomeDialog } from "@/components/incomes/CreateIncomeDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { expenses, isLoading } = useExpenses();
  const { incomes, isLoading: incomesLoading } = useIncomes();
  const { goals } = useGoals({ enabled: true });
  const [timeRange, setTimeRange] = useState("monthly");
  const [spentMonthOffset, setSpentMonthOffset] = useState(0);
  const pieColors = [
    "#2563eb",
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
    "#f97316",
    "#ef4444",
    "#a855f7",
    "#14b8a6",
  ];

  const stats = useMemo(() => {
    const now = new Date();
    const baseIncome = goals?.incomeMonthly ? Number(goals.incomeMonthly) : 0;
    const thisMonthIncome = incomes
      .filter((i) => isSameMonth(new Date(i.date), now))
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const thisMonthTotalIncome = baseIncome + thisMonthIncome;

    const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const thisMonthSpent = expenses
      .filter((e) => isSameMonth(new Date(e.date), now))
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const net = thisMonthTotalIncome - thisMonthSpent;
    const savingsRate = thisMonthTotalIncome > 0 ? (net / thisMonthTotalIncome) * 100 : 0;

    return {
      totalSpent,
      thisMonthSpent,
      baseIncome,
      thisMonthIncome,
      thisMonthTotalIncome,
      net,
      savingsRate,
    };
  }, [expenses, incomes, goals]);

  const spentBreakdown = useMemo(() => {
    const now = new Date();
    const targetMonth = addMonths(now, -spentMonthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    const totals = new Map<string, number>();
    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= monthStart && expenseDate <= monthEnd) {
        totals.set(expense.category, (totals.get(expense.category) || 0) + Number(expense.amount));
      }
    });

    const entries = Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      entries,
      monthLabel: format(monthStart, "MMMM yyyy"),
      total: entries.reduce((sum, entry) => sum + entry.amount, 0),
    };
  }, [expenses, spentMonthOffset]);

  const chartData = useMemo(() => {
    if (!expenses.length && !incomes.length) return [];

    const now = new Date();
    const today = startOfDay(now);
    let startDate = subDays(today, 29);

    if (timeRange === "weekly") startDate = subDays(today, 6);
    if (timeRange === "quarterly") startDate = subDays(today, 89);

    const dailyMap = new Map<string, { label: string; expense: number; income: number }>();

    expenses.forEach((expense) => {
      const expenseDate = startOfDay(new Date(expense.date));
      if (
        (isAfter(expenseDate, startDate) || expenseDate.getTime() === startDate.getTime()) &&
        (isBefore(expenseDate, today) || expenseDate.getTime() === today.getTime())
      ) {
        const dateKey = format(expenseDate, "yyyy-MM-dd");
        const label = format(expenseDate, "MMM d");
        const current = dailyMap.get(dateKey);
        dailyMap.set(dateKey, {
          label,
          expense: (current?.expense || 0) + Number(expense.amount),
          income: current?.income || 0,
        });
      }
    });

    incomes.forEach((income) => {
      const incomeDate = startOfDay(new Date(income.date));
      if (
        (isAfter(incomeDate, startDate) || incomeDate.getTime() === startDate.getTime()) &&
        (isBefore(incomeDate, today) || incomeDate.getTime() === today.getTime())
      ) {
        const dateKey = format(incomeDate, "yyyy-MM-dd");
        const label = format(incomeDate, "MMM d");
        const current = dailyMap.get(dateKey);
        dailyMap.set(dateKey, {
          label,
          expense: current?.expense || 0,
          income: (current?.income || 0) + Number(income.amount),
        });
      }
    });

    return Array.from(dailyMap.entries())
      .map(([dateKey, value]) => ({ date: value.label, expense: value.expense, income: value.income, dateKey }))
      .sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1))
      .map(({ date, expense, income }) => ({ date, expense, income }));
  }, [expenses, incomes, timeRange]);

  const recentExpenses = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [expenses],
  );

  const recentIncomes = useMemo(
    () =>
      [...incomes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [incomes],
  );

  if (isLoading || incomesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100svh] md:min-h-screen md:h-auto box-border bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row safe-area-top overflow-hidden md:overflow-visible">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-[calc(env(safe-area-inset-bottom)+120px)] md:pb-8 max-w-[1600px] mx-auto w-full animate-in min-h-0 overflow-y-auto md:overflow-visible">
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-border/50 bg-white/80 px-6 py-7 shadow-xl shadow-black/5 backdrop-blur-sm md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.16),_transparent_55%)]" />
          <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-blue-400/30 via-cyan-300/20 to-transparent blur-3xl" />
          <div className="absolute -left-16 -bottom-24 h-44 w-44 rounded-full bg-gradient-to-tr from-emerald-400/25 via-teal-300/20 to-transparent blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
              <p className="text-muted-foreground mt-1">Income, spending, and momentum in one place.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <CreateIncomeDialog />
              <CreateExpenseDialog />
            </div>
          </div>
        </header>

        {/* Cash Flow Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
              <Banknote className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">
                ${stats.thisMonthTotalIncome.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base ${stats.baseIncome.toFixed(0)} + logs ${stats.thisMonthIncome.toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Dialog>
            <DialogTrigger asChild>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    This Month Spent
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    ${stats.thisMonthSpent.toFixed(0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(), "MMMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader className="space-y-1 shrink-0 border-b border-border/50 px-6 py-4 pr-12">
                <DialogTitle>Spending by category</DialogTitle>
                <DialogDescription>{spentBreakdown.monthLabel}</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => setSpentMonthOffset((prev) => prev + 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{spentBreakdown.monthLabel}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => setSpentMonthOffset((prev) => Math.max(0, prev - 1))}
                    disabled={spentMonthOffset === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {spentBreakdown.entries.length ? (
                  <div className="space-y-5">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={spentBreakdown.entries}
                            dataKey="amount"
                            nameKey="category"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {spentBreakdown.entries.map((entry, index) => (
                              <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `$${Number(value).toFixed(2)}`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {spentBreakdown.entries.map((entry, index) => (
                      <div key={entry.category} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          {entry.category}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          ${entry.amount.toFixed(0)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-sm font-semibold">
                      <span>Total</span>
                      <span>${spentBreakdown.total.toFixed(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No expenses recorded for this month.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Flow</CardTitle>
              {stats.net >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold font-display", stats.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                ${Math.abs(stats.net).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.net >= 0 ? "Surplus" : "Deficit"} for the month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-blue-600 text-white border-none shadow-lg shadow-primary/25">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Savings Rate</CardTitle>
              <Wallet className="w-4 h-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stats.savingsRate.toFixed(1)}%</div>
              <p className="text-xs text-blue-100/80">Based on total income this month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Chart */}
          <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Cash Flow Trends</CardTitle>
                <CardDescription>Income vs spending over time.</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[350px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#ffffff",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
                      }}
                      formatter={(value: number, name: string) => [
                        `$${Number(value).toFixed(2)}`,
                        name === "income" ? "Income" : "Spending",
                      ]}
                      separator=""
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#incomeFill)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#expenseFill)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mb-2 opacity-20" />
                  <p>No data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm flex flex-col">
            <Tabs defaultValue="expenses" className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </div>
                  <TabsList className="grid w-[210px] grid-cols-2">
                    <TabsTrigger value="expenses" aria-label="Expenses">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </TabsTrigger>
                    <TabsTrigger value="income" aria-label="Income">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <TabsContent value="expenses" className="mt-0">
                  {recentExpenses.length > 0 ? (
                    <div className="space-y-4">
                      {recentExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                          <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <DollarSign className="w-4 h-4" />
                        </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{expense.category}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {expense.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">-${Number(expense.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM d")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                      <p>No recent transactions</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="income" className="mt-0">
                  {recentIncomes.length > 0 ? (
                    <div className="space-y-4">
                      {recentIncomes.map((income) => (
                        <div key={income.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{income.source}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-0.5"><CalendarIcon className="w-3 h-3" /> {format(new Date(income.date), "MMM d")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-emerald-600">+${Number(income.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{income.remark || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                      <p>No recent income</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
