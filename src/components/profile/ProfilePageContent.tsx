"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Save, UserCircle2 } from "lucide-react";
import { profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/components/LocaleProvider";
import { getPublicT } from "@/lib/i18n-public";

// ── Small reusable primitives ─────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1.5">{message}</p>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-salon-stone uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-salon-espresso bg-card
        focus:outline-none focus:ring-2 focus:ring-salon-gold/30 transition-colors
        placeholder:text-gray-300
        ${error ? "border-red-300 bg-red-50/30" : "border-salon-sand/60 hover:border-salon-sand"}
        ${props.disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : ""}
        ${className}`}
    />
  );
}

function SectionCard({
  icon, iconBg, title, subtitle, children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-salon-espresso text-sm">{title}</h2>
          <p className="text-xs text-salon-stone mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Personal Details ──────────────────────────────────────────────────────────

function PersonalDetailsSection() {
  const { user, setUser } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const [saving, setSaving] = useState(false);

  const detailsSchema = z.object({
    name:  z.string().min(1, t("nameRequired")).max(100),
    email: z.string().email(t("invalidEmail")),
    phone: z.string().max(30).optional().or(z.literal("")),
  });
  type DetailsForm = z.infer<typeof detailsSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name:  user?.name ?? user?.fullName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      name:  user.name ?? user.fullName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
  }, [user, reset]);

  const onSubmit = async (values: DetailsForm) => {
    setSaving(true);
    const { data, error } = await profileApi.update({
      name:  values.name  || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    if (data?.user) {
      setUser(data.user);
      reset({ name: data.user.name ?? "", email: data.user.email ?? "", phone: data.user.phone ?? "" });
    }
    toast.success(t("profileUpdated"));
  };

  return (
    <SectionCard
      icon={<UserCircle2 className="w-4.5 h-4.5 text-salon-gold" />}
      iconBg="bg-salon-gold/10"
      title={t("personalDetails")}
      subtitle={t("personalDetailsSubtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t("fullNameLabel")}</FieldLabel>
            <TextInput {...register("name")} placeholder={t("yourName")} error={!!errors.name} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <FieldLabel>{t("phoneNumberLabel")} <span className="normal-case font-normal">{t("phoneNumberOptional")}</span></FieldLabel>
            <TextInput {...register("phone")} type="tel" placeholder="+1 555 000 0000" error={!!errors.phone} />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>
        <div>
          <FieldLabel>{t("emailAddress")}</FieldLabel>
          <TextInput {...register("email")} type="email" placeholder="you@example.com" error={!!errors.email} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-salon-gold text-white
              text-sm font-semibold rounded-xl hover:opacity-90 transition-colors
              shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const { locale } = useLocale();
  const t = getPublicT(locale);
  const [saving, setSaving]           = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordSchema = z
    .object({
      current_password:          z.string().min(1, t("currentPasswordRequired")),
      new_password:              z.string().min(8, t("min8Chars")),
      new_password_confirmation: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((d) => d.new_password === d.new_password_confirmation, {
      message: t("passwordsDoNotMatch"),
      path: ["new_password_confirmation"],
    });
  type PasswordForm = z.infer<typeof passwordSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordForm) => {
    setSaving(true);
    const { error } = await profileApi.changePassword({
      current_password:          values.current_password,
      new_password:              values.new_password,
      new_password_confirmation: values.new_password_confirmation,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("passwordChanged"));
    reset();
  };

  function PasswordField({
    id, label, show, onToggle, placeholder, error, ...rest
  }: {
    id: string; label: string; show: boolean; onToggle: () => void;
    placeholder: string; error?: boolean;
  } & ReturnType<typeof register>) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="relative">
          <TextInput {...rest} id={id} type={show ? "text" : "password"} placeholder={placeholder} error={error} className="pr-11" />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-stone hover:text-salon-espresso transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SectionCard
      icon={<KeyRound className="w-4.5 h-4.5 text-blue-500" />}
      iconBg="bg-blue-50"
      title={t("changePassword")}
      subtitle={t("changePasswordSubtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordField
            {...register("current_password")}
            id="current_password"
            label={t("currentPassword")}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="••••••••"
            error={!!errors.current_password}
          />
          <div />

          <PasswordField
            {...register("new_password")}
            id="new_password"
            label={t("newPassword")}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder={t("min8Chars")}
            error={!!errors.new_password}
          />

          <PasswordField
            {...register("new_password_confirmation")}
            id="new_password_confirmation"
            label={t("confirmNewPassword")}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="••••••••"
            error={!!errors.new_password_confirmation}
          />
        </div>

        {errors.current_password && <FieldError message={errors.current_password.message} />}
        {errors.new_password && <FieldError message={errors.new_password.message} />}
        {errors.new_password_confirmation && <FieldError message={errors.new_password_confirmation.message} />}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-salon-espresso text-white
              text-sm font-semibold rounded-xl hover:bg-salon-espresso/90 transition-colors
              shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {saving ? t("updating") : t("updatePassword")}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function ProfilePageContent() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const t = getPublicT(locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-2">
        <div className="w-14 h-14 rounded-full bg-salon-gold/10 flex items-center justify-center shrink-0 border-2 border-salon-gold/20">
          <UserCircle2 className="w-7 h-7 text-salon-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso leading-tight">
            {user?.name ?? user?.fullName ?? t("myProfile")}
          </h1>
          <p className="text-salon-stone text-sm mt-0.5">{user?.email}</p>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        <PersonalDetailsSection />
        <ChangePasswordSection />
      </div>
    </div>
  );
}
