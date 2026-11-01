"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SitePortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const siteCode = searchParams.get("siteCode") || "";
  const siteName = searchParams.get("siteName") || "";

  const siteParams = new URLSearchParams({
    siteCode,
    siteName,
  }).toString();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🦺
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to {siteName || "Site"} Site Portal
          </h1>

          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-blue-700">
            Site Code: {siteCode || "---"}
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => router.push(`/site-dashboard?${siteParams}`)}
            className="w-full rounded-xl bg-blue-700 px-4 py-6 text-lg font-semibold text-white transition hover:bg-blue-800"
          >
            Site Dashboard
          </button>

          <button
            type="button"
            onClick={() => router.push(`/observation-portal?${siteParams}`)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-6 text-lg font-semibold text-white transition hover:bg-emerald-700"
          >
            Upload Observation
          </button>

          <button
            type="button"
            onClick={() => router.push(`/add-company?${siteParams}`)}
            className="w-full rounded-xl bg-indigo-700 px-4 py-6 text-lg font-semibold text-white transition hover:bg-indigo-800"
          >
            Add New Company
          </button>

          <button
            type="button"
            onClick={() => router.push(`/delete-company?${siteParams}`)}
            className="w-full rounded-xl bg-red-600 px-4 py-6 text-lg font-semibold text-white transition hover:bg-red-700"
          >
            Delete Company
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/site-selection")}
          className="mt-6 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Site Selection
        </button>

      </section>
    </main>
  );
}

export default function SitePortalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-slate-600">Loading Site Portal...</p>
        </main>
      }
    >
      <SitePortalContent />
    </Suspense>
  );
}