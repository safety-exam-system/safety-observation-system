"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Site = {
  id: string;
  site_code: string;
  site_name: string;
};

type ObservationCountRow = {
  category: string | null;
  status: string | null;
  observation_date: string | null;
  created_at: string | null;
};

type ObservationCounts = {
  total: number;
  unsafeAct: number;
  unsafeCondition: number;
  nearMiss: number;
  open: number;
  close: number;
};

const INITIAL_COUNTS: ObservationCounts = {
  total: 0,
  unsafeAct: 0,
  unsafeCondition: 0,
  nearMiss: 0,
  open: 0,
  close: 0,
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

  const [observationCounts, setObservationCounts] =
    useState<ObservationCounts>(INITIAL_COUNTS);

  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
const [selectedMonth, setSelectedMonth] = useState("All");
const [monthlyObservations, setMonthlyObservations] = useState<
  ObservationCountRow[]
>([]);

  // Load and verify the selected Site.
  useEffect(() => {
    let cancelled = false;

    async function loadSite() {
      setSiteLoading(true);

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("sites")
          .select("id, site_code, site_name")
          .eq("site_code", siteCode)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Site loading error:", error);
          setSite(null);
          return;
        }

        setSite(data as Site | null);
      } catch (error) {
        console.error("Unexpected site loading error:", error);

        if (!cancelled) {
          setSite(null);
        }
      } finally {
        if (!cancelled) {
          setSiteLoading(false);
        }
      }
    }

    if (siteCode) {
      void loadSite();
    } else {
      setSiteLoading(false);
      setSite(null);
    }

    return () => {
      cancelled = true;
    };
  }, [siteCode]);

  // Load actual observation counts for the selected Site.
  useEffect(() => {
    let cancelled = false;

    async function loadObservationCounts() {
      setCountsLoading(true);
      setCountsError("");
      setObservationCounts(INITIAL_COUNTS);

      if (!siteCode) {
        setCountsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("observations")
          .select("category, status, observation_date, created_at")
          .eq("site_code", siteCode);

        console.log("Observation rows:", data);
        console.log("Observation query error:", error);

        if (cancelled) return;

        if (error) {
          console.error("Observation count loading error:", error);

          setCountsError(
            "Unable to load observation counts. Please try again."
          );

          return;
        }

        const rows = (data ?? []) as ObservationCountRow[];
        setMonthlyObservations(rows);

        const counts: ObservationCounts = {
          total: rows.length,
          unsafeAct: 0,
          unsafeCondition: 0,
          nearMiss: 0,
          open: 0,
          close: 0,
        };

        for (const row of rows) {
          const category = (row.category ?? "").trim().toLowerCase();
          const status = (row.status ?? "").trim().toLowerCase();

          if (category === "unsafe act") {
            counts.unsafeAct++;
          } else if (category === "unsafe condition") {
            counts.unsafeCondition++;
          } else if (category === "near miss") {
            counts.nearMiss++;
          }

          if (status === "open") {
            counts.open++;
          } else if (status === "close" || status === "closed") {
            counts.close++;
          }
        }

        setObservationCounts(counts);
      } catch (error) {
        console.error("Unexpected observation count error:", error);

        if (!cancelled) {
          setCountsError(
            "Something went wrong while loading observation counts."
          );
        }
      } finally {
        if (!cancelled) {
          setCountsLoading(false);
        }
      }
    }

    void loadObservationCounts();

    return () => {
      cancelled = true;
    };
  }, [siteCode]);

  function handleCompanyCodeChange(value: string) {
    const formattedValue = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3);

    setCompanyCode(formattedValue);
    setCompanySearchError("");
  }

  // Search only Active Companies belonging to the selected Site.
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

    if (!site?.id) {
      setCompanySearchError(
        "Site information is unavailable. Please try again."
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
        .eq("site_id", site.id)
        .eq("is_active", true)
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
          "Company Code not found in this Site. Please check and try again."
        );

        return;
      }

      const params = new URLSearchParams({
        companyCode: data.company_code,
        siteCode: site.site_code,
        siteName: site.site_name,
      });

      window.location.href = `/company-dashboard?${params.toString()}`;
    } catch (error) {
      console.error("Unexpected company search error:", error);

      setCompanySearchError(
        "Something went wrong. Please try again."
      );
    } finally {
      setCompanySearching(false);
    }
  }

  function openObservationList(category: string, status?: string) {
    const params = new URLSearchParams({
      category,
      siteCode,
      siteName: site?.site_name || siteName,
    });

    if (status) {
      params.set("status", status);
    }

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
    const params = new URLSearchParams({
      siteCode,
      siteName,
    });

    window.location.href = `/site-portal?${params.toString()}`;
  }}
  className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
