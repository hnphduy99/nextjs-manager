"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TransactionActionsMenuProps {
  transactionId: string;
  status: string;
}

export function TransactionActionsMenu({ transactionId, status }: TransactionActionsMenuProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const dispatch = async (action: "confirm" | "refund" | "cancel") => {
    const label = action === "confirm" ? "confirm this payment and generate a license key" : action;
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setLoading(true);
    await fetch(`/api/admin/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    setLoading(false);
    router.refresh();
  };

  if (status !== "PENDING") return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="flex gap-1">
      <button
        disabled={loading}
        onClick={() => dispatch("confirm")}
        className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
      >
        Confirm
      </button>
      <button
        disabled={loading}
        onClick={() => dispatch("cancel")}
        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
      >
        Cancel
      </button>
    </div>
  );
}
