import { useExpenses } from "@/hooks/use-expenses";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Loader2, Search, Filter, Download, Trash2, MapPin, Tag, CalendarIcon, Pencil } from "lucide-react";
import { CreateExpenseDialog } from "@/components/expenses/CreateExpenseDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { expenses, isLoading, deleteExpense } = useExpenses();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [taxOnly, setTaxOnly] = useState(false);

  // Derived state for filtering
  const categories = useMemo(() => {
    const unique = new Set(expenses.map(e => e.category));
    return Array.from(unique);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.remark && expense.remark.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = 
        categoryFilter.length === 0 || 
        categoryFilter.includes(expense.category);

      const matchesTax = !taxOnly || expense.taxReducible;

      return matchesSearch && matchesCategory && matchesTax;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, categoryFilter, taxOnly]);

  const handleExport = () => {
    const rows = [
      ["Date", "Category", "Location", "Amount", "Remark", "Tax deductible"],
      ...filteredExpenses.map((e) => [
        format(new Date(e.date), "yyyy-MM-dd"),
        e.category,
        e.location,
        Number(e.amount).toFixed(2),
        e.remark || "",
        e.taxReducible ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "My_Expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row safe-area-top">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full animate-in">
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-border/50 bg-white/80 px-6 py-7 shadow-xl shadow-black/5 backdrop-blur-sm md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)]" />
          <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-blue-400/25 via-cyan-300/20 to-transparent blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">All expenses</h1>
              <p className="text-muted-foreground mt-1">Manage and review your transaction history.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <CreateExpenseDialog />
            </div>
          </div>
        </header>

        <Card className="border-border/50 shadow-sm mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search expenses..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto gap-2">
                    <Filter className="w-4 h-4" /> Filter Categories
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-950">
                  <DropdownMenuLabel>Select Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map(cat => (
                    <DropdownMenuCheckboxItem
                      key={cat}
                      checked={categoryFilter.includes(cat)}
                      onCheckedChange={(checked) => {
                        setCategoryFilter(prev => 
                          checked ? [...prev, cat] : prev.filter(c => c !== cat)
                        );
                      }}
                    >
                      {cat}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <label className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={taxOnly}
                  onCheckedChange={(checked) => setTaxOnly(Boolean(checked))}
                />
                Tax deductible only
              </label>
            </div>
          </div>
        </Card>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Search className="w-8 h-8 opacity-40" />
                </div>
                <p>No expenses found matching your criteria.</p>
                <Button variant="link" onClick={() => {setSearchTerm(""); setCategoryFilter([])}}>Clear filters</Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location / Remark</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 opacity-50" />
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {expense.category}
                        </span>
                        {expense.taxReducible ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            <Tag className="h-3 w-3" />
                            Tax
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {expense.location}
                          </span>
                          {expense.remark && (
                            <span className="text-xs text-muted-foreground pl-5">{expense.remark}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ${Number(expense.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-2">
                        <CreateExpenseDialog
                          initialValues={expense}
                          triggerLabel=""
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this expense? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
