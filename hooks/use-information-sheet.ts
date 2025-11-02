// hooks/use-information-sheet.ts
import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, InformationSheetRecord, PaginatedResponse } from '@/lib/types';

export interface InfoSheetFilters {
  search?: string;
  purpose?: string;
  worker_category?: string;
  sex?: string;
  jobsite?: string;
  requested_record?: string;
  include_deleted?: boolean;
  include_active?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface UseInformationSheetReturn {
  records: InformationSheetRecord[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  fetchRecords: (filters?: InfoSheetFilters) => Promise<void>;
  createRecord: (data: any) => Promise<InformationSheetRecord | null>;
  updateRecord: (id: string, data: any) => Promise<InformationSheetRecord | null>;
  deleteRecord: (id: string) => Promise<boolean>;
  refreshRecords: () => Promise<void>;
}

export function useInformationSheet(): UseInformationSheetReturn {
  const [records, setRecords] = useState<InformationSheetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchRecords = useCallback(async (filters: InfoSheetFilters = { page: 1, limit: 10 }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const { page = 1, limit = 10, search, purpose, worker_category, sex, jobsite, requested_record, include_deleted, include_active, date_from, date_to } = filters;
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (purpose) params.append('purpose', purpose);
      if (worker_category) params.append('worker_category', worker_category);
      if (sex) params.append('sex', sex);
      if (jobsite) params.append('jobsite', jobsite);
      if (requested_record) params.append('requested_record', requested_record);
      if (include_deleted) params.append('include_deleted', 'true');
      if (include_active === false) params.append('include_active', 'false');
      if (date_from) params.append('date_from', date_from);
      if (date_to) params.append('date_to', date_to);

      const res = await fetch(`/api/information-sheet?${params.toString()}`);
      const result: ApiResponse<PaginatedResponse<InformationSheetRecord>> = await res.json();
      if (result.success && result.data) {
        setRecords(result.data.data);
        setPagination(result.data.pagination);
      } else {
        setError(result.error || 'Failed to fetch records');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching information sheet records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (data: any): Promise<InformationSheetRecord | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/information-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result: ApiResponse<InformationSheetRecord> = await res.json();
      if (result.success && result.data) {
        // Prepend new record for snappy UI; actual list will refresh externally
        setRecords(prev => [result.data!, ...prev]);
        return result.data;
      } else {
        setError(result.error || 'Failed to create record');
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error creating record:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRecord = useCallback(async (id: string, data: any): Promise<InformationSheetRecord | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/information-sheet/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result: ApiResponse<InformationSheetRecord> = await res.json();
      if (result.success && result.data) {
        setRecords(prev => prev.map(r => (r.id === id ? result.data! : r)));
        return result.data;
      } else {
        setError(result.error || 'Failed to update record');
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating record:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/information-sheet/${id}`, { method: 'DELETE' });
      const result: ApiResponse = await res.json();
      if (result.success) {
        setRecords(prev => prev.filter(r => r.id !== id));
        return true;
      } else {
        setError(result.error || 'Failed to delete record');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting record:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRecords = useCallback(async () => {
    await fetchRecords({ page: pagination.page, limit: pagination.limit });
  }, [fetchRecords, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, pagination, fetchRecords, createRecord, updateRecord, deleteRecord, refreshRecords };
}


