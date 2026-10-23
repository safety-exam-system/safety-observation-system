"use client";

import { useState } from "react";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage(
      "OTP email service is not connected yet. Email delivery will be enabled when the backend is configured."
    );
  }

  function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage(
      "OTP verification is not connected yet. It will be enabled when the backend is configured."
    );
  }

  function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setError(
      "Password reset is not connected yet. Secure backend authentication is required."
    );
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
            Admin Dashboard · Safety Observation
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={sendOtp} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Enter your registered Email ID to receive an 8-digit
              verification code.
            </p>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email ID
              </label>

              <input
                id="email"
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
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Enter the 8-digit verification code sent to your email.
            </p>

            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                8-Digit OTP
              </label>

              <input
                id="otp"
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
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => {
                setOtp("");
                setMessage("");
                setError("");
                setStep("email");
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Create a new password for your account.
            </p>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New Password
              </label>

              <input
                id="newPassword"
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
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm New Password
              </label>

              <input
                id="confirmPassword"
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
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Reset Password
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
              onClick={() => (window.location.href = "/admin-dashboard")}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Back to Login
            </button>
          </div>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800"
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

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
          {step !== "email" && step !== "success" && (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
                setStep(step === "password" ? "otp" : "email");
              }}
              className="w-full py-2 text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            onClick={() => (window.location.href = "/admin-dashboard")}
            className="w-full py-2 text-sm font-medium text-slate-600 hover:underline"
          >
            ← Back to Admin Login
          </button>
        </div>
      </section>
    </main>
  );
}