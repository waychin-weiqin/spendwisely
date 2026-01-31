import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertExpenseSchema } from "@shared/schema";
import { useExpenses } from "@/hooks/use-expenses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.date(),
});

const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Rental",
  "Loan Repayment",
  "Health & Fitness",
  "Travel",
  "Education",
  "Other"
];

type CreateExpenseDialogProps = {
  initialValues?: Partial<z.infer<typeof formSchema>>;
  onSuccess?: () => void;
  triggerLabel?: string;
};

export function CreateExpenseDialog({
  initialValues,
  onSuccess,
  triggerLabel = "Add Expense",
}: CreateExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const { createExpense, updateExpense, isCreating, isUpdating } = useExpenses();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialValues?.amount ?? 0,
      category: initialValues?.category ?? "",
      location: initialValues?.location ?? "",
      remark: initialValues?.remark ?? "",
      date: initialValues?.date ? new Date(initialValues.date as any) : new Date(),
    },
  });

  const isEdit = Boolean(initialValues?.id);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (initialValues?.id) {
      updateExpense(
        { id: Number(initialValues.id), data: values },
        {
          onSuccess: () => {
            setOpen(false);
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createExpense(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          onSuccess?.();
        },
      });
    }
  }

  const triggerIsIcon = triggerLabel === "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={
            isEdit
              ? triggerIsIcon
                ? "opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                : "gap-2"
              : "gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          }
          size={triggerIsIcon ? "icon" : "default"}
          variant={triggerIsIcon ? "ghost" : "default"}
        >
          {triggerIsIcon ? <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" /> : isEdit ? null : <Plus className="w-4 h-4" />}
          {triggerIsIcon ? null : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-border/50">
        <div className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-primary">
              {initialValues?.id ? "Edit Expense" : "New Expense"}
            </DialogTitle>
            <DialogDescription>
              Record a new transaction to track your spending.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 pt-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">$</span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="pl-7 font-mono text-lg" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-950" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Merchant</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Starbucks, Walmart" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Lunch with team..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isCreating || isUpdating}
                  className="w-full sm:w-auto"
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Expense"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
