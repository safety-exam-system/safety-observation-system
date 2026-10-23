"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Observation = {
  id: number;
  date: string;
  name: string;
  status: "Open" | "Close";
  description: string;
};

function ObservationListContent() {
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "Unsafe Act";
  const siteName = searchParams.get("siteName") || "Site Dashboard";
  const siteCode = searchParams.get("siteCode") || "";

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // UI preview only. Real database records will be connected later.
  const observations: Observation[] = [];

  const years = useMemo(() => {
    return Array.from(
      new Set(observations.map((item) => item.date.slice(0, 4)))
    ).sort((a, b) => b.localeCompare(a));
  }, []);

  const filteredObservations = observations.filter((item) => {
    const observationYear = item.date.slice(0, 4);
    const observationMonth = item.date.slice(5, 7);

    return (
      (!selectedYear || observationYear === selectedYear) &&
      (!selectedMonth || observationMonth === selectedMonth) &&
      (!searchName ||
        item.name.toLowerCase().includes(searchName.toLowerCase())) &&
      (!selectedStatus || item.status === selectedStatus)
    );
  });

  const categoryIcon =
    category === "Unsafe Condition"
      ? "🚧"
      : category === "Near Miss"
        ? "🦺"
        : "⚠️";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 rounded-2xl bg-blue-800 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-200">
            SAFETY OBSERVATION
          </p>

          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            {siteName}
          </h1>

          {siteCode && (
            <p className="mt-2 text-sm text-blue-100">
              Site Code: {siteCode}
            </p>
          )}
        </header>

        {/* Category Title */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl">
              {categoryIcon}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Observation Category
              </p>

              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {category}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total Observations: {filteredObservations.length}
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Search &amp; Filter
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Year */}
            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search Year
              </label>

              <select
                id="year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Years</option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label
                htmlFor="month"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search Month
              </label>

              <select
                id="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search by Name
              </label>

              <input
                id="name"
                type="text"
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Enter person's name"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Observation Status
              </label>

              <select
                id="status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Close">Close</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedYear("");
              setSelectedMonth("");
              setSearchName("");
              setSelectedStatus("");
            }}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </section>

        {/* Observation Records */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📋
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">
            No Observations Yet
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Observation records will appear here after the database is
            connected.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Showing {filteredObservations.length} records
          </p>
        </section>

        {/* Back */}
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();

            if (siteCode) params.set("siteCode", siteCode);
            if (siteName) params.set("siteName", siteName);

            window.location.href = `/site-dashboard?${params.toString()}`;
          }}
          className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
}

export default function ObservationListPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 text-center shadow-sm">
            Loading observations...
          </div>
        </main>
      }
    >
      <ObservationListContent />
    </Suspense>
  );
}