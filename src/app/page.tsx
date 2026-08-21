import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-blue-600 mb-3">
          For independent solo cleaners
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
          Run your whole cleaning business from one place
        </h1>
        <p className="text-slate-600 mb-8">
          Booking, quoting, scheduling, payments, and client texting — built
          by a solo cleaner, for solo cleaners. This is an early build.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-white text-sm font-medium hover:bg-slate-700"
          >
            Create your business account
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
