"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Create the auth user. Full name / business name ride along as user
    // metadata so they survive the email-confirmation round trip (the page
    // reloads fresh when the confirmation link is clicked, so React state
    // from this form won't be there anymore).
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    if (!signUpData.session) {
      // Email confirmation is required and no session exists yet — the
      // business/profile gets created on /auth/confirmed once they click
      // the link in their email.
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    // Confirmation isn't required on this project (or it's already been
    // satisfied) — we have a real session right now, so finish setup
    // immediately instead of making them wait on an email.
    const { error: rpcError } = await supabase.rpc(
      "create_business_and_owner_profile",
      { business_name: businessName, owner_full_name: fullName }
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  if (awaitingConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm text-center border border-slate-200 rounded-lg p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Confirm Email
          </h1>
          <p className="text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>. Follow
            the link in your email to complete setup of{" "}
            {businessName || "your business"}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 border border-slate-200 rounded-lg p-8"
      >
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Create your business account
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          This sets up your own isolated business — nothing you enter here is
          visible to any other cleaner on the platform.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Business name
          </label>
          <input
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Business Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirm Password
          </label>
          <input
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
