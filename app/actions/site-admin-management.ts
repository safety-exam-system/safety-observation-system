"use server";

import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

async function verifyAccess(siteCode: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Please login first." };
  }

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id, site_code")
    .eq("site_code", siteCode.trim().toUpperCase())
    .maybeSingle();

  if (!site) {
    return { error: "Site not found." };
  }

  const { data: mainAdmin } = await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isMainAdmin = !!mainAdmin;

  let isSiteAdmin = false;

  if (!isMainAdmin) {
    const { data: membership } = await supabaseAdmin
      .from("site_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("site_id", site.id)
      .eq("is_active", true)
      .maybeSingle();

    isSiteAdmin = !!membership;
  }

  if (!isMainAdmin && !isSiteAdmin) {
    return { error: "You are not authorized for this Site." };
  }

  return {
    user,
    site,
    isMainAdmin,
    isSiteAdmin,
  };
}

// DELETE ADMIN ACCESS
export async function deleteSiteAdmin(
  adminId: number,
  siteCode: string
) {
  const access = await verifyAccess(siteCode);

  if ("error" in access) {
    return { success: false, message: access.error };
  }

  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    return { success: false, message: "Invalid Admin ID." };
  }

  const { data: target } = await supabaseAdmin
    .from("site_admins")
    .select("id, user_id, is_active")
    .eq("id", adminId)
    .eq("site_id", access.site.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!target) {
    return { success: false, message: "Admin not found." };
  }

  if (target.user_id === access.user.id) {
    return {
      success: false,
      message: "You cannot delete your own access.",
    };
  }

  const { data: targetMainAdmin } = await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", target.user_id)
    .maybeSingle();

  if (targetMainAdmin) {
    return {
      success: false,
      message: "Main Admin cannot be deleted here.",
    };
  }

  const { error } = await supabaseAdmin
    .from("site_admins")
    .update({ is_active: false })
    .eq("id", adminId)
    .eq("site_id", access.site.id)
    .eq("is_active", true);

  if (error) {
    return {
      success: false,
      message: "Unable to delete Admin access.",
    };
  }

  revalidatePath("/site-admin-list");

  return {
    success: true,
    message: "Admin access deleted successfully.",
  };
}

// RESTORE ADMIN ACCESS - MAIN ADMIN ONLY
export async function restoreSiteAdmin(
  adminId: number,
  siteCode: string
) {
  const access = await verifyAccess(siteCode);

  if ("error" in access) {
    return { success: false, message: access.error };
  }

  if (!access.isMainAdmin) {
    return {
      success: false,
      message: "Only Main Admin can restore deleted Admins.",
    };
  }

  const { data: target } = await supabaseAdmin
    .from("site_admins")
    .select("id, user_id, is_active, name")
    .eq("id", adminId)
    .eq("site_id", access.site.id)
    .eq("is_active", false)
    .maybeSingle();

  if (!target) {
    return {
      success: false,
      message: "Deleted Admin not found.",
    };
  }

  // Check whether this account is active in another Site
  const { data: existingMembership, error: checkError } =
    await supabaseAdmin
      .from("site_admins")
      .select("id, site_id")
      .eq("user_id", target.user_id)
      .eq("is_active", true)
      .maybeSingle();

  if (checkError) {
    return {
      success: false,
      message: "Unable to verify existing Site access.",
    };
  }

  if (existingMembership) {
    return {
      success: false,
      message: "This Admin is already active in another Site.",
    };
  }

  const { error } = await supabaseAdmin
    .from("site_admins")
    .update({ is_active: true })
    .eq("id", adminId)
    .eq("site_id", access.site.id)
    .eq("is_active", false);

  if (error) {
    return {
      success: false,
      message: "Unable to restore Admin access.",
    };
  }

  revalidatePath("/site-admin-list");

  return {
    success: true,
    message: `${target.name} has been restored successfully.`,
  };
}

// PERMANENT DELETE - MAIN ADMIN ONLY
export async function permanentlyDeleteSiteAdmin(
  adminId: number,
  siteCode: string
) {
  const access = await verifyAccess(siteCode);

  if ("error" in access) {
    return { success: false, message: access.error };
  }

  if (!access.isMainAdmin) {
    return {
      success: false,
      message: "Only Main Admin can permanently delete Accounts.",
    };
  }

  const { data: target } = await supabaseAdmin
    .from("site_admins")
    .select("id, user_id, name, email, is_active")
    .eq("id", adminId)
    .eq("site_id", access.site.id)
    .eq("is_active", false)
    .maybeSingle();

  if (!target) {
    return {
      success: false,
      message: "Deleted Admin not found.",
    };
  }

  if (target.user_id === access.user.id) {
    return {
      success: false,
      message: "You cannot delete your own account.",
    };
  }

  // Protect Main Admin accounts
  const { data: targetMainAdmin } = await supabaseAdmin
    .from("main_admins")
    .select("user_id")
    .eq("user_id", target.user_id)
    .maybeSingle();

  if (targetMainAdmin) {
    return {
      success: false,
      message: "Main Admin account cannot be permanently deleted here.",
    };
  }

  // Check whether the account is active in any other Site
  const { data: activeMembership, error: activeError } =
    await supabaseAdmin
      .from("site_admins")
      .select("id")
      .eq("user_id", target.user_id)
      .eq("is_active", true)
      .maybeSingle();

  if (activeError) {
    return {
      success: false,
      message: "Unable to verify other Site access.",
    };
  }

  if (activeMembership) {
    return {
      success: false,
      message: "This account is still active in another Site. Delete that access first.",
    };
  }

  // Permanently delete the Supabase Auth account.
  // Related records with ON DELETE CASCADE will be removed automatically.
  const { error: deleteError } =
    await supabaseAdmin.auth.admin.deleteUser(target.user_id);

  if (deleteError) {
    return {
      success: false,
      message: "Unable to permanently delete this account: " + deleteError.message,
    };
  }

  // Additional cleanup of Site Admin records and requests.
  await supabaseAdmin
    .from("site_admins")
    .delete()
    .eq("user_id", target.user_id);

  await supabaseAdmin
    .from("site_admin_requests")
    .delete()
    .eq("user_id", target.user_id);

  revalidatePath("/site-admin-list");

  return {
    success: true,
    message: `${target.email} has been permanently deleted.`,
  };
}