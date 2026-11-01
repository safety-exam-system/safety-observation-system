"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  id: number | string;
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
  person_type?: string | null;
  violator_name?: string | null;
  responsible_person?: string | null;
  reporting_person?: string | null;
  near_miss_responsible_person?: string | null;
};

const MONTHS = [
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
];

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getDisplayStatus(status: string | null) {
  const value = normalize(status);

  if (value === "open") return "Open";
  if (value === "close" || value === "closed") return "Closed";

  return status || "Unknown";
}

function isOpen(status: string | null) {
  return normalize(status) === "open";
}

function isClosed(status: string | null) {
  return ["close", "closed"].includes(normalize(status));
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

function CompanyObservationListContent() {
  const searchParams = useSearchParams();

  const companyCode = (
    searchParams.get("companyCode") || ""
  ).trim().toUpperCase();

  const initialCategory = searchParams.get("category") || "All";
  const initialStatus = searchParams.get("status") || "";
  const initialYear = searchParams.get("year") || "";
  const initialMonth = searchParams.get("month") || "";

  const [supabase] = useState(() => createClient());

  const [company, setCompany] = useState<Company | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState(initialCategory);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [searchName, setSearchName] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadObservations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!/^[A-Z0-9]{3}$/.test(companyCode)) {
        setCompany(null);
        setObservations([]);
        setErrorMessage("Invalid Company Code. Please search again.");
        return;
      }

      // 1. Find the company.
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, company_code, company_name")
        .eq("company_code", companyCode)
        .maybeSingle();

      if (companyError) throw companyError;

      if (!companyData) {
        setCompany(null);
        setObservations([]);
        setErrorMessage("Company not found. Please check the Company Code.");
        return;
      }

      const currentCompany = companyData as Company;

      setCompany(currentCompany);

      // 2. Load site names for the records' actual site codes.
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("site_code, site_name");

      if (siteError) throw siteError;

      setSites((siteData || []) as Site[]);

      // 3. Load the company-related observation fields.
      // Site Observation List is not modified by this page.
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
              "person_type",
              "violator_name",
              "responsible_person",
              "reporting_person",
              "near_miss_responsible_person",
            ].join(",")
          )
          .in("category", [
            "Unsafe Act",
            "Unsafe Condition",
            "Near Miss",
          ])
          .order("observation_date", { ascending: false });

      if (observationError) throw observationError;

      // 4. Keep only observations belonging to this company.
    const companyObservations: Observation[] = (
  (observationData || []) as unknown as Observation[]
).filter((observation) =>
  matchesCompany(observation, currentCompany.company_name)
);

      setObservations(companyObservations);
    } catch (error) {
      console.error("Company observation loading error:", error);

      setObservations([]);
      setErrorMessage(
        "Unable to load company observations. Please check database permissions and column names."
      );
    } finally {
      setLoading(false);
    }
  }, [companyCode, supabase]);

  useEffect(() => {
    void loadObservations();
  }, [loadObservations]);

  const getObservationDate = (item: Observation) =>
    item.observation_date || item.created_at || "";

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          observations
            .map(getObservationDate)
            .filter(Boolean)
            .map((date) => date.slice(0, 4))
        )
      ).sort((a, b) => b.localeCompare(a)),
    [observations]
  );

  const filteredObservations = useMemo(() => {
    const search = normalize(searchName);

    return observations.filter((item) => {
      const date = getObservationDate(item);
      const year = date.slice(0, 4);
      const month = date.slice(5, 7);

      const matchesCategory =
        selectedCategory === "All" ||
        item.category === selectedCategory;

      const matchesYear =
        !selectedYear || year === selectedYear;

      const matchesMonth =
        !selectedMonth || month === selectedMonth;

      const matchesStatus =
        !selectedStatus ||
        (normalize(selectedStatus) === "open" && isOpen(item.status)) ||
        (
          ["close", "closed"].includes(normalize(selectedStatus)) &&
          isClosed(item.status)
        );

      const names = [
        item.submitted_by,
        item.violator_name,
        item.responsible_person,
        item.reporting_person,
        item.near_miss_responsible_person,
        item.contractor_name,
      ];

      const matchesName =
        !search ||
        names.some((name) => normalize(name).includes(search));

      return (
        matchesCategory &&
        matchesYear &&
        matchesMonth &&
        matchesStatus &&
        matchesName
      );
    });
  }, [
    observations,
    selectedCategory,
    selectedYear,
    selectedMonth,
    selectedStatus,
    searchName,
  ]);

  function openObservationDetails(item: Observation) {
    if (!item.site_code) {
      setErrorMessage(
        "This observation has no Site Code. Its details cannot be opened safely."
      );
      return;
    }

    const site = sites.find(
      (currentSite) => currentSite.site_code === item.site_code
    );

    const params = new URLSearchParams({
      id: String(item.id),
      siteCode: item.site_code,
      siteName: site?.site_name || "Site Dashboard",
      category: item.category || "All",
      companyCode,
    });

    window.location.href = `/observation-details?${params.toString()}`;
  }

  function clearFilters() {
    setSelectedCategory("All");
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedStatus("");
    setSearchName("");
  }

  const categoryIcon =
    selectedCategory === "Unsafe Condition"
      ? "🚧"
      : selectedCategory === "Near Miss"
        ? "🦺"
        : selectedCategory === "Unsafe Act"
          ? "⚠️"
          : "📋";

  const openCount = filteredObservations.filter((item) =>
    isOpen(item.status)
  ).length;

  const closedCount = filteredObservations.filter((item) =>
    isClosed(item.status)
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl bg-blue-800 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-200">
            SAFETY OBSERVATION
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Company Observation List
          </h1>

          {company && (
            <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-sm text-blue-100">Company Name</p>

              <p className="mt-1 break-words text-xl font-bold">
                {company.company_name}
              </p>

              <p className="mt-2 text-sm text-blue-100">
                Company Code: {company.company_code}
              </p>
            </div>
          )}
        </header>

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            Loading company observations...
          </section>
        ) : errorMessage ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
          >
            <h2 className="font-bold text-red-800">
              Unable to Load Observations
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadObservations()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white"
            >
              Try Again
            </button>
          </section>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <p className="font-semibold text-slate-700">
                  Total Observations
                </p>
                <p className="mt-3 text-4xl font-bold text-blue-800">
                  {filteredObservations.length}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
                <p className="font-semibold text-slate-700">
                  Open Observations
                </p>
                <p className="mt-3 text-4xl font-bold text-orange-600">
                  {openCount}
                </p>
              </div>

              <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <p className="font-semibold text-slate-700">
                  Closed Observations
                </p>
                <p className="mt-3 text-4xl font-bold text-green-700">
                  {closedCount}
                </p>
              </div>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl">{categoryIcon}</span>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Search &amp; Filter
                  </h2>

                  <p className="text-sm text-slate-500">
                    Only observations associated with this company are shown.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Observation Category
                  </label>

                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800"
                  >
                    <option value="All">All Categories</option>
                    <option value="Unsafe Act">Unsafe Act</option>
                    <option value="Unsafe Condition">Unsafe Condition</option>
                    <option value="Near Miss">Near Miss</option>
                  </select>
                </div>

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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800"
                  >
                    <option value="">All Years</option>
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800"
                  >
                    <option value="">All Months</option>
                    {MONTHS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800"
                  >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Close">Closed</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-800"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear Filters
                </button>

                <button
                  type="button"
                  onClick={() => void loadObservations()}
                  disabled={loading}
                  className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  Refresh Observations
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-800">
                  Showing {filteredObservations.length} observation(s)
                </p>
              </div>

              {filteredObservations.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-3xl">📋</div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    No Observations Found
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    No company observations match the selected filters.
                  </p>
                </div>
              ) : (
                filteredObservations.map((item) => {
                  const site = sites.find(
                    (currentSite) =>
                      currentSite.site_code === item.site_code
                  );

                  return (
                    <button
                      key={`${item.site_code}-${item.id}`}
                      type="button"
                      onClick={() => openObservationDetails(item)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {item.category || "Observation"}
                          </p>

                          <h3 className="mt-1 break-words text-lg font-bold text-slate-900">
                            {item.submitted_by || "Name not provided"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Date: {item.observation_date || "Not available"}
                          </p>

                          {item.site_code && (
                            <p className="mt-1 text-sm text-slate-500">
                              Site: {site?.site_name || item.site_code}
                              {" "}({item.site_code})
                            </p>
                          )}
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                            isOpen(item.status)
                              ? "bg-amber-100 text-amber-800"
                              : isClosed(item.status)
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {getDisplayStatus(item.status)}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {item.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm font-medium text-blue-700">
                          View Observation Details
                        </span>

                        <span className="text-lg text-blue-700" aria-hidden="true">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </section>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href =
              `/company-dashboard?companyCode=${encodeURIComponent(companyCode)}`;
          }}
          className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Company Dashboard
        </button>
      </div>
    </main>
  );
}

export default function CompanyObservationListPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <p className="text-lg font-semibold text-slate-700">
            Loading Company Observations...
          </p>
        </main>
      }
    >
      <CompanyObservationListContent />
    </Suspense>
  );
}