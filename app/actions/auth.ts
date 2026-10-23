"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/server";

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

  return {
    success: true,
    message: "Login successful.",
  };
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/admin-dashboard");
}