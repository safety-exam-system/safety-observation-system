"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function AddCompanyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteId, setSiteId] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSite() {
      const params = new URLSearchParams(window.location.search);
      const currentSiteCode = params.get("siteCode") || "";

      setSiteCode(currentSiteCode);

      if (!currentSiteCode) {
        setMessage("Site information is missing. Please open Add Company from Site Portal.");
        setMessageType("error");
        return;
      }

      const { data: site, error } = await supabase
        .from("sites")
        .select("id, site_name, site_code")
        .eq("site_code", currentSiteCode)
        .single();

      if (error || !site) {
        setMessage("Selected Site not found.");
        setMessageType("error");
        return;
      }

      setSiteId(site.id);
      setSiteName(site.site_name);
    }

    loadSite();
  }, []);

  function handleCompanyNameChange(value: string) {
    setCompanyName(value);

    const code = value
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();

    setCompanyCode(code);
    setMessage("");
    setMessageType("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const name = companyName.trim();
    const code = companyCode.trim().toUpperCase();

    if (!name) {
      setMessage("Please enter Company Name.");
      setMessageType("error");
      return;
    }

    if (code.length !== 3) {
      setMessage("Company Name must generate a 3-character Company Code.");
      setMessageType("error");
      return;
    }

    if (!siteId) {
      setMessage("Site information is not available. Please try again.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      // Check Company Name within the selected Site
      const { data: existingName, error: nameError } = await supabase
        .from("companies")
        .select("id")
        .eq("site_id", siteId)
        .eq("company_name", name)
        .maybeSingle();

      if (nameError) {
        throw nameError;
      }

      if (existingName) {
        setMessage(`Company "${name}" already exists in this Site.`);
        setMessageType("error");
        return;
      }

      // Check Company Code within the selected Site
      const { data: existingCode, error: codeError } = await supabase
        .from("companies")
        .select("id")
        .eq("site_id", siteId)
        .eq("company_code", code)
        .maybeSingle();

      if (codeError) {
        throw codeError;
      }

      if (existingCode) {
        setMessage(
          `Company Code "${code}" already exists in this Site. Please use a different Company Name.`
        );
        setMessageType("error");
        return;
      }

      // Save Company under the selected Site
      const { error: insertError } = await supabase
        .from("companies")
        .insert([
          {
            company_name: name,
            company_code: code,
            site_id: siteId,
            is_active: true,
          },
        ]);

      if (insertError) {
        if (insertError.code === "23505") {
          setMessage(`Company Code "${code}" already exists in this Site.`);
          setMessageType("error");
        } else {
          throw insertError;
        }
        return;
      }

      setMessage(`Company "${name}" added successfully. Company Code: ${code}`);
      setMessageType("success");
      setCompanyName("");
      setCompanyCode("");
    } catch (error) {
      console.error("Add Company Error:", error);
      setMessage("Unable to save Company. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🏢
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Add Company
          </h1>

          <div className="mt-3 rounded-lg bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-800">
              Site: {siteName || "Loading..."}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              Site Code: {siteCode || "---"}
            </p>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Enter Company Name to generate Company Code
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label
              htmlFor="companyName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Company Name
            </label>

            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(event) =>
                handleCompanyNameChange(event.target.value)
              }
              placeholder="Enter Company Name"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="companyCode"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Generated Company Code
            </label>

            <input
              id="companyCode"
              type="text"
              value={companyCode}
              readOnly
              placeholder="XXX"
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 font-bold uppercase tracking-widest text-slate-800 outline-none"
            />
          </div>

          {message && (
            <p
              role="alert"
              className={`rounded-lg p-3 text-sm ${
                messageType === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !siteId}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Company"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            router.push(`/site-portal?${params.toString()}`);
          }}
          className="mt-5 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Site Portal
        </button>
      </section>
    </main>
  );
}