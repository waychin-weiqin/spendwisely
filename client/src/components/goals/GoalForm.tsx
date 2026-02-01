import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema, type InsertGoal } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const mainGoalOptions = [
  { value: "save_specific", label: "Save for a specific goal (house, car, travel, emergency fund)" },
  { value: "reduce_spending", label: "Reduce overall spending" },
  { value: "control_category", label: "Control a specific category" },
  { value: "maintain", label: "Maintain lifestyle but track better" },
  { value: "pay_down_debt", label: "Pay down debt" },
];

const successTypeOptions = [
  { value: "monthly_saving", label: "Monthly saving target" },
  { value: "max_spend", label: "Maximum total spend" },
  { value: "category_cap", label: "Category cap" },
  { value: "percent_income", label: "Percent of income saved" },
  { value: "none", label: "No specific target yet" },
];

const categoryOptions = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Rental",
  "Repayment",
  "Health & Fitness",
  "Travel",
  "Education",
  "Other",
];

const strictnessOptions = [
  { value: "strict", label: "Very strict — clear limits and warnings" },
  { value: "balanced", label: "Balanced — gentle nudges and summaries" },
  { value: "flexible", label: "Flexible — insights only, no pressure" },
];

type GoalFormProps = {
  initialValues?: Partial<InsertGoal>;
  onSubmit: (values: InsertGoal) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
};

export function GoalForm({ initialValues, onSubmit, submitLabel = "Save goals", isSubmitting }: GoalFormProps) {
  const defaultValues = useMemo<InsertGoal>(() => ({
    mainGoal: initialValues?.mainGoal ?? "save_specific",
    successType: initialValues?.successType ?? "monthly_saving",
    successAmount: initialValues?.successAmount ?? null,
    successCategory: initialValues?.successCategory ?? null,
    incomeMonthly: initialValues?.incomeMonthly ?? null,
    priorityCategories: initialValues?.priorityCategories ?? [],
    strictness: initialValues?.strictness ?? "balanced",
  }), [initialValues]);

  const form = useForm<InsertGoal>({
    resolver: zodResolver(insertGoalSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const successType = form.watch("successType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="mainGoal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>1. What is your main financial goal right now?</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your main goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mainGoalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="successType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>2. What does “success” look like to you each month?</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a target type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {successTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {successType !== "none" && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="successAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {successType === "percent_income" ? "Target percent" : "Target amount"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={successType === "percent_income" ? "0.1" : "0.01"}
                      placeholder={successType === "percent_income" ? "e.g. 20" : "e.g. 1000"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {successType === "category_cap" && (
              <FormField
                control={form.control}
                name="successCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category to cap</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="incomeMonthly"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly income</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Required — used to calculate savings rate and tailor insights.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priorityCategories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>3. Which spending areas matter most to you?</FormLabel>
              <FormDescription>Select 2–3 to prioritize in insights.</FormDescription>
              <div className="grid gap-3 md:grid-cols-2">
                {categoryOptions.map((option) => (
                  <FormItem key={option} className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(option)}
                        onCheckedChange={(checked) => {
                          const current = field.value ?? [];
                          if (checked) {
                            field.onChange([...current, option]);
                          } else {
                            field.onChange(current.filter((item) => item !== option));
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">{option}</FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="strictness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>4. How hands-on do you want to be with spending changes?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-3"
                >
                  {strictnessOptions.map((option) => (
                    <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={option.value} />
                      </FormControl>
                      <FormLabel className="font-normal">{option.label}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
