"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteSiteAdmin,
  restoreSiteAdmin,
  permanentlyDeleteSiteAdmin,
} from "@/app/actions/site-admin-management";

type Props = {
  adminId: number;
  siteCode: string;
  mode: "delete" | "restore" | "permanent";
};

export default function AdminActionForm({
  adminId,
  siteCode,
  mode,
}: Props) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAction() {
    let confirmation = "";

    if (mode === "delete") {
      confirmation =
        "Are you sure you want to delete this Admin's Site Access?";
    }

    if (mode === "restore") {
      confirmation =
        "Are you sure you want to restore this Admin's Site Access?";
    }

    if (mode === "permanent") {
      confirmation =
        "WARNING! This will permanently delete the Supabase Auth Account. This action cannot be undone. Continue?";
    }

    if (!window.confirm(confirmation)) {
      return;
    }

    startTransition(async () => {
      let result;

      if (mode === "delete") {
        result = await deleteSiteAdmin(adminId, siteCode);
      } else if (mode === "restore") {
        result = await restoreSiteAdmin(adminId, siteCode);
      } else {
        result = await permanentlyDeleteSiteAdmin(
          adminId,
          siteCode
        );
      }

      setMessage(result.message ?? "Action completed.");

      if (result.success) {
        router.refresh();
      }
    });
  }

  const buttonStyle =
    mode === "delete"
      ? "bg-red-600 hover:bg-red-700"
      : mode === "restore"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-slate-900 hover:bg-black";

  const buttonText =
    mode === "delete"
      ? "Delete"
      : mode === "restore"
      ? "Restore Access"
      : "Permanently Delete";

  return (
    <div className="space-y-2">

      <button
        type="button"
        onClick={handleAction}
        disabled={isPending}
        className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${buttonStyle}`}
      >
        {isPending ? "Please wait..." : buttonText}
      </button>

      {message && (
        <p className="max-w-xs text-xs font-semibold text-slate-600">
          {message}
        </p>
      )}

    </div>
  );
}
