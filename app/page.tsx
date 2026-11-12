"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 font-sans text-slate-900 sm:px-8">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-12">

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-700 text-4xl text-white">
              🦺
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Safety Observation
            </h1>

            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Safety Observation Management
            </p>
          </div>

          {/* All Sites Dashboard */}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/login";
            }}
            className="mx-auto mb-4 flex min-h-14 w-full max-w-md items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-800"
          >
            All Sites Dashboard
            <span className="ml-3" aria-hidden="true">
              →
            </span>
          </button>

          {/* All Sites */}
          <button
            type="button"
            onClick={() => {
  window.location.href = "/all-sites";
}}
            className="mx-auto flex min-h-14 w-full max-w-md items-center justify-center rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700"
          >
            All Sites
            <span className="ml-3" aria-hidden="true">
              →
            </span>
          </button>

          <div className="mt-10 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
            Safety Observation
          </div>

        </div>
      </div>
    </main>
  );
}