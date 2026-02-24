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
      {/* Topography Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-gray-50 to-blue-50/50" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="topo" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#3b82f6" strokeWidth="1">
                <path d="M20,80 Q60,20 120,60 T220,40 T320,70 T400,50" />
                <path d="M0,120 Q50,70 100,100 T200,80 T300,110 T380,90 L400,95" />
                <path d="M30,160 Q80,110 140,140 T240,120 T340,155 T400,135" />
                <path d="M0,200 Q70,160 130,190 T230,170 T330,200 T400,180" />
                <path d="M10,240 Q60,200 120,230 T220,210 T320,245 T400,225" />
                <path d="M0,280 Q80,240 140,270 T240,250 T340,280 T400,265" />
                <path d="M20,320 Q70,280 130,310 T230,290 T330,325 T400,305" />
                <path d="M0,360 Q60,320 120,350 T220,335 T320,365 T400,345" />
                <path d="M0,400 Q80,370 140,395 T240,375 T340,400 T400,385" />
                <ellipse cx="180" cy="140" rx="60" ry="35" />
                <ellipse cx="180" cy="140" rx="35" ry="20" />
                <ellipse cx="320" cy="300" rx="50" ry="30" />
                <ellipse cx="320" cy="300" rx="28" ry="16" />
                <ellipse cx="70" cy="330" rx="45" ry="25" />
                <ellipse cx="70" cy="330" rx="22" ry="12" />
                <path d="M250,50 Q270,30 290,50 Q310,70 290,80 Q270,90 250,70 Z" />
                <path d="M255,55 Q270,40 285,55 Q300,70 285,75 Q270,80 255,65 Z" />
                <path d="M80,180 Q100,165 115,185 Q125,200 110,210 Q95,215 80,200 Z" />
                <path d="M300,170 Q330,150 350,175 Q365,195 345,210 Q320,215 305,195 Z" />
                <path d="M305,178 Q325,163 340,180 Q350,193 338,202 Q322,207 310,192 Z" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo)" />
        </svg>
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
