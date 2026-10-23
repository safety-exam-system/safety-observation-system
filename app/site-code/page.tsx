"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase";

type Site = {
  site_code: string;
  site_name: string;
};

export default function SiteCodePage() {
  const [siteCode, setSiteCode] = useState("");
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCodeChange(value: string) {
    const formattedValue = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3);

    setSiteCode(formattedValue);
    setSite(null);
    setError("");
  }

  async function handleSearch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSite(null);
    setError("");

    if (!/^[A-Z0-9]{3}$/.test(siteCode)) {
      setError("Please enter a valid 3-character Site Code.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: searchError } = await supabase
        .from("sites")
        .select("site_code, site_name")
        .eq("site_code", siteCode)
        .maybeSingle();

      if (searchError) {
        console.error("Site search error:", searchError);
        setError("Unable to search Site Code. Please try again.");
        return;
      }

      if (!data) {
        setError("Site Code not found. Please check and try again.");
        return;
      }

      setSite(data as Site);
    } catch (err) {
      console.error("Unexpected site search error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openSiteDashboard() {
    if (!site) return;

    const params = new URLSearchParams({
      siteCode: site.site_code,
      siteName: site.site_name,
    });

    window.location.href = `/site-dashboard?${params.toString()}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🦺
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Safety Observation
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Enter your 3-character Site Code
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-5">
          <div>
            <label
              htmlFor="siteCode"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Site Code
            </label>

            <input
              id="siteCode"
              type="text"
              value={siteCode}
              onChange={(event) =>
                handleCodeChange(event.target.value)
              }
              placeholder="e.g. A12"
              maxLength={3}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl font-bold uppercase tracking-[0.3em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />

            <p className="mt-2 text-xs text-slate-500">
              3 characters only — A–Z and 0–9
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || siteCode.length !== 3}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search Site"}
          </button>
        </form>

        {site && (
          <button
            type="button"
            onClick={openSiteDashboard}
            className="mt-6 w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left transition hover:border-green-400 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label={`Open dashboard for ${site.site_name}`}
          >
            <p className="text-sm font-medium text-green-700">
              Site Found
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {site.site_name}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Site Code: {site.site_code}
            </p>

            <p className="mt-3 text-sm font-semibold text-green-800">
              Tap here to open Dashboard →
            </p>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin-dashboard";
          }}
          className="mt-5 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Login
        </button>
      </section>
    </main>
  );
}