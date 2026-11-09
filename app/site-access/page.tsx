import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const instant = false;

type Props = {
  searchParams: Promise<{
    siteCode?: string;
  }>;
};

export default async function SiteAccessPage({
  searchParams,
}: Props) {
  // Check logged-in user
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get selected Site
  const params = await searchParams;
  const siteCode = (params.siteCode || "").trim().toUpperCase();

  if (!siteCode) {
    redirect("/site-selection");
  }

  // Find Site
  const { data: site, error: siteError } = await supabaseAdmin
    .from("sites")
    .select("id, site_code, site_name")
    .eq("site_code", siteCode)
    .maybeSingle();

  if (siteError || !site) {
    notFound();
  }

  // Check Main Admin
  const { data: mainAdmin, error: mainAdminError } =
    await supabaseAdmin
      .from("main_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  const isMainAdmin = !mainAdminError && !!mainAdmin;

  // Check Site Admin
  let isSiteAdmin = false;

  if (!isMainAdmin) {
    const { data: siteAdmin, error: siteAdminError } =
      await supabaseAdmin
        .from("site_admins")
        .select("id")
        .eq("user_id", user.id)
        .eq("site_id", site.id)
        .eq("is_active", true)
        .maybeSingle();

    isSiteAdmin = !siteAdminError && !!siteAdmin;
  }

  // Access denied
  if (!isMainAdmin && !isSiteAdmin) {
    redirect("/login");
  }

  const siteParams = new URLSearchParams({
    siteCode: site.site_code,
    siteName: site.site_name,
  }).toString();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">

        {/* Site Information */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🦺
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Site Access
          </h1>

          <p className="mt-3 text-lg font-semibold text-slate-800">
            {site.site_name}
          </p>

          <p className="mt-2 text-sm font-bold uppercase tracking-widest text-blue-700">
            Site Code: {site.site_code}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            {isMainAdmin
              ? "Main Admin Access"
              : "Site Admin Access"}
          </p>

        </div>

        {/* Access Buttons */}
        <div className="space-y-4">

          <Link
            href={`/site-portal?${siteParams}`}
            className="block w-full rounded-xl bg-blue-700 px-4 py-6 text-center text-lg font-semibold text-white transition hover:bg-blue-800"
          >
            Site Portal
          </Link>

          <Link
            href={`/site-admin-list?${siteParams}`}
            className="block w-full rounded-xl bg-emerald-600 px-4 py-6 text-center text-lg font-semibold text-white transition hover:bg-emerald-700"
          >
            Admin List
          </Link>

        </div>

        {/* Main Admin Back Button */}
        {isMainAdmin && (
          <Link
            href="/site-selection"
            className="mt-6 block w-full py-2 text-center text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to Site Selection
          </Link>
        )}

      </section>
    </main>
  );
}