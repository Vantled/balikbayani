// hooks/use-job-fair-monitoring.ts
import { useState, useEffect } from 'react';
import { JobFairMonitoring, PaginatedResponse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface UseJobFairMonitoringReturn {
  monitoringData: JobFairMonitoring[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  createMonitoring: (data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMonitoring: (id: string, data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteMonitoring: (id: string) => Promise<void>;
  restoreMonitoring: (id: string) => Promise<void>;
  permanentDeleteMonitoring: (id: string) => Promise<void>;
  fetchMonitoring: (page?: number, limit?: number, search?: string, filterQuery?: string, showDeletedOnly?: boolean) => Promise<void>;
  searchMonitoring: (search: string, showDeletedOnly?: boolean) => Promise<void>;
}

export function useJobFairMonitoring(): UseJobFairMonitoringReturn {
  const [monitoringData, setMonitoringData] = useState<JobFairMonitoring[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMonitoring = async (page: number = 1, limit: number = 10, search: string = "", filterQuery: string = "", showDeletedOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      if (filterQuery) {
        params.append('filter', filterQuery);
      }
      
      if (showDeletedOnly) {
        params.append('showDeletedOnly', 'true');
      }
      
      const response = await fetch(`/api/job-fair-monitoring?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      
      const data: PaginatedResponse<JobFairMonitoring> = await response.json();
      setMonitoringData(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createMonitoring = async (data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/job-fair-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair monitoring record created successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMonitoring = async (id: string, data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fair-monitoring/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair monitoring record updated successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMonitoring = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fair-monitoring/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair monitoring record deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreMonitoring = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/job-fair-monitoring', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'restore', id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair monitoring record restored successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const permanentDeleteMonitoring = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/job-fair-monitoring', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'permanent-delete', id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to permanently delete monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair monitoring record permanently deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchMonitoring = async (search: string, showDeletedOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        search: search,
        page: '1',
        limit: pagination.limit.toString()
      });
      
      if (showDeletedOnly) {
        params.append('showDeletedOnly', 'true');
      }
      
      const response = await fetch(`/api/job-fair-monitoring?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search monitoring data');
      }
      
      const data: PaginatedResponse<JobFairMonitoring> = await response.json();
      setMonitoringData(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, []);

  return {
    monitoringData,
    pagination,
    loading,
    error,
    createMonitoring,
    updateMonitoring,
    deleteMonitoring,
    restoreMonitoring,
    permanentDeleteMonitoring,
    fetchMonitoring,
    searchMonitoring
  };
}
