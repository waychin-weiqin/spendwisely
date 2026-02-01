import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertIncomeSchema } from "@shared/schema";
import { useIncomes } from "@/hooks/use-incomes";
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
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const formSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.date(),
});

type CreateIncomeDialogProps = {
  initialValues?: Partial<z.infer<typeof formSchema>>;
  onSuccess?: () => void;
  triggerLabel?: string;
};

export function CreateIncomeDialog({
  initialValues,
  onSuccess,
  triggerLabel = "Add Income",
}: CreateIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createIncome, updateIncome, isCreating, isUpdating } = useIncomes();
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialValues?.amount ?? 0,
      source: initialValues?.source ?? "",
      remark: initialValues?.remark ?? "",
      date: initialValues?.date ? new Date(initialValues.date as any) : new Date(),
    },
  });

  const isEdit = Boolean(initialValues?.id);
  const triggerIsIcon = triggerLabel === "";

  const triggerConfetti = () => {
    const button = saveButtonRef.current;
    const rect = button?.getBoundingClientRect();
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.6 };

    confetti({
      particleCount: 13,
      spread: 55,
      startVelocity: 14,
      gravity: 0.9,
      scalar: 0.9,
      origin,
    });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (initialValues?.id) {
      updateIncome(
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
      createIncome(values, {
        onSuccess: () => {
          triggerConfetti();
          setOpen(false);
          form.reset();
          onSuccess?.();
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={
            isEdit
              ? triggerIsIcon
                ? "opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                : "gap-2"
              : "gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
          }
          size={triggerIsIcon ? "icon" : "default"}
          variant={triggerIsIcon ? "ghost" : "default"}
        >
          {triggerIsIcon ? <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" /> : isEdit ? null : <Plus className="w-4 h-4" />}
          {triggerIsIcon ? null : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-border/50">
        <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-emerald-600">
              {isEdit ? "Edit Income" : "New Income"}
            </DialogTitle>
            <DialogDescription>
              Log income from shifts, grants, or any other sources.
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
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Part-time job, Scholarship" {...field} />
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
                      <Input placeholder="Weekend shifts..." {...field} value={field.value || ""} />
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
                  ref={saveButtonRef}
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Income"
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
