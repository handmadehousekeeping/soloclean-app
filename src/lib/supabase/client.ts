import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Safe to use in Client Components.
// Row Level Security (see the core_multi_tenant_foundation migration) is what
// actually enforces tenant isolation — this client just carries the logged-in
// user's session so the database knows who's asking.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
