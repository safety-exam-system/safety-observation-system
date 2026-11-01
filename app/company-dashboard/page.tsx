"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Company = {
  id: string;
  company_code: string;
  company_name: string;
};

type Site = {
  site_code: string;
  site_name: string;
};

type Observation = {
  id: string | number;
  site_code: string | null;
  category: string | null;
  observation_date: string | null;
  submitted_by: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  violation_company?: string | null;
  contractor_name?: string | null;
  observer_company?: string | null;
  near_miss_company_name?: string | null;
};

const CATEGORIES = [
  {
    title: "Total Observations",
    category: "All",
    icon: "📋",
    color: "border-blue-200 bg-blue-50",
    textColor: "text-blue-800",
  },
  {
    title: "Unsafe Act",
    category: "Unsafe Act",
    icon: "⚠️",
    color: "border-orange-200 bg-orange-50",
    textColor: "text-orange-800",
  },
  {
    title: "Unsafe Condition",
    category: "Unsafe Condition",
    icon: "🚧",
    color: "border-red-200 bg-red-50",
    textColor: "text-red-800",
  },
  {
    title: "Near Miss",
    category: "Near Miss",
    icon: "🦺",
    color: "border-green-200 bg-green-50",
    textColor: "text-green-800",
  },
];

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function matchesCompany(
  observation: Observation,
  companyName: string
) {
  const name = normalize(companyName);

  if (!name) return false;

  switch (observation.category) {
    case "Unsafe Act": {
      const violationCompany = normalize(
        observation.violation_company
      );

      if (violationCompany === "contractor") {
        return normalize(observation.contractor_name) === name;
      }

      return violationCompany === name;
    }

    case "Unsafe Condition":
      return normalize(observation.observer_company) === name;

    case "Near Miss":
      return normalize(observation.near_miss_company_name) === name;

    default:
      return false;
  }
}

