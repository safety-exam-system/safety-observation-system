"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  requestPasswordReset,
  completePasswordReset,
} from "@/app/actions/password-reset";

type Step = "email" | "otp" | "password" | "success";
type AccountType = "main" | "site";

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [accountType, setAccountType] = useState<AccountType>("main");
  const [siteCode, setSiteCode] = useState("");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const type = params.get("type");
    const code = (params.get("siteCode") || "").trim().toUpperCase();

    if (type === "site" && code) {
      setAccountType("site");
      setSiteCode(code);
    } else {
      setAccountType("main");
      setSiteCode("");
    }
  }, []);

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your registered Email ID.");
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(
        email,
        accountType,
        siteCode
      );

      if (!result.success) {
        setError(result.message);
      } else {
        setMessage(result.message);
        setStep("otp");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{8}$/.test(otp)) {
      setError("Please enter a valid 8-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: "recovery",
      });

      if (verifyError) {
        setError(
          "Invalid or expired OTP. Please check the code or request a new one."
        );
        return;
      }

      setMessage("OTP verified successfully. Create your new password.");
      setStep("password");
    } catch (err) {
      console.error(err);
      setError("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setMessage("");
    setOtp("");
    setLoading(true);

    try {
      const result = await requestPasswordReset(
        email,
        accountType,
        siteCode
      );

      if (result.success) {
        setMessage("A new OTP request has been submitted. Please check your email.");
        setStep("otp");
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to resend OTP. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      newPassword.length < 8 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError(
        "Password must contain at least 8 characters, including uppercase, lowercase, number and special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const result = await completePasswordReset(
        newPassword,
        accountType,
        siteCode
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setStep("success");
      setMessage("");
    } catch (err) {
      console.error(err);
      setError("Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    if (accountType === "site") {
      router.push(
        `/site-admin-login?siteCode=${encodeURIComponent(siteCode)}`
      );
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🔐
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Forgot Password
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {accountType === "site"
              ? "Site Admin Portal"
              : "Main Admin Portal"}
          </p>

          {accountType === "site" && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              SITE CODE: {siteCode}
            </p>
          )}
        </div>

        {step === "email" && (
          <form onSubmit={sendOtp} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Enter your registered Email ID to receive an 8-digit
              verification code.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email ID
              </label>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your registered Email ID"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Enter the 8-digit verification code sent to your email.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                8-Digit OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="Enter 8-digit OTP"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.3em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              OTP verified. Create a new password for your account.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                New Password
              </label>

              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>

              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">✅</div>

            <h2 className="text-xl font-bold text-slate-900">
              Password Reset Successful
            </h2>

            <p className="text-sm text-slate-600">
              You can now sign in using your new password.
            </p>

            <button
              onClick={goToLogin}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Back to Login
            </button>
          </div>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-green-50 p-3 text-sm leading-6 text-green-800"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          {step !== "success" && (
            <button
              type="button"
              onClick={goToLogin}
              className="w-full py-2 text-sm font-medium text-slate-600 hover:underline"
            >
              ← Back to Login
            </button>
          )}
        </div>
      </section>
    </main>
  );
}