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
import { Loader2, Mail } from "lucide-react";
import { useLocation } from "wouter";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const { requestPasswordReset, isRequestingReset } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof forgotSchema>) {
    requestPasswordReset(values, {
      onSuccess: () => setLocation("/auth"),
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md animate-in">
        <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 w-fit">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Reset your passcode</CardTitle>
            <CardDescription>We’ll email you a reset link if the address exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isRequestingReset}>
                  {isRequestingReset ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send reset link
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setLocation("/auth")}>
                  Back to sign in
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
