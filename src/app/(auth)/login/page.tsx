"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { getRedirectForRole } from "@/lib/role-redirect";
import { APP_NAME, APP_FULL_NAME, BANNER_IMAGE } from "@/lib/app-name";
import { z } from "zod";
import { toastError, toastSuccess } from "@/lib/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { RHFTextField } from "@/components/fields/RHFTextField";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email("Enter a valid email"),
        password: z.string().min(1, "Password is required"),
      }),
    [],
  );

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const handleSubmit = async (values: Values) => {
    setLoading(true);
    const result = await login(values.email, values.password);
    setLoading(false);
    if ("error" in result) {
      toastError(result.error);
      return;
    }
    toastSuccess("Welcome back.");
    router.push(getRedirectForRole(result.user.role));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = String(form.getValues("email") ?? "").trim();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      toastError("Email is required");
      return;
    }
    const err = await sendOtp(email);
    if (err) {
      toastError(err);
    } else {
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-salon-cream">
      {/* Hero image - left on desktop, top on mobile */}
      <div className="lg:w-1/2 relative min-h-[220px] lg:min-h-screen flex-shrink-0">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d5e8e4] via-salon-cream to-salon-sand flex items-center justify-center p-8">
            <span className="font-display text-salon-espresso text-xl font-semibold text-center">
              {APP_FULL_NAME}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0">
            <Image
              src={BANNER_IMAGE}
              alt={APP_FULL_NAME}
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        <div
          className="absolute inset-0 bg-salon-espresso/20 lg:bg-salon-espresso/30 pointer-events-none"
          aria-hidden
        />
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col bg-salon-cream">
        <header className="border-b border-salon-sand/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="font-display text-lg font-semibold text-salon-espresso hover:text-salon-bark transition-colors"
            >
              {APP_NAME}
            </Link>
            <Link
              href="/register"
              className="text-sm text-salon-stone hover:text-salon-espresso"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold text-salon-espresso mb-2">
              Log in
            </h1>
            <p className="text-salon-stone text-sm mb-6">
              Sign in with your salon or platform account. You’ll be taken to
              the right place based on your role.
            </p>
            <div className="bg-white rounded-2xl border border-salon-sand/40 shadow-sm p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, (e) => {
                    toastError(e?.email?.message || e?.password?.message || "Invalid input");
                  })}
                  className="space-y-4"
                  autoComplete="off"
                >
                  <RHFTextField
                    control={form.control}
                    name="email"
                    label="Email"
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="off"
                    disabled={loading}
                  />
                  <RHFTextField
                    control={form.control}
                    name="password"
                    label="Password"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-11 rounded-xl font-semibold"
                    >
                      {loading ? "Signing in..." : "Log in"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      className="h-11 rounded-xl"
                      disabled={loading}
                    >
                      Send OTP
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            <p className="mt-6 text-center">
              <Link
                href="/"
                className="text-salon-stone text-sm hover:text-salon-espresso transition-colors"
              >
                ← Back to home
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
