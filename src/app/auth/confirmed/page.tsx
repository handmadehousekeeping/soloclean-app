"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finishSetup() {
      const supabase = createClient();

      // The Supabase client auto-detects the session from the confirmation
      // link's URL on load, but that can take a beat — poll briefly rather
      // than assuming it's ready on the very first render.
      let user = null;
      for (let attempt = 0; attempt < 10 && !user; attempt++) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
        if (!user) await new Promise((r) => setTimeout(r, 300));
      }

      if (!user) {
        setStatus("error");
        setError(
          "That confirmation link didn't work — it may have expired. Try signing up again."
        );
        return;
      }

      // Already has a profile (e.g. they clicked the link twice) — just go in.
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (existingProfile) {
        router.push("/dashboard");
        return;
      }

      const fullName = (user.user_metadata?.full_name as string) ?? "";
      const businessName = (user.user_metadata?.business_name as string) ?? "";

      const { error: rpcError } = await supabase.rpc(
        "create_business_and_owner_profile",
        { business_name: businessName, owner_full_name: fullName }
      );

      if (rpcError) {
        setStatus("error");
        setError(rpcError.message);
        return;
      }

      router.push("/dashboard");
    }

    finishSetup();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm text-center">
        {status === "working" && (
          <p className="text-sm text-slate-500">Finishing setup...</p>
        )}
        {status === "error" && (
          <div className="border border-slate-200 rounded-lg p-8">
            <h1 className="text-lg font-semibold text-slate-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
