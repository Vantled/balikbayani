// hooks/use-balik-manggagawa-clearance.ts
import { useState, useEffect, useCallback } from 'react';
import { BalikManggagawaClearance } from '@/lib/types';

interface ClearanceFilters {
  page: number;
  limit: number;
  search?: string;
  clearanceType?: string; // comma-separated list for multi-select
  sex?: string; // comma-separated list for multi-select
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  jobsite?: string;
  position?: string;
  includeDeleted?: boolean;
  showDeletedOnly?: boolean;
}

interface ClearanceData {
  nameOfWorker: string;
  sex: 'male' | 'female';
  employer: string;
  destination: string;
  salary: number;
  clearanceType: string;
  // Extended optional fields
  position?: string | null;
  monthsYears?: string | null;
  withPrincipal?: string | null;
  newPrincipalName?: string | null;
  employmentDuration?: string | null;
  dateArrival?: string | null;
  dateDeparture?: string | null;
  placeDateEmployment?: string | null;
  dateBlacklisting?: string | null;
  totalDeployedOfws?: number | null;
  reasonBlacklisting?: string | null;
  yearsWithPrincipal?: number | null;
  remarks?: string | null;
}

export function useBalikManggagawaClearance() {
  const [clearances, setClearances] = useState<BalikManggagawaClearance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchClearances = useCallback(async (filters: ClearanceFilters = { page: 1, limit: 10 }) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/balik-manggagawa/clearance?${params}`);
      const result = await response.json();

      if (result.success) {
        setClearances(result.data.data);
        setPagination(result.data.pagination);
      } else {
        setError(result.error || 'Failed to fetch clearances');
      }
    } catch (err) {
      setError('Failed to fetch clearances');
      console.error('Error fetching clearances:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClearance = async (clearanceData: ClearanceData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/balik-manggagawa/clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clearanceData),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        await fetchClearances({ page: 1, limit: 10 });
        return { success: true, data: result.data };
      } else {
        setError(result.error || 'Failed to create clearance');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Failed to create clearance');
      console.error('Error creating clearance:', err);
      return { success: false, error: 'Failed to create clearance' };
    } finally {
      setLoading(false);
    }
  };

  const updateClearance = async (id: string, clearanceData: ClearanceData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/balik-manggagawa/clearance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clearanceData),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        await fetchClearances({ page: pagination.page, limit: pagination.limit });
        return { success: true, data: result.data };
      } else {
        setError(result.error || 'Failed to update clearance');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Failed to update clearance');
      console.error('Error updating clearance:', err);
      return { success: false, error: 'Failed to update clearance' };
    } finally {
      setLoading(false);
    }
  };

  const deleteClearance = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/balik-manggagawa/clearance/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        await fetchClearances({ page: pagination.page, limit: pagination.limit });
        return { success: true };
      } else {
        setError(result.error || 'Failed to delete clearance');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Failed to delete clearance');
      console.error('Error deleting clearance:', err);
      return { success: false, error: 'Failed to delete clearance' };
    } finally {
      setLoading(false);
    }
  };

  const getClearanceById = async (id: string) => {
    try {
      const response = await fetch(`/api/balik-manggagawa/clearance/${id}`);
      const result = await response.json();

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error fetching clearance:', err);
      return { success: false, error: 'Failed to fetch clearance' };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchClearances({ page: 1, limit: 10 });
  }, [fetchClearances]);

  return {
    clearances,
    loading,
    error,
    pagination,
    fetchClearances,
    createClearance,
    updateClearance,
    deleteClearance,
    getClearanceById,
  };
}
