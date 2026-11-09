"use client";

import { useEffect, useState } from "react";

import {
  getSiteAdminRequests,
  approveSiteAdminRequest,
  rejectSiteAdminRequest,
} from "@/app/actions/site-admin-requests";

type AdminRequest = {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  requested_at: string | null;
  status: string;
};

export default function SiteAdminRequests({
  siteCode,
}: {
  siteCode: string;
}) {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);

    const result = await getSiteAdminRequests(siteCode);

    if (result.success) {
      setRequests(result.requests as AdminRequest[]);
      setMessage("");
    } else {
      setRequests([]);
      setMessage(result.message ?? "Something went wrong.");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadRequests();
  }, [siteCode]);

  async function handleApprove(id: number) {
    if (!window.confirm("Are you sure you want to approve this request?")) {
      return;
    }

    setProcessing(id);
    setMessage("");

    const result = await approveSiteAdminRequest(id, siteCode);

    setMessage(result.message ?? "Something went wrong.");

    if (result.success) {
      await loadRequests();
    }

    setProcessing(null);
  }

  async function handleReject(id: number) {
    if (!window.confirm("Are you sure you want to reject this request?")) {
      return;
    }

    setProcessing(id);
    setMessage("");

    const result = await rejectSiteAdminRequest(id, siteCode);

    setMessage(result.message ?? "Something went wrong.");

    if (result.success) {
      await loadRequests();
    }

    setProcessing(null);
  }

  return (
    <section className="mt-8 rounded-2xl border border-purple-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Accept Request
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review Site Admin access requests.
          </p>
        </div>

        <span className="rounded-full bg-purple-100 px-3 py-2 text-sm font-bold text-purple-800">
          {requests.length} Pending
        </span>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-800">
          {message}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-slate-500">
          Loading requests...
        </p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
          No pending Admin Requests.
        </p>
      ) : (
        <div className="space-y-4">

          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="text-lg font-bold text-slate-900">
                {request.first_name} {request.last_name}
              </h3>

              <p className="mt-2 break-all text-sm text-slate-600">
                Email: {request.email}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Requested:{" "}
                {request.requested_at
                  ? new Date(request.requested_at).toLocaleString()
                  : "N/A"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  disabled={processing === request.id}
                  onClick={() => handleApprove(request.id)}
                  className="rounded-lg bg-green-600 px-3 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {processing === request.id ? "Please wait..." : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={processing === request.id}
                  onClick={() => handleReject(request.id)}
                  className="rounded-lg bg-red-600 px-3 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>

              </div>
            </div>
          ))}

        </div>
      )}

      <button
        type="button"
        onClick={loadRequests}
        disabled={loading}
        className="mt-5 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        Refresh Requests
      </button>

    </section>
  );
}