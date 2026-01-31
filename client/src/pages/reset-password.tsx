import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";
import { useLocation, useRoute } from "wouter";

const resetSchema = z
  .object({
    password: z.string().min(6, "Passcode must be at least 6 characters"),
    confirm: z.string().min(6, "Passcode must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passcodes do not match",
    path: ["confirm"],
  });

export default function ResetPasswordPage() {
  const { resetPassword, isResettingPassword } = useAuth();
  const [, params] = useRoute("/reset-password/:token");
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit(values: z.infer<typeof resetSchema>) {
    if (!params?.token) return;
    resetPassword(
      { token: params.token, password: values.password },
      {
        onSuccess: () => setLocation("/auth"),
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md animate-in">
        <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 w-fit">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Choose a new passcode</CardTitle>
            <CardDescription>Set a new passcode to secure your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New passcode</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter a new passcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm passcode</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your passcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isResettingPassword}>
                  {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update passcode
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
