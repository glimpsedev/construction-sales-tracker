import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login } from "@/lib/auth";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        window.location.href = '/';
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50/50" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-blue-50/60 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <Card className="border-gray-200/60 shadow-xl shadow-gray-200/40 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl text-center font-semibold text-gray-900">Construction Tracker</CardTitle>
            <CardDescription className="text-center text-gray-500 text-sm">
              Sign in to your job tracking dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {error && (
              <Alert variant="destructive" className="mb-4 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          className="h-10 rounded-lg bg-gray-50/80 border-gray-200 focus:bg-white"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="h-10 rounded-lg bg-gray-50/80 border-gray-200 focus:bg-white"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                California Construction Job Intelligence
              </p>
              <p className="text-xs text-gray-400 text-center mt-0.5">
                Powered by Dodge Data & Analytics
              </p>
            </div>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-500">Don't have an account?</span>{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
