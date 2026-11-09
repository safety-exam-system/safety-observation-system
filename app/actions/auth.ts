"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/server";
import { supabaseAdmin } from "../../lib/supabase-admin";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      success: false,
      message: "Please enter your Email ID and Password.",
    };
  }

  const supabase = await createClient();

  // Step 1: Verify Email ID and Password
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: "Invalid Email ID or Password.",
    };
  }

  // Step 2: Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();

    return {
      success: false,
      message: "Invalid Email ID or Password.",
    };
  }

  // Step 3: Only Main Admin can use Main Admin Login
  const { data: mainAdmin, error: mainAdminError } =
    await supabaseAdmin
      .from("main_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (mainAdminError) {
    await supabase.auth.signOut();

    return {
      success: false,
      message: "Unable to verify Admin Account. Please try again.",
    };
  }

  // Reject Site Admin accounts
  if (!mainAdmin) {
    await supabase.auth.signOut();

    return {
      success: false,
      message: "Invalid Email ID or Password.",
    };
  }

  return {
    success: true,
    message: "Login successful.",
  };
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}