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
import { useLocale } from "@/components/LocaleProvider";
import { getPublicT } from "@/lib/i18n-public";

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("enterValidEmail")),
        password: z.string().min(1, t("passwordRequired")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
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
    toastSuccess(t("welcomeBackToast"));
    router.push(getRedirectForRole(result.user.role));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = String(form.getValues("email") ?? "").trim();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      toastError(t("emailRequired"));
      return;
    }
    const err = await sendOtp(email, locale);
    if (err) {
      toastError(err);
    } else {
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--elite-bg)] text-[var(--elite-text)]">
      <div className="lg:w-1/2 relative min-h-[220px] lg:min-h-screen flex-shrink-0">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--elite-surface)] via-[var(--elite-card)] to-[var(--elite-card-2)] flex items-center justify-center p-8">
            <span className="font-display text-[var(--elite-text)] text-xl font-semibold text-center">
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
        <div className="absolute inset-0 bg-black/35 lg:bg-black/45 pointer-events-none" aria-hidden />
      </div>

      <div className="flex-1 flex flex-col bg-[var(--elite-bg)]">
        <header className="flex-shrink-0 border-b border-[var(--elite-border)] bg-[var(--elite-card)]/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center px-4 py-4 ps-14">
            <Link
              href="/"
              className="font-display text-lg font-semibold text-[var(--elite-text)] transition-colors hover:text-primary"
            >
              {APP_NAME}
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold text-[var(--elite-text)] mb-2">
              {t("loginHeading")}
            </h1>
            <p className="text-[var(--elite-muted)] text-sm mb-6">
              {t("loginSubheading")}
            </p>
            <div className="bg-[var(--elite-card)] rounded-2xl border border-[var(--elite-border)] shadow-sm p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, (e) => {
                    toastError(e?.email?.message || e?.password?.message || t("checkHighlightedFields"));
                  })}
                  className="space-y-4 [&_label]:text-[var(--elite-muted)] [&_label]:font-medium [&_input]:bg-[var(--elite-surface)] [&_input]:border-[var(--elite-border-2)] [&_input]:text-[var(--elite-text)] [&_input]:placeholder:text-[var(--elite-muted)] [&_input]:rounded-xl [&_input:focus]:border-[var(--elite-orange)] [&_input:focus]:ring-1 [&_input:focus]:ring-[var(--elite-orange-dim)]"
                  autoComplete="off"
                >
                  <RHFTextField
                    control={form.control}
                    name="email"
                    label={t("email")}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="off"
                    disabled={loading}
                  />
                  <RHFTextField
                    control={form.control}
                    name="password"
                    label={t("password")}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:opacity-90"
                    >
                      {loading ? t("signingIn") : t("logIn")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      className="h-11 rounded-xl bg-[var(--elite-surface)] border-[var(--elite-border-2)] text-[var(--elite-text)] hover:bg-[var(--elite-card-2)]"
                      disabled={loading}
                    >
                      {t("sendOtp")}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            <p className="mt-6 text-center text-sm text-[var(--elite-muted)]">
              {t("dontHaveAccountLead")}{" "}
              <Link
                href="/register"
                className="font-semibold text-primary underline-offset-4 hover:text-primary hover:underline"
              >
                {t("signUp")}
              </Link>
            </p>
            <p className="mt-4 text-center">
              <Link
                href="/"
                className="text-sm text-[var(--elite-muted)] transition-colors hover:text-[var(--elite-text)]"
              >
                {t("backToHome")}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
