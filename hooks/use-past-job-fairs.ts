// hooks/use-past-job-fairs.ts
import { useState, useEffect } from 'react';
import { JobFair, PaginatedResponse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface UsePastJobFairsReturn {
  pastJobFairs: JobFair[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  fetchPastJobFairs: (page?: number, limit?: number, search?: string) => Promise<void>;
}

export function usePastJobFairs(): UsePastJobFairsReturn {
  const [pastJobFairs, setPastJobFairs] = useState<JobFair[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPastJobFairs = async (page: number = 1, limit: number = 50, search: string = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search.trim()) {
        searchParams.append('search', search.trim());
      }
      
      const response = await fetch(`/api/job-fairs/past?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch past job fairs');
      }
      
      const data: PaginatedResponse<JobFair> = await response.json();
      setPastJobFairs(data.data);
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

  return {
    pastJobFairs,
    pagination,
    loading,
    error,
    fetchPastJobFairs
  };
}
