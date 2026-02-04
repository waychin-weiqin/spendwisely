import { useIncomes } from "@/hooks/use-incomes";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Loader2, Search, Trash2, CalendarIcon, Banknote, Receipt } from "lucide-react";
import { CreateIncomeDialog } from "@/components/incomes/CreateIncomeDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export default function IncomesPage() {
  const { incomes, isLoading, deleteIncome } = useIncomes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIncomes = useMemo(() => {
    return incomes
      .filter((income) => {
        const matchesSearch =
          income.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (income.remark && income.remark.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen box-border bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row safe-area-top">
      <Sidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full animate-in">
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-border/50 bg-white/80 px-6 py-7 shadow-xl shadow-black/5 backdrop-blur-sm md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)]" />
          <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/30 via-teal-300/20 to-transparent blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">All income</h1>
              <p className="text-muted-foreground mt-1">Track all incoming cash flow.</p>
            </div>
            <CreateIncomeDialog />
          </div>
        </header>

        <Card className="border-border/50 shadow-sm mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search income..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {filteredIncomes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Banknote className="w-8 h-8 opacity-40" />
                </div>
                <p>No income found matching your criteria.</p>
                <Button variant="link" onClick={() => setSearchTerm("")}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncomes.map((income) => (
                    <TableRow key={income.id} className="group">
                      <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 opacity-50" />
                          {format(new Date(income.date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <Receipt className="w-3.5 h-3.5" />
                          {income.source}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {income.remark || "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ${Number(income.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Income</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this income entry? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteIncome(income.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <CreateIncomeDialog initialValues={income} triggerLabel="" />
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
