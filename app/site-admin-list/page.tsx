import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import AdminActionForm from "./admin-action-form";

export const instant = false;

type Props = {
  searchParams: Promise<{
    siteCode?: string;
  }>;
};

export default async function SiteAdminListPage({
  searchParams,
}: Props) {
  const supabase = await createClient();

  // Check logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const siteCode = (params.siteCode || "").trim().toUpperCase();

  if (!siteCode) {
    redirect("/site-selection");
  }

  // Check Main Admin
  const { data: mainAdmin } = await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isMainAdmin = !!mainAdmin;

  // Find selected site
  const { data: site, error: siteError } = await supabaseAdmin
    .from("sites")
    .select("id, site_code, site_name")
    .eq("site_code", siteCode)
    .maybeSingle();

  if (siteError || !site) {
    notFound();
  }

  // Check Site Admin permission
  if (!isMainAdmin) {
    const { data: siteAdmin } = await supabaseAdmin
      .from("site_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("site_id", site.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!siteAdmin) {
      redirect("/site-selection");
    }
  }

  // Load Active Admin List
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from("site_admins")
    .select("id, name, email, login_at, site_id")
    .eq("site_id", site.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (adminsError) {
    throw new Error("Unable to load Admin List.");
  }

  // Load Deleted Admins - Main Admin only
  let deletedAdmins: typeof admins = [];

  if (isMainAdmin) {
    const { data, error } = await supabaseAdmin
      .from("site_admins")
      .select("id, name, email, login_at, site_id")
      .eq("site_id", site.id)
      .eq("is_active", false)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Unable to load Deleted Admins.");
    }

    deletedAdmins = data ?? [];
  }

  function formatLoginDate(value: string | null) {
    if (!value) return "Never logged in";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto w-full max-w-6xl">

        {/* PAGE HEADER */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">

          <div className="text-center">

            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
              🦺
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Admin List
            </h1>

            <p className="mt-2 font-semibold text-slate-700">
              {site.site_name}
            </p>

            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-blue-700">
              Site Code: {site.site_code}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {isMainAdmin ? "Main Admin Access" : "Site Admin Access"}
            </p>

          </div>

        </div>

        {/* ACTIVE ADMIN LIST */}

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">

          <div className="flex items-center justify-between border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold text-slate-800">
              Site Admin Details
            </h2>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              Total: {admins?.length || 0}
            </span>

          </div>

          {admins && admins.length > 0 ? (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px] text-left text-sm">

                <thead className="bg-slate-100 text-slate-700">

                  <tr>
                    <th className="px-5 py-4 font-bold">ID</th>
                    <th className="px-5 py-4 font-bold">Name</th>
                    <th className="px-5 py-4 font-bold">Email ID</th>
                    <th className="px-5 py-4 font-bold">Site Code</th>
                    <th className="px-5 py-4 font-bold">Login Date</th>
                    <th className="px-5 py-4 text-center font-bold">
                      Action
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {admins.map((admin) => (

                    <tr
                      key={admin.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {admin.id}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {admin.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {admin.email}
                      </td>

                      <td className="px-5 py-4 font-bold text-blue-700">
                        {site.site_code}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatLoginDate(admin.login_at)}
                      </td>

                      <td className="px-5 py-4 text-center">

                        <AdminActionForm
                          adminId={admin.id}
                          siteCode={site.site_code}
                          mode="delete"
                        />

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="p-10 text-center">

              <p className="text-lg font-semibold text-slate-600">
                No Admin Found
              </p>

              <p className="mt-2 text-sm text-slate-400">
                No Admin has joined this Site yet.
              </p>

            </div>

          )}

        </div>

        {/* DELETED ADMIN RECOVERY - MAIN ADMIN ONLY */}

        {isMainAdmin && (

          <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-lg">

            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 p-5">

              <div>

                <h2 className="text-lg font-bold text-amber-900">
                  Deleted Admins / Recovery
                </h2>

                <p className="mt-1 text-xs text-amber-700">
                  Main Admin can restore or permanently delete accounts.
                </p>

              </div>

              <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
                Total: {deletedAdmins?.length || 0}
              </span>

            </div>

            {deletedAdmins && deletedAdmins.length > 0 ? (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left text-sm">

                  <thead className="bg-slate-100 text-slate-700">

                    <tr>
                      <th className="px-5 py-4 font-bold">ID</th>
                      <th className="px-5 py-4 font-bold">Name</th>
                      <th className="px-5 py-4 font-bold">Email ID</th>
                      <th className="px-5 py-4 font-bold">Site Code</th>
                      <th className="px-5 py-4 font-bold">Login Date</th>
                      <th className="px-5 py-4 text-center font-bold">
                        Recovery Action
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {deletedAdmins.map((admin) => (

                      <tr
                        key={admin.id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >

                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {admin.id}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {admin.name}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {admin.email}
                        </td>

                        <td className="px-5 py-4 font-bold text-blue-700">
                          {site.site_code}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatLoginDate(admin.login_at)}
                        </td>

                        <td className="space-y-3 px-5 py-4">

                          <AdminActionForm
                            adminId={admin.id}
                            siteCode={site.site_code}
                            mode="restore"
                          />

                          <AdminActionForm
                            adminId={admin.id}
                            siteCode={site.site_code}
                            mode="permanent"
                          />

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="p-10 text-center">

                <p className="text-lg font-semibold text-slate-600">
                  No Deleted Admin Found
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Deleted Admin accounts will appear here.
                </p>

              </div>

            )}

          </div>

        )}

        {/* BACK BUTTON */}

        <Link
          href={
            isMainAdmin
              ? `/site-access?siteCode=${encodeURIComponent(site.site_code)}`
              : `/site-dashboard?siteCode=${encodeURIComponent(site.site_code)}&siteName=${encodeURIComponent(site.site_name)}`
          }
          className="mt-6 block w-full rounded-xl bg-blue-700 px-5 py-4 text-center font-semibold text-white transition hover:bg-blue-800"
        >
          ← Back
        </Link>

      </section>
    </main>
  );
}