// hooks/use-job-fairs.ts
import { useState, useEffect } from 'react';
import { JobFair, JobFairContact, PaginatedResponse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface UseJobFairsReturn {
  jobFairs: JobFair[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  createJobFair: (data: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }) => Promise<void>;
  updateJobFair: (id: string, data: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }) => Promise<void>;
  deleteJobFair: (id: string) => Promise<void>;
  fetchJobFairs: (page?: number, limit?: number, showDeletedOnly?: boolean) => Promise<void>;
  searchJobFairs: (search: string, showDeletedOnly?: boolean) => Promise<void>;
}

export function useJobFairs(): UseJobFairsReturn {
  const [jobFairs, setJobFairs] = useState<JobFair[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchJobFairs = async (page: number = 1, limit: number = 10, showDeletedOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fairs?page=${page}&limit=${limit}&showDeletedOnly=${showDeletedOnly}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job fairs data');
      }
      
      const data: PaginatedResponse<JobFair> = await response.json();
      setJobFairs(data.data);
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

  const createJobFair = async (data: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/job-fairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job fair record');
      }
      
      await fetchJobFairs(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair record created successfully",
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

  const updateJobFair = async (id: string, data: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fairs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update job fair record');
      }
      
      await fetchJobFairs(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair record updated successfully",
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

  const deleteJobFair = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fairs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete job fair record');
      }
      
      await fetchJobFairs(pagination.page, pagination.limit);
      toast({
        title: "Success",
        description: "Job fair record deleted successfully",
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

  const searchJobFairs = async (search: string, showDeletedOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-fairs?search=${encodeURIComponent(search)}&page=1&limit=${pagination.limit}&showDeletedOnly=${showDeletedOnly}`);
      
      if (!response.ok) {
        throw new Error('Failed to search job fairs data');
      }
      
      const data: PaginatedResponse<JobFair> = await response.json();
      setJobFairs(data.data);
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
    fetchJobFairs();
  }, []);

  return {
    jobFairs,
    pagination,
    loading,
    error,
    createJobFair,
    updateJobFair,
    deleteJobFair,
    fetchJobFairs,
    searchJobFairs
  };
}
