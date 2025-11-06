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
      
      // Format date for display
      // API returns dates as strings in YYYY-MM-DD format
      let displayDate = '';
      try {
        const dateStr = typeof data.date_of_job_fair === 'string' 
          ? data.date_of_job_fair 
          : data.date_of_job_fair instanceof Date
          ? data.date_of_job_fair.toISOString().split('T')[0]
          : new Date(data.date_of_job_fair).toISOString().split('T')[0];
        
        // Parse as local date to avoid timezone shifts
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        displayDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        displayDate = String(data.date_of_job_fair);
      }
      
      // Build details string
      const details: string[] = [];
      if (data.no_of_invited_agencies > 0) {
        details.push(`${data.no_of_invited_agencies} invited ${data.no_of_invited_agencies === 1 ? 'agency' : 'agencies'}`);
      }
      if (data.no_of_agencies_with_jfa > 0) {
        details.push(`${data.no_of_agencies_with_jfa} with JFA`);
      }
      if (data.total_applicants > 0) {
        details.push(`${data.total_applicants} total ${data.total_applicants === 1 ? 'applicant' : 'applicants'} (${data.male_applicants} male, ${data.female_applicants} female)`);
      }
      if (data.dmw_staff_assigned) {
        const staffCount = data.dmw_staff_assigned.split(',').filter(s => s.trim()).length;
        details.push(`${staffCount} DMW ${staffCount === 1 ? 'staff' : 'staff members'} assigned`);
      }
      
      const detailsText = details.length > 0 ? ` with ${details.join(', ')}` : '';
      
      toast({
        title: "Job Fair Monitoring Record Created Successfully",
        description: `Created monitoring record for job fair at "${data.venue}" scheduled for ${displayDate}${detailsText}.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Build detailed error toast
      // API returns dates as strings in YYYY-MM-DD format
      let displayDate = '';
      try {
        const dateStr = typeof data.date_of_job_fair === 'string' 
          ? data.date_of_job_fair 
          : data.date_of_job_fair instanceof Date
          ? data.date_of_job_fair.toISOString().split('T')[0]
          : new Date(data.date_of_job_fair).toISOString().split('T')[0];
        
        // Parse as local date to avoid timezone shifts
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        displayDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        displayDate = String(data.date_of_job_fair);
      }
      
      const venueInfo = data.venue ? ` for "${data.venue}"` : '';
      const dateInfo = displayDate ? ` scheduled for ${displayDate}` : '';
      
      toast({
        title: "Failed to Create Job Fair Monitoring Record",
        description: `Unable to create monitoring record${venueInfo}${dateInfo}. ${errorMessage}`,
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
      
      // Format date for display
      // API returns dates as strings in YYYY-MM-DD format
      let displayDate = '';
      try {
        const dateStr = typeof data.date_of_job_fair === 'string' 
          ? data.date_of_job_fair 
          : data.date_of_job_fair instanceof Date
          ? data.date_of_job_fair.toISOString().split('T')[0]
          : new Date(data.date_of_job_fair).toISOString().split('T')[0];
        
        // Parse as local date to avoid timezone shifts
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        displayDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        displayDate = String(data.date_of_job_fair);
      }
      
      // Build details string
      const details: string[] = [];
      if (data.no_of_invited_agencies > 0) {
        details.push(`${data.no_of_invited_agencies} invited ${data.no_of_invited_agencies === 1 ? 'agency' : 'agencies'}`);
      }
      if (data.no_of_agencies_with_jfa > 0) {
        details.push(`${data.no_of_agencies_with_jfa} with JFA`);
      }
      if (data.total_applicants > 0) {
        details.push(`${data.total_applicants} total ${data.total_applicants === 1 ? 'applicant' : 'applicants'} (${data.male_applicants} male, ${data.female_applicants} female)`);
      }
      if (data.dmw_staff_assigned) {
        const staffCount = data.dmw_staff_assigned.split(',').filter(s => s.trim()).length;
        details.push(`${staffCount} DMW ${staffCount === 1 ? 'staff' : 'staff members'} assigned`);
      }
      
      const detailsText = details.length > 0 ? ` with ${details.join(', ')}` : '';
      
      toast({
        title: "Job Fair Monitoring Record Updated Successfully",
        description: `Updated monitoring record for job fair at "${data.venue}" scheduled for ${displayDate}${detailsText}.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Build detailed error toast
      // API returns dates as strings in YYYY-MM-DD format
      let displayDate = '';
      try {
        const dateStr = typeof data.date_of_job_fair === 'string' 
          ? data.date_of_job_fair 
          : data.date_of_job_fair instanceof Date
          ? data.date_of_job_fair.toISOString().split('T')[0]
          : new Date(data.date_of_job_fair).toISOString().split('T')[0];
        
        // Parse as local date to avoid timezone shifts
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        displayDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        displayDate = String(data.date_of_job_fair);
      }
      
      const venueInfo = data.venue ? ` for "${data.venue}"` : '';
      const dateInfo = displayDate ? ` scheduled for ${displayDate}` : '';
      
      toast({
        title: "Failed to Update Job Fair Monitoring Record",
        description: `Unable to update monitoring record${venueInfo}${dateInfo}. ${errorMessage}`,
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
      // Get record details before deleting for detailed toast
      const record = monitoringData.find(r => r.id === id);
      
      const response = await fetch(`/api/job-fair-monitoring/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete monitoring record');
      }
      
      await fetchMonitoring(pagination.page, pagination.limit);
      
      // Build detailed toast message
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Job Fair Monitoring Record Deleted Successfully",
          description: `Deleted monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}.`,
        });
      } else {
        toast({
          title: "Job Fair Monitoring Record Deleted Successfully",
          description: "Monitoring record has been deleted successfully.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Build detailed error toast
      const record = monitoringData.find(r => r.id === id);
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Failed to Delete Job Fair Monitoring Record",
          description: `Unable to delete monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}. ${errorMessage}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to Delete Job Fair Monitoring Record",
          description: `Unable to delete monitoring record. ${errorMessage}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const restoreMonitoring = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get record details before restoring for detailed toast
      // Need to fetch with showDeletedOnly to get the deleted record
      const deletedResponse = await fetch(`/api/job-fair-monitoring?showDeletedOnly=true&limit=1000&page=1`);
      let record: JobFairMonitoring | undefined;
      if (deletedResponse.ok) {
        const deletedData = await deletedResponse.json();
        record = deletedData.data?.find((r: JobFairMonitoring) => r.id === id);
      }
      
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
      
      // Build detailed toast message
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Job Fair Monitoring Record Restored Successfully",
          description: `Restored monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}.`,
        });
      } else {
        toast({
          title: "Job Fair Monitoring Record Restored Successfully",
          description: "Monitoring record has been restored successfully.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Build detailed error toast
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Failed to Restore Job Fair Monitoring Record",
          description: `Unable to restore monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}. ${errorMessage}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to Restore Job Fair Monitoring Record",
          description: `Unable to restore monitoring record. ${errorMessage}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const permanentDeleteMonitoring = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get record details before permanently deleting for detailed toast
      // Need to fetch with showDeletedOnly to get the deleted record
      const deletedResponse = await fetch(`/api/job-fair-monitoring?showDeletedOnly=true&limit=1000&page=1`);
      let record: JobFairMonitoring | undefined;
      if (deletedResponse.ok) {
        const deletedData = await deletedResponse.json();
        record = deletedData.data?.find((r: JobFairMonitoring) => r.id === id);
      }
      
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
      
      // Build detailed toast message
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Job Fair Monitoring Record Permanently Deleted",
          description: `Permanently deleted monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}. This action cannot be undone.`,
        });
      } else {
        toast({
          title: "Job Fair Monitoring Record Permanently Deleted",
          description: "Monitoring record has been permanently deleted. This action cannot be undone.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Build detailed error toast
      if (record) {
        let displayDate = '';
        try {
          // API returns dates as strings in YYYY-MM-DD format
          const dateStr = typeof record.date_of_job_fair === 'string' 
            ? record.date_of_job_fair 
            : record.date_of_job_fair instanceof Date
            ? record.date_of_job_fair.toISOString().split('T')[0]
            : new Date(record.date_of_job_fair).toISOString().split('T')[0];
          
          // Parse as local date to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          displayDate = String(record.date_of_job_fair);
        }
        
        toast({
          title: "Failed to Permanently Delete Job Fair Monitoring Record",
          description: `Unable to permanently delete monitoring record for job fair at "${record.venue}" scheduled for ${displayDate}. ${errorMessage}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to Permanently Delete Job Fair Monitoring Record",
          description: `Unable to permanently delete monitoring record. ${errorMessage}`,
          variant: "destructive"
        });
      }
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
