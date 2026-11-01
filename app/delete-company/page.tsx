"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

type Company = {
  id: string;
  company_name: string;
  company_code: string;
};

export default function DeleteCompanyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [siteId, setSiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    loadSiteAndCompanies();
  }, []);

  async function loadSiteAndCompanies() {
    setLoading(true);
    setMessage("");

    const params = new URLSearchParams(window.location.search);
    const currentSiteCode = params.get("siteCode") || "";

    setSiteCode(currentSiteCode);

    if (!currentSiteCode) {
      setMessage("Site information is missing.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, site_name, site_code")
      .eq("site_code", currentSiteCode)
      .single();

    if (siteError || !site) {
      setMessage("Selected Site not found.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    setSiteId(site.id);
    setSiteName(site.site_name);

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("id, company_name, company_code")
      .eq("site_id", site.id)
      .eq("is_active", true)
      .order("company_name");

    if (companyError) {
      console.error("Load Companies Error:", companyError);
      setMessage("Unable to load companies. Please try again.");
      setMessageType("error");
    } else {
      setCompanies(companyData || []);
    }

    setLoading(false);
  }

  async function handleDelete(company: Company) {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${company.company_name}" from this Site?\n\nOld Observation History will be preserved.`
    );

    if (!confirmed) return;

    setDeletingId(company.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("companies")
      .update({ is_active: false })
      .eq("id", company.id)
      .eq("site_id", siteId)
      .eq("is_active", true);

    if (error) {
      console.error("Delete Company Error:", error);
      setMessage("Unable to remove Company. Please try again.");
      setMessageType("error");
    } else {
      setCompanies((previous) =>
        previous.filter((item) => item.id !== company.id)
      );

      setMessage(
        `Company "${company.company_name}" has been removed from this Site.`
      );
      setMessageType("success");
    }

    setDeletingId("");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-3xl text-white">
            🏢
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Delete Company
          </h1>

          <div className="mt-3 rounded-lg bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-800">
              Site: {siteName || "Loading..."}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              Site Code: {siteCode || "---"}
            </p>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Select a company to remove it from this Site.
          </p>
        </div>

        {message && (
          <p
            role="alert"
            className={`mb-4 rounded-lg p-3 text-sm ${
              messageType === "success"
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {message}
          </p>
        )}

        {loading ? (
          <p className="py-8 text-center text-slate-600">
            Loading companies...
          </p>
        ) : companies.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-6 text-center text-slate-600">
            No active companies found in this Site.
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">
                    {company.company_name}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Code: {company.company_code}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(company)}
                  disabled={deletingId !== ""}
                  className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === company.id ? "Removing..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            router.push(`/site-portal?${params.toString()}`);
          }}
          className="mt-6 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Site Portal
        </button>

      </section>
    </main>
  );
}