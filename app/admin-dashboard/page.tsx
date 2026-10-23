"use client";

import { useState } from "react";
import { login } from "../actions/auth";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your Email ID and Password.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);

      const result = await login(formData);

      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }

      window.location.assign("/site-code");
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">
            🦺
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your Email ID"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your Password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/forgot-password";
              }}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-5 w-full py-2 text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Safety Observation
        </button>
      </section>
    </main>
  );
}