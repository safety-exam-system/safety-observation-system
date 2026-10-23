"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Site = {
  site_code: string;
  site_name: string;
};

function SiteDashboardContent() {
  const searchParams = useSearchParams();

  const siteCode = searchParams.get("siteCode") || "";
  const siteName = searchParams.get("siteName") || "";

  const [companyCode, setCompanyCode] = useState("");
  const [companySearching, setCompanySearching] = useState(false);
  const [companySearchError, setCompanySearchError] = useState("");
  const [site, setSite] = useState<Site | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);

  useEffect(() => {
    async function loadSite() {
      setSiteLoading(true);

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("sites")
          .select("site_code, site_name")
          .eq("site_code", siteCode)
          .maybeSingle();

        if (error) {
          console.error("Site loading error:", error);
          setSite(null);
          return;
        }

        setSite(data as Site | null);
      } catch (error) {
        console.error("Unexpected site loading error:", error);
        setSite(null);
      } finally {
        setSiteLoading(false);
      }
    }

    if (siteCode) {
      void loadSite();
    } else {
      setSiteLoading(false);
      setSite(null);
    }
  }, [siteCode]);

  function handleCompanyCodeChange(value: string) {
    const formattedValue = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3);

    setCompanyCode(formattedValue);
    setCompanySearchError("");
  }

  async function handleCompanySearch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setCompanySearchError("");

    if (!/^[A-Z0-9]{3}$/.test(companyCode)) {
      setCompanySearchError(
        "Please enter a valid 3-character Company Code."
      );
      return;
    }

    setCompanySearching(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("companies")
        .select("company_code")
        .eq("company_code", companyCode)
        .maybeSingle();

      if (error) {
        console.error("Company search error:", error);
        setCompanySearchError(
          "Unable to search Company Code. Please try again."
        );
        return;
      }

      if (!data) {
        setCompanySearchError(
          "Company Code not found. Please check and try again."
        );
        return;
      }

      window.location.href = `/company-dashboard?companyCode=${encodeURIComponent(
        data.company_code
      )}`;
    } catch (error) {
      console.error("Unexpected company search error:", error);
      setCompanySearchError("Something went wrong. Please try again.");
    } finally {
      setCompanySearching(false);
    }
  }

  function openObservationList(category: string) {
    const params = new URLSearchParams({
      category,
      siteCode,
      siteName: site?.site_name || siteName,
    });

    window.location.href = `/observation-list?${params.toString()}`;
  }

  if (siteLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-slate-600">Loading Site Dashboard...</p>
      </main>
    );
  }

  if (!site) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mb-4 text-4xl">⚠️</div>

          <h1 className="text-xl font-bold text-slate-900">
            Site Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            The Site Code could not be verified. Please search again.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/site-code";
            }}
            className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Back to Site Search
          </button>
        </section>
      </main>
    );
  }

  const categories = [
    {
      title: "Total Observations",
      description: "View all observations",
      icon: "📋",
      color: "border-blue-200 bg-blue-50",
      textColor: "text-blue-800",
      category: "All",
    },
    {
      title: "Unsafe Act",
      description: "View unsafe acts",
      icon: "⚠️",
      color: "border-orange-200 bg-orange-50",
      textColor: "text-orange-800",
      category: "Unsafe Act",
    },
    {
      title: "Unsafe Condition",
      description: "View unsafe conditions",
      icon: "🚧",
      color: "border-red-200 bg-red-50",
      textColor: "text-red-800",
      category: "Unsafe Condition",
    },
    {
      title: "Near Miss",
      description: "View near-miss reports",
      icon: "🦺",
      color: "border-green-200 bg-green-50",
      textColor: "text-green-800",
      category: "Near Miss",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Dashboard Header */}
        <header className="mb-6 rounded-2xl bg-blue-800 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-3xl">
            🦺
          </div>

          <p className="text-sm font-medium text-blue-100">
            Safety Observation
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Site Dashboard
          </h1>

          <div className="mt-5 rounded-xl bg-white/10 p-4">
            <p className="text-sm text-blue-100">Site Name</p>
            <h2 className="mt-1 text-xl font-bold">
              {site.site_name}
            </h2>

            <p className="mt-3 text-sm text-blue-100">Site Code</p>
            <p className="mt-1 text-lg font-semibold">
              {site.site_code}
            </p>
          </div>
        </header>

        {/* Company Search Only */}
        <section className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl">
              🏢
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Company Search
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Enter a Company Code to open the company dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleCompanySearch} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="companyCode"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Company Code
              </label>

              <input
                id="companyCode"
                type="text"
                value={companyCode}
                onChange={(event) =>
                  handleCompanyCodeChange(event.target.value)
                }
                placeholder="e.g. XYZ"
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

            {companySearchError && (
              <p
                role="alert"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                {companySearchError}
              </p>
            )}

            <button
              type="submit"
              disabled={companySearching || companyCode.length !== 3}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {companySearching ? "Searching..." : "Search Company"}
            </button>
          </form>
        </section>

        {/* Observation Categories */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Observation Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categories.map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() => openObservationList(item.category)}
                className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-lg font-bold ${item.textColor}`}>
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <span className="text-3xl" aria-hidden="true">
                    {item.icon}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="text-sm font-medium text-slate-600">
                    View Details
                  </span>

                  <span className={`text-xl font-bold ${item.textColor}`}>
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Observation totals will display actual counts after the
            observation database is connected.
          </p>
        </section>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/site-code";
          }}
          className="mt-7 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to Site Search
        </button>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Safety Observation System
        </footer>
      </div>
    </main>
  );
}

export default function SiteDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-slate-600">Loading Dashboard...</p>
        </main>
      }
    >
      <SiteDashboardContent />
    </Suspense>
  );
}