function CompanyDashboardContent() {
  const searchParams = useSearchParams();
  const companyCode = (searchParams.get("companyCode") || "").trim().toUpperCase();

  const [supabase] = useState(() => createClient());

  const [company, setCompany] = useState<Company | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!/^[A-Z0-9]{3}$/.test(companyCode)) {
        setError("Invalid Company Code. Please search again.");
        return;
      }

      // 1. Find the company using its existing Company Code.
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, company_code, company_name")
        .eq("company_code", companyCode)
        .maybeSingle();

      if (companyError) throw companyError;

      if (!companyData) {
        setError("Company not found. Please check the Company Code.");
        return;
      }

      const currentCompany = companyData as Company;
      setCompany(currentCompany);

      // 2. Find sites linked to this company.
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("site_code, site_name")
        .eq("company_id", currentCompany.id);

      if (siteError) throw siteError;

      const companySites = (siteData || []) as Site[];
      setSites(companySites);

      // 3. Load observations independently of the site-company link.
      // Observation records contain the actual company name in
      // category-specific fields, so a site link is not required
      // to identify the company's observations.
      const { data: observationData, error: observationError } =
        await supabase
          .from("observations")
          .select(
            [
              "id",
              "site_code",
              "category",
              "observation_date",
              "submitted_by",
              "description",
              "status",
              "created_at",
              "violation_company",
              "contractor_name",
              "observer_company",
              "near_miss_company_name",
            ].join(",")
          )
          .in("category", [
            "Unsafe Act",
            "Unsafe Condition",
            "Near Miss",
          ])
          .order("observation_date", { ascending: false });

      if (observationError) throw observationError;

      // 4. Count only observations matching this company's name.
      const companyObservations: Observation[] = (
        (observationData || []) as unknown as Observation[]
      ).filter((observation) =>
        matchesCompany(observation, currentCompany.company_name)
      );

      setObservations(companyObservations);
    } catch (err) {
      console.error("Company dashboard loading error:", err);
      setError(
        "Unable to load Company Dashboard data. Please check the database table and permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [companyCode, supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const getObservationDate = (observation: Observation) =>
    observation.observation_date || observation.created_at || "";

  const years = Array.from(
    new Set(
      observations
        .map((observation) => getObservationDate(observation))
        .filter(Boolean)
        .map((date) => date.slice(0, 4))
    )
  ).sort((a, b) => b.localeCompare(a));

  const filteredObservations = observations.filter((observation) => {
    const date = getObservationDate(observation);
    const year = date ? date.slice(0, 4) : "";
    const month = date ? date.slice(5, 7) : "";

    const matchesYear = selectedYear === "All" || year === selectedYear;
    const matchesMonth =
      selectedMonth === "All" || month === selectedMonth;

    return matchesYear && matchesMonth;
  });

  const countCategory = (category: string) =>
    filteredObservations.filter(
      (observation) =>
        category === "All" || observation.category === category
    ).length;

  const normalizedStatus = (status: string | null) =>
    (status || "").trim().toLowerCase();

  const openCount = filteredObservations.filter(
    (observation) => normalizedStatus(observation.status) === "open"
  ).length;

  const closedCount = filteredObservations.filter(
    (observation) => normalizedStatus(observation.status) === "closed"
  ).length;

  function openObservationList(category: string, status = "All") {
    const params = new URLSearchParams({
      companyCode,
      category,
      status,
      year: selectedYear === "All" ? "" : selectedYear,
      month: selectedMonth === "All" ? "" : selectedMonth,
    });

    window.location.href = `/company-observation-list?${params.toString()}`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <p className="text-lg font-semibold text-slate-700">
          Loading Company Dashboard...
        </p>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-red-700">
            Company Dashboard
          </h1>

          <p role="alert" className="mb-6 text-slate-700">
            {error || "Company information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/company-code";
            }}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Back to Company Search
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Company Information */}
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-md sm:p-8">
          <div className="mb-4 text-center text-4xl">🏢</div>

          <h1 className="text-center text-3xl font-bold text-slate-900">
            Safety Observation
          </h1>

          <p className="mt-2 text-center text-slate-600">
            Company Dashboard
          </p>

          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Company Name
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {company.company_name}
            </h2>

            <p className="mt-3 text-slate-700">
              <span className="font-semibold">Company Code:</span>{" "}
              {company.company_code}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Linked Site{sites.length === 1 ? "" : "s"}
            </p>

            {sites.length > 0 ? (
              sites.map((site) => (
                <p key={site.site_code} className="mt-2 text-slate-800">
                  {site.site_name} ({site.site_code})
                </p>
              ))
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No site is currently linked to this company.
              </p>
            )}
          </div>
        </header>

        {/* Year and Month Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Observation Period
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Year
              </label>

              <select
                id="year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="month"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Month
              </label>

              <select
                id="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Months</option>
                {[
                  ["01", "January"],
                  ["02", "February"],
                  ["03", "March"],
                  ["04", "April"],
                  ["05", "May"],
                  ["06", "June"],
                  ["07", "July"],
                  ["08", "August"],
                  ["09", "September"],
                  ["10", "October"],
                  ["11", "November"],
                  ["12", "December"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Category Dashboard */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Observation Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORIES.map((item) => (
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
                      Tap to view observation records
                    </p>
                  </div>

                  <span className="text-3xl" aria-hidden="true">
                    {item.icon}
                  </span>
                </div>

                <p className={`mt-5 text-4xl font-bold ${item.textColor}`}>
                  {countCategory(item.category)}
                </p>

                <div className="mt-4 border-t border-black/10 pt-3 text-sm font-semibold text-slate-700">
                  View Details →
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Open and Closed Counts */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Observation Status
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openObservationList("All", "Open")}
              className="rounded-2xl border border-orange-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            >
              <p className="font-semibold text-slate-700">
                Open Observations
              </p>

              <p className="mt-3 text-4xl font-bold text-orange-600">
                {openCount}
              </p>

              <p className="mt-3 text-sm font-medium text-slate-600">
                View Open Records →
              </p>
            </button>

            <button
              type="button"
              onClick={() => openObservationList("All", "Closed")}
              className="rounded-2xl border border-green-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            >
              <p className="font-semibold text-slate-700">
                Closed Observations
              </p>

              <p className="mt-3 text-4xl font-bold text-green-700">
                {closedCount}
              </p>

              <p className="mt-3 text-sm font-medium text-slate-600">
                View Closed Records →
              </p>
            </button>
          </div>
        </section>

        {/* Monthly Summary */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Month-wise Observation Report
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Counts for the selected year, grouped by month.
          </p>

          <div className="mt-5 space-y-3">
            {[
              ["01", "January"],
              ["02", "February"],
              ["03", "March"],
              ["04", "April"],
              ["05", "May"],
              ["06", "June"],
              ["07", "July"],
              ["08", "August"],
              ["09", "September"],
              ["10", "October"],
              ["11", "November"],
              ["12", "December"],
            ]
              .filter(
                ([month]) =>
                  selectedMonth === "All" || selectedMonth === month
              )
              .map(([month, label]) => {
                const monthObservations = observations.filter(
                  (observation) => {
                    const date = getObservationDate(observation);

                    return (
                      date &&
                      date.slice(5, 7) === month &&
                      (selectedYear === "All" ||
                        date.slice(0, 4) === selectedYear)
                    );
                  }
                );

                const unsafeAct = monthObservations.filter(
                  (observation) => observation.category === "Unsafe Act"
                ).length;

                const unsafeCondition = monthObservations.filter(
                  (observation) =>
                    observation.category === "Unsafe Condition"
                ).length;

                const nearMiss = monthObservations.filter(
                  (observation) => observation.category === "Near Miss"
                ).length;

                return (
                  <div
                    key={month}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-slate-900">{label}</h3>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                        Total: {monthObservations.length}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <p className="rounded-lg bg-orange-50 p-3 text-orange-800">
                        Unsafe Act: <strong>{unsafeAct}</strong>
                      </p>

                      <p className="rounded-lg bg-red-50 p-3 text-red-800">
                        Unsafe Condition: <strong>{unsafeCondition}</strong>
                      </p>

                      <p className="rounded-lg bg-green-50 p-3 text-green-800">
                        Near Miss: <strong>{nearMiss}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth(month);

                        const params = new URLSearchParams({
                          companyCode,
                          category: "All",
                          status: "All",
                          year: selectedYear === "All" ? "" : selectedYear,
                          month,
                        });

                        window.location.href =
                          `/company-observation-list?${params.toString()}`;
                      }}
                      className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      View this month&apos;s observations →
                    </button>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Refresh */}
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-8 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800"
        >
          Refresh Dashboard
        </button>

        {/* Back */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/company-code";
          }}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to Company Search
        </button>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Safety Observation System
        </footer>
      </div>
    </main>
  );
}

export default function CompanyDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <p className="text-lg font-semibold text-slate-700">
            Loading Company Dashboard...
          </p>
        </main>
      }
    >
      <CompanyDashboardContent />
    </Suspense>
  );
}