"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../lib/server";
import { supabaseAdmin } from "../../lib/supabase-admin";

type AccountType = "main" | "site";

const SUCCESS_MESSAGE =
  "If an eligible account exists, an 8-digit verification code has been sent to the registered Email ID.";

async function findAuthUserByEmail(email: string) {
  let page = 1;

  while (page <= 100) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      return { user: null, error: true };
    }

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === email
    );

    if (user) {
      return { user, error: false };
    }

    if (data.users.length < 1000) break;

    page++;
  }

  return { user: null, error: false };
}

export async function requestPasswordReset(
  emailInput: string,
  accountType: AccountType,
  siteCodeInput?: string
) {
  const email = emailInput.trim().toLowerCase();
  const siteCode = (siteCodeInput || "").trim().toUpperCase();

  if (
    !email ||
    !["main", "site"].includes(accountType) ||
    (accountType === "site" && !siteCode)
  ) {
    return {
      success: false,
      message: "Please enter a valid Email ID.",
    };
  }

  let eligible = false;

  if (accountType === "main") {
    const { user, error } = await findAuthUserByEmail(email);

    if (error) {
      return {
        success: false,
        message: "Unable to verify account. Please try again.",
      };
    }

    if (user) {
      const { data: mainAdmin, error: mainError } =
        await supabaseAdmin
          .from("main_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (mainError) {
        return {
          success: false,
          message: "Unable to verify account. Please try again.",
        };
      }

      eligible = !!mainAdmin;
    }
  }

  if (accountType === "site") {
    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("site_code", siteCode)
      .maybeSingle();

    if (siteError) {
      return {
        success: false,
        message: "Unable to verify Site. Please try again.",
      };
    }

    if (site) {
      const { data: membership, error: membershipError } =
        await supabaseAdmin
          .from("site_admins")
          .select("user_id")
          .ilike("email", email)
          .eq("site_id", site.id)
          .eq("is_active", true)
          .maybeSingle();

      if (membershipError) {
        return {
          success: false,
          message: "Unable to verify account. Please try again.",
        };
      }

      if (membership) {
        const { data: mainAdmin, error: mainError } =
          await supabaseAdmin
            .from("main_admins")
            .select("user_id")
            .eq("user_id", membership.user_id)
            .maybeSingle();

        if (mainError) {
          return {
            success: false,
            message: "Unable to verify account. Please try again.",
          };
        }

        eligible = !mainAdmin;
      }
    }
  }

  // Do not reveal whether an Email ID is registered
  // or belongs to another account type.
  if (!eligible) {
    return {
      success: true,
      message: SUCCESS_MESSAGE,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return {
      success: false,
      message: "Email service is not configured.",
    };
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

  const { error: otpError } =
    await isolatedClient.auth.resetPasswordForEmail(email);

  if (otpError) {
    console.error("Password reset OTP error:", otpError);

    return {
      success: false,
      message:
        "Unable to send OTP right now. Please try again later.",
    };
  }

  return {
    success: true,
    message: SUCCESS_MESSAGE,
  };
}

export async function completePasswordReset(
  newPassword: string,
  accountType: AccountType,
  siteCodeInput?: string
) {
  const siteCode = (siteCodeInput || "").trim().toUpperCase();

  if (
    !["main", "site"].includes(accountType) ||
    (accountType === "site" && !siteCode)
  ) {
    return {
      success: false,
      message: "Invalid password reset request.",
    };
  }

  if (
    newPassword.length < 8 ||
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    return {
      success: false,
      message:
        "Password must contain at least 8 characters, including uppercase, lowercase, number and special character.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "OTP verification session expired. Please request a new OTP.",
    };
  }

  let eligible = false;

  if (accountType === "main") {
    const { data: mainAdmin, error } = await supabaseAdmin
      .from("main_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: "Unable to verify Admin Account.",
      };
    }

    eligible = !!mainAdmin;
  }

  if (accountType === "site") {
    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("site_code", siteCode)
      .maybeSingle();

    if (siteError) {
      return {
        success: false,
        message: "Unable to verify Site.",
      };
    }

    if (site) {
      const { data: mainAdmin, error: mainError } =
        await supabaseAdmin
          .from("main_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (mainError) {
        return {
          success: false,
          message: "Unable to verify account.",
        };
      }

      if (!mainAdmin) {
        const { data: membership, error: membershipError } =
          await supabaseAdmin
            .from("site_admins")
            .select("id")
            .eq("user_id", user.id)
            .eq("site_id", site.id)
            .eq("is_active", true)
            .maybeSingle();

        if (membershipError) {
          return {
            success: false,
            message: "Unable to verify Site Admin Access.",
          };
        }

        eligible = !!membership;
      }
    }
  }

  if (!eligible) {
    await supabase.auth.signOut();

    return {
      success: false,
      message: "This account is not authorized for this password reset.",
    };
  }

  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

  if (updateError) {
    console.error("Password update error:", updateError);

    return {
      success: false,
      message:
        "Unable to update password. Please check the password requirements.",
    };
  }

  await supabase.auth.signOut();

  return {
    success: true,
    message: "Password reset successful.",
  };
}