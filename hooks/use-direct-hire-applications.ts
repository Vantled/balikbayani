// hooks/use-direct-hire-applications.ts
import { useState, useEffect, useCallback } from 'react';
import { DirectHireApplication, ApiResponse, PaginatedResponse } from '@/lib/types';

interface UseDirectHireApplicationsReturn {
  applications: DirectHireApplication[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchApplications: (search?: string, page?: number) => Promise<void>;
  createApplication: (data: any) => Promise<DirectHireApplication | null>;
  updateApplication: (id: string, data: any) => Promise<DirectHireApplication | null>;
  deleteApplication: (id: string) => Promise<boolean>;
  refreshApplications: () => Promise<void>;
}

export function useDirectHireApplications(): UseDirectHireApplicationsReturn {
  const [applications, setApplications] = useState<DirectHireApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchApplications = useCallback(async (search?: string, page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/direct-hire?${params}`);
      const result: ApiResponse<PaginatedResponse<DirectHireApplication>> = await response.json();

      if (result.success && result.data) {
        setApplications(result.data.data);
        setPagination(result.data.pagination);
      } else {
        setError(result.error || 'Failed to fetch applications');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createApplication = useCallback(async (data: any): Promise<DirectHireApplication | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/direct-hire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<DirectHireApplication> = await response.json();

      if (result.success && result.data) {
        // Refresh the applications list
        await fetchApplications();
        return result.data;
      } else {
        setError(result.error || 'Failed to create application');
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error creating application:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchApplications]);

  const updateApplication = useCallback(async (id: string, data: any): Promise<DirectHireApplication | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/direct-hire/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<DirectHireApplication> = await response.json();

      if (result.success && result.data) {
        // Update the application in the local state
        setApplications(prev => 
          prev.map(app => app.id === id ? result.data! : app)
        );
        return result.data;
      } else {
        setError(result.error || 'Failed to update application');
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating application:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteApplication = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/direct-hire/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        // Remove the application from the local state
        setApplications(prev => prev.filter(app => app.id !== id));
        return true;
      } else {
        setError(result.error || 'Failed to delete application');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshApplications = useCallback(async () => {
    await fetchApplications();
  }, [fetchApplications]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    pagination,
    fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    refreshApplications
  };
}
