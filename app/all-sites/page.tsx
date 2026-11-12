"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Site = {
  id: string;
  site_code: string;
  site_name: string;
};

export default function AllSitesPage() {
  const router = useRouter();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSites() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/public-sites", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load Sites.");
        }

        if (!cancelled) {
          setSites(result.sites ?? []);
        }
      } catch (err) {
        console.error("Site loading error:", err);

        if (!cancelled) {
          setError("Unable to load Sites. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSites();

    return () => {
      cancelled = true;
    };
  }, []);

  function openSite(site: Site) {
    const params = new URLSearchParams({
      siteCode: site.site_code,
      siteName: site.site_name,
    });

    router.push(`/all-sites/options?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">

        <header className="mb-6 rounded-2xl bg-blue-800 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-3xl">
            🦺
          </div>

          <p className="text-sm font-medium text-blue-100">
            Safety Observation
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            All Sites
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            Select a Site to continue.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Registered Sites
          </h2>

          {loading && (
            <p className="py-10 text-center text-slate-600">
              Loading Sites...
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 block w-full font-semibold underline"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && sites.length === 0 && (
            <p className="py-10 text-center text-slate-500">
              No registered Sites found.
            </p>
          )}

          {!loading && !error && sites.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => openSite(site)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {site.site_name}
                      </h3>

                      <p className="mt-2 text-sm font-semibold tracking-wider text-blue-700">
                        SITE CODE: {site.site_code}
                      </p>
                    </div>

                    <span className="text-2xl text-blue-700">
                      →
                    </span>
                  </div>

                  <p className="mt-4 border-t border-slate-200 pt-3 text-sm font-medium text-slate-600">
                    Select Site
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to Home
        </button>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Safety Observation System
        </footer>

      </div>
    </main>
  );
}