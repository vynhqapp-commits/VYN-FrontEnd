"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { staffInvitationsApi } from "@/lib/api";
import { Check, Eye, EyeOff, Loader2, ShieldAlert, PartyPopper } from "lucide-react";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation link. Please check the URL from your email.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    const { error: apiError } = await staffInvitationsApi.accept({
      token,
      name,
      password,
      password_confirmation: passwordConfirmation,
    });
    setLoading(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#111827] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#151d2e]/80 border border-[#1e293b] rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto size-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
              <PartyPopper className="size-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Aboard!</h1>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Your account has been created successfully. You can now sign in with your email and password.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#111827] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto size-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            <Check className="size-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Accept Your Invitation</h1>
          <p className="text-sm text-zinc-400">Set up your account to get started</p>
        </div>

        {/* Card */}
        <div className="bg-[#151d2e]/80 border border-[#1e293b] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/15 mb-6">
              <ShieldAlert className="size-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300/90 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full h-11 bg-[#0d1525] border border-[#1e293b] rounded-xl px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full h-11 bg-[#0d1525] border border-[#1e293b] rounded-xl px-4 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                placeholder="Repeat your password"
                className="w-full h-11 bg-[#0d1525] border border-[#1e293b] rounded-xl px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token || !name.trim() || !password}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Accept"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          By accepting, you agree to the platform&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}

export default function AcceptStaffInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#111827] flex items-center justify-center">
        <Loader2 className="size-8 text-blue-400 animate-spin" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
