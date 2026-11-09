import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export const instant = false;

type Props = {
  searchParams: Promise<{
    siteCode?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function SiteAdminLoginPage({
  searchParams,
}: Props) {

  const params = await searchParams;
  const siteCode = (params.siteCode || "").trim().toUpperCase();

  if (!siteCode) {
    notFound();
  }

  const { data: site, error: siteError } = await supabaseAdmin
    .from("sites")
    .select("id, site_code, site_name")
    .eq("site_code", siteCode)
    .maybeSingle();

  if (siteError || !site) {
    notFound();
  }
const siteRecord = site as NonNullable<typeof site>;
  async function requestAccess(formData: FormData) {
  "use server";

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const loginPage = `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}`;

  if (!firstName || !lastName || !email || !password) {
    redirect(`${loginPage}&error=Please%20complete%20all%20fields`);
  }

  if (password.length < 8) {
    redirect(`${loginPage}&error=Password%20must%20be%20at%20least%208%20characters`);
  }

  // Check whether this email is already active in another Site
  const { data: existingMembership, error: membershipCheckError } =
    await supabaseAdmin
      .from("site_admins")
      .select("id, site_id")
      .ilike("email", email)
      .eq("is_active", true)
      .maybeSingle();

  if (membershipCheckError) {
    redirect(`${loginPage}&error=Unable%20to%20verify%20Email%20ID`);
  }

  if (existingMembership) {
    redirect(
      `${loginPage}&error=${encodeURIComponent(
        "This Email ID already exists in another Site."
      )}`
    );
  }

  let userId: string | null = null;

  // Try creating a new Auth account first
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (!authError && authData.user) {
    userId = authData.user.id;
  } else {
    // Account may already exist.
    // Verify the existing account password using an isolated client.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      redirect(`${loginPage}&error=Unable%20to%20verify%20existing%20account`);
    }

    const isolatedClient = createSupabaseClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: existingAuth, error: existingAuthError } =
      await isolatedClient.auth.signInWithPassword({
        email,
        password,
      });

    if (existingAuthError || !existingAuth.user) {
      redirect(
        `${loginPage}&error=${encodeURIComponent(
          "This Email ID is already registered. Please enter its existing password."
        )}`
      );
    }

    userId = existingAuth.user.id;

    await isolatedClient.auth.signOut();
  }

  if (!userId) {
    redirect(`${loginPage}&error=Unable%20to%20verify%20account`);
  }

  // Final check: this account must not have active membership in any Site
  const { data: activeMembership, error: activeCheckError } =
    await supabaseAdmin
      .from("site_admins")
      .select("id, site_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

  if (activeCheckError) {
    redirect(`${loginPage}&error=Unable%20to%20verify%20Site%20Access`);
  }

  if (activeMembership) {
    redirect(
      `${loginPage}&error=${encodeURIComponent(
        "This Email ID already exists in another Site."
      )}`
    );
  }

  // Check for an existing pending request for this Site
  const { data: pendingRequest, error: pendingCheckError } =
    await supabaseAdmin
      .from("site_admin_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("site_id", siteRecord.id)
      .eq("status", "pending")
      .maybeSingle();

  if (pendingCheckError) {
    redirect(`${loginPage}&error=Unable%20to%20check%20existing%20request`);
  }

  if (pendingRequest) {
    redirect(
      `${loginPage}&error=${encodeURIComponent(
        "Your request is already pending for this Site."
      )}`
    );
  }

  // Submit the Site Admin request
  const { error: requestError } = await supabaseAdmin
    .from("site_admin_requests")
    .insert({
      user_id: userId,
      site_id: siteRecord.id,
      first_name: firstName,
      last_name: lastName,
      email,
      status: "pending",
    });

  if (requestError) {
    redirect(
      `${loginPage}&error=${encodeURIComponent(
        "Unable to submit request. Please try again."
      )}`
    );
  }

  redirect(
    `${loginPage}&message=${encodeURIComponent(
      "Request submitted successfully. Please wait for approval."
    )}`
  );
}

  async function adminLogin(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Enter%20Email%20ID%20and%20Password`
      );
    }

    const supabase = await createClient();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      redirect(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Invalid%20Email%20ID%20or%20Password`
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await supabase.auth.signOut();

      redirect(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Login%20failed`
      );
    }
    // Main Admin cannot use Site Admin Login
const { data: mainAdmin, error: mainAdminError } =
  await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

if (mainAdminError || mainAdmin) {
  await supabase.auth.signOut();

  redirect(
    `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Invalid%20Email%20ID%20or%20Password`
  );
}
    // Verify approved Site Admin membership
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("site_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("site_id", siteRecord.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError || !admin) {
      await supabase.auth.signOut();

      redirect(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Your%20Admin%20Access%20is%20not%20approved%20for%20this%20Site`
      );
    }

    // Update latest login date
    const { error: updateError } = await supabaseAdmin
      .from("site_admins")
      .update({ login_at: new Date().toISOString() })
      .eq("id", admin.id);

    if (updateError) {
      await supabase.auth.signOut();

      redirect(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}&error=Unable%20to%20update%20login%20details`
      );
    }

    const siteParams = new URLSearchParams({
  siteCode: siteRecord.site_code,
  siteName: siteRecord.site_name,
});

redirect(`/site-access?${siteParams.toString()}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto w-full max-w-2xl">

        <div className="mb-6 rounded-2xl bg-blue-700 p-6 text-center text-white shadow-lg">
          <div className="mb-3 text-5xl">🦺</div>

          <h1 className="text-2xl font-bold">
            Site Admin Portal
          </h1>

          <p className="mt-3 text-lg font-semibold">
            {site.site_name}
          </p>

          <p className="mt-2 text-sm font-bold tracking-widest">
            SITE CODE: {site.site_code}
          </p>
        </div>

        {params.error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
            {params.message}
          </div>
        )}

        {/* New Admin Registration */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">

          <h2 className="mb-2 text-xl font-bold text-slate-900">
            New Admin Registration
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Register to request Admin Access for this Site.
          </p>

          <form action={requestAccess} className="space-y-4">

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                First Name
              </label>

              <input
                name="firstName"
                type="text"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter First Name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Last Name
              </label>

              <input
                name="lastName"
                type="text"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter Last Name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email ID
              </label>

              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter Email ID"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Create Password
              </label>

              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Minimum 8 characters"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-700 px-4 py-4 font-bold text-white transition hover:bg-blue-800"
            >
              Request Admin Access
            </button>

          </form>
        </div>

        {/* Existing Admin Login */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">

          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Already Joined? Login
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Login using your registered Email ID and Password.
          </p>

          <form action={adminLogin} className="space-y-4">

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email ID
              </label>

              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter Email ID"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter Password"
              />
            </div>
<div className="flex justify-end">
  <a
    href={`/forgot-password?type=site&siteCode=${encodeURIComponent(siteCode)}`}
    className="text-sm font-medium text-blue-700 hover:underline"
  >
    Forgot Password?
  </a>
</div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-4 font-bold text-white transition hover:bg-emerald-700"
            >
              Login
            </button>

          </form>
        </div>

      </section>
    </main>
  );
}