"use client";

import { useRouter } from "next/navigation";

export default function AdminPortal() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🦺
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Please select an option to continue
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => router.push("/add-company")}
            className="w-full rounded-xl bg-blue-700 px-4 py-5 text-lg font-semibold text-white transition hover:bg-blue-800"
          >
            Add Company
          </button>

          <button
            type="button"
            onClick={() => router.push("/site-code")}
            className="w-full rounded-xl bg-emerald-600 px-4 py-5 text-lg font-semibold text-white transition hover:bg-emerald-700"
          >
            Observation Record
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/site-portal")}
          className="mt-6 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Site Portal
        </button>
      </section>
    </main>
  );
}