>
  Back to Site Portal
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
      count: observationCounts.total,
    },
    {
      title: "Unsafe Act",
      description: "View unsafe acts",
      icon: "⚠️",
      color: "border-orange-200 bg-orange-50",
      textColor: "text-orange-800",
      category: "Unsafe Act",
      count: observationCounts.unsafeAct,
    },
    {
      title: "Unsafe Condition",
      description: "View unsafe conditions",
      icon: "🚧",
      color: "border-red-200 bg-red-50",
      textColor: "text-red-800",
      category: "Unsafe Condition",
      count: observationCounts.unsafeCondition,
    },
    {
      title: "Near Miss",
      description: "View near-miss reports",
      icon: "🦺",
      color: "border-green-200 bg-green-50",
      textColor: "text-green-800",
      category: "Near Miss",
      count: observationCounts.nearMiss,
    },
  ];
const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getMonthlyDate = (observation: ObservationCountRow) =>
    observation.observation_date || observation.created_at || "";

  const availableYears = Array.from(
    new Set(
      monthlyObservations
        .map((observation) => getMonthlyDate(observation).slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year))
    )
  ).sort((a, b) => Number(b) - Number(a));

  const monthlySummary = monthNames
    .map((monthName, index) => {
      const monthNumber = String(index + 1).padStart(2, "0");

      const monthRows = monthlyObservations.filter((observation) => {
        const date = getMonthlyDate(observation);

        const yearMatches =
          selectedYear === "All" || date.slice(0, 4) === selectedYear;

        const monthMatches = date.slice(5, 7) === monthNumber;

        return yearMatches && monthMatches;
      });

      return {
        month: monthName,
        unsafeAct: monthRows.filter(
          (item) => item.category === "Unsafe Act"
        ).length,
        unsafeCondition: monthRows.filter(
          (item) => item.category === "Unsafe Condition"
        ).length,
        nearMiss: monthRows.filter(
          (item) => item.category === "Near Miss"
        ).length,
        total: monthRows.length,
      };
    })
    .filter(
      (item) => selectedMonth === "All" || item.month === selectedMonth
    );
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

        {/* Company Search */}
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

          <form
            onSubmit={handleCompanySearch}
            className="mt-5 space-y-4"
          >
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

        {/* Observation Categories and Actual Counts */}
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

                <div className={`mt-4 text-3xl font-bold ${item.textColor}`}>
                  {countsLoading
                    ? "..."
                    : countsError
                      ? "—"
                      : item.count}
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

          {countsError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
            >
              {countsError}
            </p>
          )}

          {/* Open and Closed Observation Summary */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openObservationList("All", "Open")}
              className="rounded-2xl border border-amber-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-medium text-slate-600">
                Open Observations
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {countsLoading
                  ? "..."
                  : countsError
                    ? "—"
                    : observationCounts.open}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-amber-100 pt-3">
                <span className="text-sm font-medium text-slate-600">
                  View Open Observations
                </span>

                <span className="text-xl font-bold text-amber-700">
                  →
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openObservationList("All", "Close")}
              className="rounded-2xl border border-green-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-medium text-slate-600">
                Closed Observations
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {countsLoading
                  ? "..."
                  : countsError
                    ? "—"
                    : observationCounts.close}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-green-100 pt-3">
                <span className="text-sm font-medium text-slate-600">
                  View Closed Observations
                </span>

                <span className="text-xl font-bold text-green-700">
                  →
                </span>
              </div>
            </button>
          </div>
        </section>
{/* Monthly Summary */}
<section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
  <div className="mb-5">
    <h2 className="text-xl font-bold text-gray-800">
      Month-wise Observation Report
    </h2>
    <p className="mt-1 text-sm text-gray-500">
      Monthly observation summary for all companies at this site.
    </p>
  </div>

  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Select Year
      </label>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        className="w-full rounded-lg border border-gray-300 p-2.5"
      >
        <option value="All">All Years</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Select Month
      </label>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full rounded-lg border border-gray-300 p-2.5"
      >
        <option value="All">All Months</option>
        {monthNames.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="space-y-3">
    {monthlySummary.map((item) => (
      <div
        key={item.month}
        className="rounded-lg border border-gray-200 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{item.month}</h3>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
            Total: {item.total}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-orange-50 p-2">
            <p className="text-xs text-orange-700">UA</p>
            <p className="text-lg font-bold text-orange-800">
              {item.unsafeAct}
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-2">
            <p className="text-xs text-red-700">UC</p>
            <p className="text-lg font-bold text-red-800">
              {item.unsafeCondition}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-xs text-green-700">Near Miss</p>
            <p className="text-lg font-bold text-green-800">
              {item.nearMiss}
            </p>
          </div>
        </div>
      </div>
    ))}

    {monthlySummary.length === 0 && (
      <p className="py-5 text-center text-sm text-gray-500">
        No monthly observations found.
      </p>
    )}
  </div>
</section>
        {/* Back Button */}
<button
  type="button"
  onClick={() => {
    const params = new URLSearchParams({
      siteCode: site.site_code,
      siteName: site.site_name,
    });

    window.location.href = `/site-portal?${params.toString()}`;
  }}
  className="mt-7 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
>
  ← Back to Site Portal
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