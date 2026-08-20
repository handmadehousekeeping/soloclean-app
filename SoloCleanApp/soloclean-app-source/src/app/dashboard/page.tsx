import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS scopes this to the logged-in user's own business row automatically.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, business_id, businesses(name)")
    .eq("id", user.id)
    .single();

  const businessName = (profile?.businesses as { name?: string } | null)
    ?.name;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {profile?.full_name ?? user.email}
            </h1>
          </div>
          <LogoutButton />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <p className="text-sm text-slate-500 mb-1">Business</p>
          <p className="text-lg font-medium text-slate-900 mb-4">
            {businessName ?? "—"}
          </p>
          <p className="text-sm text-slate-500 mb-1">Role</p>
          <p className="text-lg font-medium text-slate-900 mb-4 capitalize">
            {profile?.role ?? "—"}
          </p>
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4 mt-4">
            This data is scoped to your business by database-level Row Level
            Security — no other business's data can ever appear here. Booking,
            scheduling, and the rest of the app get built out from here.
          </p>
        </div>
      </div>
    </main>
  );
}
