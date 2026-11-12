"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SiteOptionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const siteCode = searchParams.get("siteCode") || "";
  const siteName = searchParams.get("siteName") || "";

  function openAdminDashboard() {
    const params = new URLSearchParams({
      siteCode,
    });

    router.push(`/site-admin-login?${params.toString()}`);
  }

  function openObservation() {
  const params = new URLSearchParams({
    siteCode,
    siteName,
    returnTo: "/all-sites/options",
  });

  router.push(`/observation-portal?${params.toString()}`);
}

  if (!siteCode || !siteName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Site Information Missing
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Please select a Site again.
          </p>

          <button
            type="button"
            onClick={() => router.push("/all-sites")}
            className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Back to All Sites
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center">

        <header className="mb-8 rounded-2xl bg-blue-800 p-6 text-white shadow-lg sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {siteName}
          </h1>

          <p className="mt-3 text-sm font-semibold tracking-wider text-blue-100">
            SITE CODE: {siteCode}
          </p>
        </header>

        <section className="space-y-5">

          {/* Admin Login */}
          <button
            type="button"
            onClick={openAdminDashboard}
            className="flex min-h-28 w-full items-center justify-between rounded-2xl border border-blue-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-3xl">
                📊
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Admin Login
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Login to manage Site observations.
                </p>
              </div>
            </div>

            <span className="ml-3 text-2xl font-bold text-blue-700">
              →
            </span>
          </button>

          {/* Upload Observation */}
          <button
            type="button"
            onClick={openObservation}
            className="flex min-h-28 w-full items-center justify-between rounded-2xl border border-green-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-green-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-green-100 text-3xl">
                📝
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload Observation
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Submit Unsafe Act, Unsafe Condition or Near Miss.
                </p>
              </div>
            </div>

            <span className="ml-3 text-2xl font-bold text-green-700">
              →
            </span>
          </button>

        </section>

        <button
          type="button"
          onClick={() => router.push("/all-sites")}
          className="mt-7 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to All Sites
        </button>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Safety Observation System
        </footer>

      </div>
    </main>
  );
}

export default function SiteOptionsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-slate-600">Loading...</p>
        </main>
      }
    >
      <SiteOptionsContent />
    </Suspense>
  );
}