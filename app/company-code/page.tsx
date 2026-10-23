"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
type Company = {
  id: string;
  company_code: string;
  company_name: string;
};

export default function CompanyCodePage() {
    const [supabase] = useState(() => createClient());
  const [companyCode, setCompanyCode] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = companyCode.trim().toUpperCase();

    setCompany(null);
    setError("");

    if (!/^[A-Z0-9]{3}$/.test(code)) {
      setError("Please enter exactly 3 letters or numbers.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: searchError } = await supabase
        .from("companies")
        .select("id, company_code, company_name")
        .eq("company_code", code)
        .maybeSingle();

      if (searchError) {
        console.error("Company search error:", searchError);
        setError("Unable to search company. Please try again.");
        return;
      }

      if (!data) {
        setError("Company not found. Please check the Company Code.");
        return;
      }

      setCompany(data as Company);
    } catch (err) {
      console.error("Unexpected company search error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Safety Observation
        </h1>

        <p className="mb-8 text-center text-gray-600">
          Search your company using Company Code
        </p>

        <form onSubmit={searchCompany}>
          <label
            htmlFor="companyCode"
            className="mb-2 block font-semibold text-gray-800"
          >
            Company Code
          </label>

          <input
            id="companyCode"
            type="text"
            value={companyCode}
            onChange={(e) =>
              setCompanyCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)
              )
            }
            placeholder="Enter 3-character code"
            maxLength={3}
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl font-bold uppercase tracking-widest text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />

          <p className="mt-2 text-sm text-gray-500">
            Example: XYZ, A12, 1AB, 123
          </p>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search Company"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700"
          >
            {error}
          </div>
        )}

        {company && (
  <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
    <h2 className="mb-4 text-center text-xl font-bold text-green-800">
      Company Found
    </h2>

    <div className="space-y-3 text-gray-800">
      <p>
        <span className="font-semibold">Company Name:</span>{" "}
        {company.company_name}
      </p>

      <p>
        <span className="font-semibold">Company Code:</span>{" "}
        {company.company_code}
      </p>
    </div>

    {/* Open Company Dashboard Button */}
    <button
      type="button"
      onClick={() => {
        window.location.href = `/company-dashboard?companyCode=${encodeURIComponent(
          company.company_code
        )}`;
      }}
      className="mt-5 w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800"
    >
      Open Company Dashboard
    </button>
  </div>
)}

        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}