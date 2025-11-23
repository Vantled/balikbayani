// components/transaction-history.tsx
"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import type { ApplicationTransaction } from "@/lib/types";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getUser, isSuperadmin } from "@/lib/auth";

interface TransactionHistoryProps {
  applicationType: string;
  recordId?: string | null;
  limit?: number;
  refreshKey?: number;
}

const formatActionLabel = (action: string): string => {
  switch (action) {
    case "create":
      return "Created";
    case "update":
      return "Updated";
    case "delete":
      return "Deleted";
    case "for_compliance":
      return "Set to For Compliance";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "release_card":
      return "Card Released";
    case "received_by_region":
      return "Received by Region";
    default:
      return action;
  }
};

const formatValue = (value: unknown): string => {
  if (typeof value === "undefined") return "";
  if (value === null) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const buildFieldSummary = (transaction: ApplicationTransaction) => {
  const changedKeys = new Set<string>();
  if (transaction.old_values) {
    Object.keys(transaction.old_values).forEach(key => changedKeys.add(key));
  }
  if (transaction.new_values) {
    Object.keys(transaction.new_values).forEach(key => changedKeys.add(key));
  }
  return Array.from(changedKeys);
};

const buildChangeSummary = (transaction: ApplicationTransaction): string => {
  // For create actions, show control_number or document information
  if (transaction.action === 'create') {
    const controlNumber = transaction.new_values?.control_number;
    if (controlNumber) {
      return `Control No: ${formatValue(controlNumber)}`;
    }
    // For document creation, show document name and file name
    const documentName = transaction.new_values?.document_name;
    const fileName = transaction.new_values?.file_name;
    if (documentName || fileName) {
      const parts: string[] = [];
      if (documentName) parts.push(`Document: ${formatValue(documentName)}`);
      if (fileName) parts.push(`File: ${formatValue(fileName)}`);
      return parts.join(" | ");
    }
    return "";
  }

  // For delete actions on documents, show document name and file name, but exclude deleted flag
  if (transaction.action === 'delete') {
    const documentName = transaction.new_values?.document_name || transaction.old_values?.document_name;
    const fileName = transaction.new_values?.file_name || transaction.old_values?.file_name;
    if (documentName || fileName) {
      const parts: string[] = [];
      if (documentName) parts.push(`Document: ${formatValue(documentName)}`);
      if (fileName) parts.push(`File: ${formatValue(fileName)}`);
      return parts.join(" | ");
    }
  }

  // For for_compliance, approved, rejected, release_card, and received_by_region actions, only show action (no detailed change summary)
  if (transaction.action === 'for_compliance' || transaction.action === 'approved' || transaction.action === 'rejected' || transaction.action === 'release_card' || transaction.action === 'received_by_region') {
    return "";
  }

  const keys = buildFieldSummary(transaction);
  if (!keys.length) return "";

  // Filter out 'deleted' key from display
  const filteredKeys = keys.filter(key => key !== 'deleted');

  const parts = filteredKeys.map((key) => {
    const prev = formatValue(transaction.old_values?.[key]);
    const next = formatValue(transaction.new_values?.[key]);

    if (prev && next && prev !== next && prev !== "—") {
      return `${key}: ${prev} → ${next}`;
    }
    if (next && next !== "—") {
      return `${key}: ${next}`;
    }
    if (prev && prev !== "—") {
      return `${key}: ${prev}`;
    }
    return key;
  });

  const summary = parts.slice(0, 4).join(" | ");
  return parts.length > 4 ? `${summary} | …` : summary;
};

export function TransactionHistory(props: TransactionHistoryProps) {
  const { applicationType, recordId, limit, refreshKey } = props;
  const { transactions, loading, error, reload } = useTransactionHistory({
    applicationType,
    recordId,
    limit,
    refreshKey,
  });
  const hasData = transactions.length > 0;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const isHoldingRef = useRef(false);
  const wasHeldRef = useRef(false);
  const holdStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const user = getUser();
    setIsSuperAdmin(isSuperadmin(user));
  }, []);

  const handleClearHistory = async () => {
    if (!recordId || !isSuperAdmin) return;

    setIsClearing(true);
    try {
      const response = await fetch(`/api/audit/${applicationType}/${recordId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await reload();
      } else {
        console.error('Failed to clear history:', data.error);
      }
    } catch (err) {
      console.error('Error clearing history:', err);
    } finally {
      setIsClearing(false);
      isHoldingRef.current = false;
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSuperAdmin || !recordId || !hasData) return;
    
    isHoldingRef.current = true;
    wasHeldRef.current = false;
    holdStartTimeRef.current = Date.now();

    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        wasHeldRef.current = true;
        handleClearHistory();
      }
    }, 10000);
  };

  const handleMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (isHoldingRef.current && holdStartTimeRef.current) {
      const holdDuration = Date.now() - holdStartTimeRef.current;
      if (holdDuration > 200) {
        wasHeldRef.current = true;
      }
    }
    
    isHoldingRef.current = false;
    holdStartTimeRef.current = null;
    
    setTimeout(() => {
      wasHeldRef.current = false;
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const logLines = useMemo(() => {
    return transactions.map((transaction) => {
      const actor = transaction.actor?.full_name || transaction.actor?.username || "Unknown user";
      const actionLabel = formatActionLabel(transaction.action);
      const eventDate = new Date(transaction.created_at);
      const datePart = `${eventDate.getFullYear()}-${eventDate.toLocaleString('en-US', {
        month: 'short'
      }).toUpperCase()}-${String(eventDate.getDate()).padStart(2, '0')}`;
      const timePart = eventDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const timestamp = `[${datePart} at ${timePart}]`;
      const changeSummary = buildChangeSummary(transaction);
      return `${timestamp} ${actionLabel} by ${actor}${changeSummary ? ` — ${changeSummary}` : ""}`;
    });
  }, [transactions]);

  const logText = useMemo(() => logLines.join("\n"), [logLines]);

  const handleDownload = () => {
    if (!recordId || !logText) return;
    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${applicationType}-${recordId}-transactions.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!recordId) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-700">Transaction History</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              if (wasHeldRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              reload();
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onTouchCancel={handleMouseUp}
            disabled={loading || isClearing}
          >
            {isClearing ? "Clearing…" : loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={!hasData || loading}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load history: {error}
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="mt-4 rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
          No transactions recorded yet.
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-2">
          <div className="h-4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {!loading && hasData && (
        <textarea
          readOnly
          value={logText}
          className="mt-4 h-56 w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700"
        />
      )}
    </section>
  );
}

export default TransactionHistory;

