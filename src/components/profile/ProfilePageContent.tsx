"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Save, UserCircle2 } from "lucide-react";
import { profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Schemas ───────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  name:  z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(30).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    current_password:          z.string().min(1, "Current password is required"),
    new_password:              z.string().min(8, "Minimum 8 characters"),
    new_password_confirmation: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.new_password_confirmation, {
    message: "Passwords do not match",
    path: ["new_password_confirmation"],
  });

type DetailsForm = z.infer<typeof detailsSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

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
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-salon-espresso bg-white
        focus:outline-none focus:ring-2 focus:ring-salon-gold/30 transition-colors
        placeholder:text-gray-300
        ${error ? "border-red-300 bg-red-50/30" : "border-salon-sand/60 hover:border-salon-sand"}
        ${props.disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : ""}
        ${className}`}
    />
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
  const [saving, setSaving] = useState(false);

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

  // When user data loads (after a page refresh, auth context re-hydrates from /api/me),
  // reset the form so phone and other fields reflect the latest server values.
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

    if (error) {
      toast.error(error);
      return;
    }

    if (data?.user) {
      setUser(data.user);
      // Sync form with the freshly-saved values so isDirty resets to false
      reset({
        name:  data.user.name  ?? "",
        email: data.user.email ?? "",
        phone: data.user.phone ?? "",
      });
    }
    toast.success("Profile updated successfully");
  };

  return (
    <SectionCard
      icon={<UserCircle2 className="w-4.5 h-4.5 text-salon-gold" />}
      iconBg="bg-salon-gold/10"
      title="Personal Details"
      subtitle="Update your name, email address, and phone number."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <TextInput
              {...register("name")}
              placeholder="Your full name"
              error={!!errors.name}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div>
            <FieldLabel>Phone number <span className="normal-case font-normal">(optional)</span></FieldLabel>
            <TextInput
              {...register("phone")}
              type="tel"
              placeholder="+1 555 000 0000"
              error={!!errors.phone}
            />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        <div>
          <FieldLabel>Email address</FieldLabel>
          <TextInput
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            error={!!errors.email}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-salon-gold text-white
              text-sm font-semibold rounded-xl hover:bg-salon-goldLight transition-colors
              shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [saving, setSaving]         = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    toast.success("Password changed successfully");
    reset();
  };

  function PasswordField({
    id,
    label,
    show,
    onToggle,
    placeholder,
    error,
    ...rest
  }: {
    id: string;
    label: string;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    error?: boolean;
  } & ReturnType<typeof register>) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="relative">
          <TextInput
            {...rest}
            id={id}
            type={show ? "text" : "password"}
            placeholder={placeholder}
            error={error}
            className="pr-11"
          />
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
      title="Change Password"
      subtitle="Choose a strong password of at least 8 characters."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordField
            {...register("current_password")}
            id="current_password"
            label="Current password"
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="••••••••"
            error={!!errors.current_password}
          />
          <div /> {/* spacer */}

          <PasswordField
            {...register("new_password")}
            id="new_password"
            label="New password"
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="Min. 8 characters"
            error={!!errors.new_password}
          />

          <PasswordField
            {...register("new_password_confirmation")}
            id="new_password_confirmation"
            label="Confirm new password"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="Repeat new password"
            error={!!errors.new_password_confirmation}
          />
        </div>

        {/* Inline validation errors */}
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
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function ProfilePageContent() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4 pb-2">
        <div className="w-14 h-14 rounded-full bg-salon-gold/10 flex items-center justify-center shrink-0 border-2 border-salon-gold/20">
          <UserCircle2 className="w-7 h-7 text-salon-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso leading-tight">
            {user?.name ?? user?.fullName ?? "My Profile"}
          </h1>
          <p className="text-salon-stone text-sm mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Two sections stacked, capped at a readable max-width */}
      <div className="max-w-3xl space-y-5">
        <PersonalDetailsSection />
        <ChangePasswordSection />
      </div>
    </div>
  );
}
