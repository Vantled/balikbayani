// hooks/use-transaction-history.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicationTransaction } from '@/lib/types';

interface UseTransactionHistoryOptions {
  applicationType: string;
  recordId?: string | null;
  limit?: number;
  refreshKey?: number;
}

interface UseTransactionHistoryResult {
  transactions: ApplicationTransaction[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const useTransactionHistory = (
  options: UseTransactionHistoryOptions
): UseTransactionHistoryResult => {
  const { applicationType, recordId, limit = 50, refreshKey } = options;
  const [transactions, setTransactions] = useState<ApplicationTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!recordId) {
      setTransactions([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/audit/${applicationType}/${recordId}?limit=${limit}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load transaction history');
      }

      setTransactions(data.data || []);
    } catch (err) {
      if ((err as any).name === 'AbortError') {
        return;
      }
      console.error('Failed to load transaction history:', err);
      setError((err as Error).message || 'Failed to load transaction history');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [applicationType, recordId, limit]);

  useEffect(() => {
    void load();

    return () => {
      abortRef.current?.abort();
    };
  }, [load, refreshKey]);

  return {
    transactions,
    loading,
    error,
    reload: load,
  };
};

