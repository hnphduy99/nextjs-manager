"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LicenseActionsMenuProps {
  licenseId: string;
  status: string;
}

export function LicenseActionsMenu({ licenseId, status }: LicenseActionsMenuProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const dispatch = async (action: string, extra?: Record<string, string>) => {
    if (!confirm(`Are you sure you want to ${action} this license?`)) return;
    setLoading(true);
    await fetch(`/api/admin/licenses/${licenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-1">
      {status === "ACTIVE" && (
        <button
          disabled={loading}
          onClick={() => dispatch("revoke")}
          className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
        >
          Revoke
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          disabled={loading}
          onClick={() => dispatch("suspend")}
          className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
        >
          Suspend
        </button>
      )}
      {(status === "SUSPENDED" || status === "PENDING") && (
        <button
          disabled={loading}
          onClick={() => dispatch("activate")}
          className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
        >
          Activate
        </button>
      )}
    </div>
  );
}
