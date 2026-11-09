"use server";

import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Verify Approver
async function verifyApprover(siteCode: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please login first." };
  }

  const { data: site, error: siteError } = await supabaseAdmin
    .from("sites")
    .select("id, site_code")
    .eq("site_code", siteCode.trim().toUpperCase())
    .maybeSingle();

  if (siteError || !site) {
    return { error: "Site not found." };
  }

  const { data: mainAdmin } = await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isMainAdmin = !!mainAdmin;

  if (!isMainAdmin) {
    const { data: siteAdmin } = await supabaseAdmin
      .from("site_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("site_id", site.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!siteAdmin) {
      return { error: "You are not authorized for this Site." };
    }
  }

  return {
    user,
    site,
    isMainAdmin,
  };
}

// Load Pending Requests
export async function getSiteAdminRequests(siteCode: string) {
  const access = await verifyApprover(siteCode);

  if ("error" in access) {
    return {
      success: false,
      message: access.error,
      requests: [],
    };
  }

  const { data, error } = await supabaseAdmin
    .from("site_admin_requests")
    .select(`
      id,
      user_id,
      first_name,
      last_name,
      email,
      requested_at,
      status
    `)
    .eq("site_id", access.site.id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    return {
      success: false,
      message: "Unable to load requests.",
      requests: [],
    };
  }

  return {
    success: true,
    message: "",
    requests: data ?? [],
  };
}

// Approve Request Using Atomic Database Function
export async function approveSiteAdminRequest(
  requestId: number,
  siteCode: string
) {
  const access = await verifyApprover(siteCode);

  if ("error" in access) {
    return {
      success: false,
      message: access.error,
    };
  }

  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    return {
      success: false,
      message: "Invalid Request ID.",
    };
  }

  const { data, error } = await supabaseAdmin.rpc(
    "approve_site_admin_request",
    {
      p_request_id: requestId,
      p_site_id: access.site.id,
      p_reviewed_by: access.user.id,
    }
  );

  if (error) {
    console.error("Site Admin Approval Error:", error);

    return {
      success: false,
      message: "Unable to approve request. Please try again.",
    };
  }

  const result = data as {
    success?: boolean;
    message?: string;
  } | null;

  return {
    success: result?.success === true,
    message: result?.message || "Approval process completed.",
  };
}

// Reject Request
export async function rejectSiteAdminRequest(
  requestId: number,
  siteCode: string
) {
  const access = await verifyApprover(siteCode);

  if ("error" in access) {
    return {
      success: false,
      message: access.error,
    };
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from("site_admin_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .eq("site_id", access.site.id)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError || !request) {
    return {
      success: false,
      message: "Request not found or already reviewed.",
    };
  }

  // Prevent Self Rejection
  if (request.user_id === access.user.id) {
    return {
      success: false,
      message: "You cannot reject your own request.",
    };
  }

  const { error } = await supabaseAdmin
    .from("site_admin_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.user.id,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    return {
      success: false,
      message: "Unable to reject request.",
    };
  }

  return {
    success: true,
    message: "Request rejected successfully.",
  };
}