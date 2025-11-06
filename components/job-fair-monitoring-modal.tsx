// components/job-fair-monitoring-modal.tsx
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, FileText, Loader2, Plus } from 'lucide-react';
import { JobFairMonitoring, JobFair } from '@/lib/types';
import { usePastJobFairs } from '@/hooks/use-past-job-fairs';

interface JobFairMonitoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editingRecord?: JobFairMonitoring | null;
  loading?: boolean;
}

export default function JobFairMonitoringModal({
  open,
  onOpenChange,
  onSubmit,
  editingRecord,
  loading = false
}: JobFairMonitoringModalProps) {
  const { pastJobFairs, fetchPastJobFairs, loading: pastJobFairsLoading } = usePastJobFairs();
  const hasFetchedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [usedJobFairs, setUsedJobFairs] = useState<Set<string>>(new Set());
  const [loadingUsedJobFairs, setLoadingUsedJobFairs] = useState(false);
  
  const [formData, setFormData] = useState({
    selectedJobFairId: '',
    date_of_job_fair: '',
    venue: '',
    no_of_invited_agencies: '',
    no_of_agencies_with_jfa: '',
    male_applicants: '',
    female_applicants: '',
    dmw_staff_assigned: ''
  });

  const [dmwStaffList, setDmwStaffList] = useState<string[]>([]);
  const [newStaffInput, setNewStaffInput] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch used job fairs (existing monitoring records) to filter them out
  // Requirements:
  // 1. Job fair must be on the @list page (handled by usePastJobFairs)
  // 2. Job fair must have already passed (handled by getPastJobFairs API - DATE(date) <= CURRENT_DATE)
  // 3. Job fair must not have been picked before (filtered out here by comparing date + venue)
  // Always refetch when opening for creating to ensure we have the latest data
  useEffect(() => {
    if (open && !editingRecord) {
      const fetchUsedJobFairs = async () => {
        setLoadingUsedJobFairs(true);
        setHasLoadedUsedJobFairs(false);
        try {
          // Small delay to ensure any recently created records are committed to the database
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Fetch all non-deleted monitoring records (they're filtered by default)
          // This gives us the list of job fairs that have already been evaluated
          const response = await fetch('/api/job-fair-monitoring?limit=1000&page=1');
          if (response.ok) {
            const data = await response.json();
            const monitoringRecords = data.data || [];
            
            // Create a set of used job fair identifiers (date + venue)
            // Normalize dates to YYYY-MM-DD format - API now returns dates as strings
            // and venues to uppercase trimmed
            const used = new Set<string>();
            monitoringRecords.forEach((record: JobFairMonitoring) => {
              let dateStr: string;
              try {
                // API now returns dates as strings in YYYY-MM-DD format
                if (typeof record.date_of_job_fair === 'string') {
                  // Extract date part directly from string
                  if (record.date_of_job_fair.includes('T')) {
                    // ISO format: extract date part before 'T'
                    dateStr = record.date_of_job_fair.split('T')[0];
                  } else if (record.date_of_job_fair.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Already in YYYY-MM-DD format - use directly
                    dateStr = record.date_of_job_fair;
                  } else {
                    // Parse and use local timezone (not UTC)
                    const date = new Date(record.date_of_job_fair);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    dateStr = `${year}-${month}-${day}`;
                  }
                } else if (record.date_of_job_fair instanceof Date) {
                  // Fallback: if it's a Date object, use local timezone methods
                  const year = record.date_of_job_fair.getFullYear();
                  const month = String(record.date_of_job_fair.getMonth() + 1).padStart(2, '0');
                  const day = String(record.date_of_job_fair.getDate()).padStart(2, '0');
                  dateStr = `${year}-${month}-${day}`;
                } else {
                  // Fallback: use local timezone
                  const date = new Date(record.date_of_job_fair);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  dateStr = `${year}-${month}-${day}`;
                }
              } catch (e) {
                console.error('Error normalizing monitoring record date:', record.date_of_job_fair, e);
                return; // Skip this record if we can't parse the date
              }
              
              const venue = (record.venue || '').trim().toUpperCase();
              const key = `${dateStr}|${venue}`;
              used.add(key);
            });
            setUsedJobFairs(used);
            setHasLoadedUsedJobFairs(true); // Mark as loaded after successful fetch
          }
        } catch (error) {
          console.error('Error fetching used job fairs:', error);
        } finally {
          setLoadingUsedJobFairs(false);
        }
      };
      
      fetchUsedJobFairs();
    } else if (!open) {
      // Reset when modal closes - this ensures fresh data on next open
      setUsedJobFairs(new Set());
      setHasLoadedUsedJobFairs(false);
    }
  }, [open, editingRecord]);

  // Fetch past job fairs when modal opens for creating new record
  // Always refetch to get the latest job fairs (including newly created ones)
  useEffect(() => {
    if (open && !editingRecord) {
      // Always refetch to ensure we have the latest data
      fetchPastJobFairs(1, 50, '');
      hasFetchedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingRecord]); // Don't include fetchPastJobFairs to avoid infinite loop

  // Reset the fetch flag when modal closes
  useEffect(() => {
    if (!open) {
      hasFetchedRef.current = false;
      // Don't reset usedJobFairs here - let it reset in the other useEffect
      // This way if modal reopens quickly, we still have the data
    }
  }, [open]);

  // Enter animation
  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(t)
    } else {
      setMounted(false)
    }
  }, [open])

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        selectedJobFairId: '',
        date_of_job_fair: editingRecord.date_of_job_fair instanceof Date 
          ? editingRecord.date_of_job_fair.toISOString().split('T')[0]
          : new Date(editingRecord.date_of_job_fair).toISOString().split('T')[0],
        venue: editingRecord.venue,
        no_of_invited_agencies: editingRecord.no_of_invited_agencies.toString(),
        no_of_agencies_with_jfa: editingRecord.no_of_agencies_with_jfa.toString(),
        male_applicants: editingRecord.male_applicants.toString(),
        female_applicants: editingRecord.female_applicants.toString(),
        dmw_staff_assigned: editingRecord.dmw_staff_assigned || ''
      });
      // Parse DMW staff from comma-separated string
      setDmwStaffList(editingRecord.dmw_staff_assigned ? editingRecord.dmw_staff_assigned.split(',').map(s => s.trim()).filter(s => s) : []);
    } else {
      setFormData({
        selectedJobFairId: '',
        date_of_job_fair: '',
        venue: '',
        no_of_invited_agencies: '',
        no_of_agencies_with_jfa: '',
        male_applicants: '',
        female_applicants: '',
        dmw_staff_assigned: ''
      });
      setDmwStaffList([]);
    }
    setNewStaffInput('');
    setErrors({});
  }, [editingRecord, open]);

  // Track if we've loaded used job fairs at least once
  const [hasLoadedUsedJobFairs, setHasLoadedUsedJobFairs] = useState(false);
  
  // Update flag when loading completes
  useEffect(() => {
    if (!loadingUsedJobFairs && open && !editingRecord) {
      setHasLoadedUsedJobFairs(true);
    }
  }, [loadingUsedJobFairs, open, editingRecord]);

  // Filter out job fairs that are already used in monitoring records
  // Only filter when creating (not editing) and when we have loaded the used job fairs
  const availableJobFairs = React.useMemo(() => {
    if (editingRecord) return pastJobFairs; // Show all when editing
    
    // Wait until we've loaded used job fairs at least once before filtering
    if (loadingUsedJobFairs || !hasLoadedUsedJobFairs) {
      // If we haven't loaded yet, return empty array to prevent selection
      return [];
    }
    
    // Filter out used job fairs
    const filtered = pastJobFairs.filter((jobFair) => {
      // Normalize date to YYYY-MM-DD format - API returns dates as strings
      // This must match the normalization used for monitoring records
      let dateStr: string;
      try {
        // API now returns dates as strings in YYYY-MM-DD format
        if (typeof jobFair.date === 'string') {
          // If it's a string, extract date part directly
          if (jobFair.date.includes('T')) {
            // ISO format: extract date part before 'T'
            dateStr = jobFair.date.split('T')[0];
          } else if (jobFair.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in YYYY-MM-DD format - use directly
            dateStr = jobFair.date;
          } else {
            // Parse and use local timezone (not UTC)
            const date = new Date(jobFair.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          }
        } else if (jobFair.date instanceof Date) {
          // Fallback: if it's a Date object, use local timezone methods
          const year = jobFair.date.getFullYear();
          const month = String(jobFair.date.getMonth() + 1).padStart(2, '0');
          const day = String(jobFair.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          // Fallback: use local timezone
          const date = new Date(jobFair.date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.error('Error normalizing job fair date:', jobFair.date, e);
        return true; // Include if we can't parse the date
      }
      
      // Normalize venue to uppercase trimmed
      const venue = (jobFair.venue || '').trim().toUpperCase();
      const key = `${dateStr}|${venue}`;
      
      const isUsed = usedJobFairs.has(key);
      return !isUsed;
    });
    
    return filtered;
  }, [pastJobFairs, usedJobFairs, loadingUsedJobFairs, editingRecord, hasLoadedUsedJobFairs]);

  const handleJobFairSelection = (jobFairId: string) => {
    // Use availableJobFairs when creating, pastJobFairs when editing
    const jobFairsList = editingRecord ? pastJobFairs : availableJobFairs;
    const selectedJobFair = jobFairsList.find(jf => jf.id === jobFairId);
    
    if (!selectedJobFair) {
      // Job fair not found in available list - this shouldn't happen, but prevent it
      console.warn('Selected job fair not found in available list:', jobFairId);
      return;
    }
    
    // Double-check that the job fair is not used (when creating)
    // Use the same date normalization as in the filter (local timezone, not UTC)
    if (!editingRecord && hasLoadedUsedJobFairs) {
      let dateStr: string;
      try {
        if (selectedJobFair.date instanceof Date) {
          // Use local timezone methods to extract date part (not UTC)
          const year = selectedJobFair.date.getFullYear();
          const month = String(selectedJobFair.date.getMonth() + 1).padStart(2, '0');
          const day = String(selectedJobFair.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else if (typeof selectedJobFair.date === 'string') {
          if (selectedJobFair.date.includes('T')) {
            dateStr = selectedJobFair.date.split('T')[0];
          } else if (selectedJobFair.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateStr = selectedJobFair.date;
          } else {
            const date = new Date(selectedJobFair.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          }
        } else {
          const date = new Date(selectedJobFair.date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.error('Error normalizing date in handleJobFairSelection:', e);
        return;
      }
      
      const venue = (selectedJobFair.venue || '').trim().toUpperCase();
      const key = `${dateStr}|${venue}`;
      
      if (usedJobFairs.has(key)) {
        setErrors(prev => ({
          ...prev,
          selectedJobFairId: 'This job fair has already been used in a previous monitoring record.'
        }));
        return;
      }
    }
    
    if (selectedJobFair) {
      setFormData(prev => ({
        ...prev,
        selectedJobFairId: jobFairId,
        date_of_job_fair: selectedJobFair.date instanceof Date 
          ? selectedJobFair.date.toISOString().split('T')[0]
          : new Date(selectedJobFair.date).toISOString().split('T')[0],
        venue: selectedJobFair.venue
      }));
      
      // Clear errors for these fields
      setErrors(prev => ({
        ...prev,
        selectedJobFairId: '',
        date_of_job_fair: '',
        venue: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!editingRecord && !formData.selectedJobFairId) {
      newErrors.selectedJobFairId = 'Please select a job fair';
    }

    if (!formData.date_of_job_fair) {
      newErrors.date_of_job_fair = 'Date is required';
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }

    if (!formData.no_of_invited_agencies || parseInt(formData.no_of_invited_agencies) < 0) {
      newErrors.no_of_invited_agencies = 'Number of invited agencies must be 0 or greater';
    }

    if (!formData.no_of_agencies_with_jfa || parseInt(formData.no_of_agencies_with_jfa) < 0) {
      newErrors.no_of_agencies_with_jfa = 'Number of agencies with JFA must be 0 or greater';
    }

    if (!formData.male_applicants || parseInt(formData.male_applicants) < 0) {
      newErrors.male_applicants = 'Male applicants must be 0 or greater';
    }

    if (!formData.female_applicants || parseInt(formData.female_applicants) < 0) {
      newErrors.female_applicants = 'Female applicants must be 0 or greater';
    }

    // Validate DMW staff list
    if (dmwStaffList.length === 0) {
      newErrors.dmw_staff_assigned = 'At least one DMW staff member is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const totalApplicants = parseInt(formData.male_applicants) + parseInt(formData.female_applicants);
    
    // Join DMW staff list into comma-separated string
    const dmwStaffAssigned = dmwStaffList.join(', ');
    
    const monitoringData = {
      date_of_job_fair: new Date(formData.date_of_job_fair),
      venue: formData.venue.trim(),
      no_of_invited_agencies: parseInt(formData.no_of_invited_agencies),
      no_of_agencies_with_jfa: parseInt(formData.no_of_agencies_with_jfa),
      male_applicants: parseInt(formData.male_applicants),
      female_applicants: parseInt(formData.female_applicants),
      total_applicants: totalApplicants,
      dmw_staff_assigned: dmwStaffAssigned
    };

    try {
      await onSubmit(monitoringData);
      
      // If creating (not editing), add the newly created record to usedJobFairs immediately
      // Use the actual form data (date and venue) that was submitted, not the selected job fair
      // Do this BEFORE closing the modal so the update doesn't get lost
      if (!editingRecord && formData.date_of_job_fair && formData.venue) {
        try {
          // Extract date part from form data (should be YYYY-MM-DD format from date input)
          // Use same normalization as elsewhere (local timezone, not UTC)
          let date: string;
          if (typeof formData.date_of_job_fair === 'string') {
            if (formData.date_of_job_fair.includes('T')) {
              date = formData.date_of_job_fair.split('T')[0];
            } else if (formData.date_of_job_fair.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Already in YYYY-MM-DD format - use directly
              date = formData.date_of_job_fair;
            } else {
              // Parse and use local timezone (not UTC)
              const dateObj = new Date(formData.date_of_job_fair);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              date = `${year}-${month}-${day}`;
            }
          } else {
            // Use local timezone (not UTC)
            const dateObj = new Date(formData.date_of_job_fair);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
          }
          const venue = formData.venue.trim().toUpperCase();
          const key = `${date}|${venue}`;
          
          // Add to used job fairs set
          setUsedJobFairs(prev => {
            const newSet = new Set(prev);
            newSet.add(key);
            return newSet;
          });
          
          // Also update the hasLoadedUsedJobFairs flag so the filter applies immediately
          setHasLoadedUsedJobFairs(true);
        } catch (e) {
          console.error('Error adding newly created job fair to used set:', e);
        }
      }
      
      // Small delay to ensure state updates are processed before closing
      setTimeout(() => {
        onOpenChange(false);
      }, 100);
    } catch (error) {
      console.error('Error submitting monitoring data:', error);
      // Don't close modal on error
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // DMW Staff management functions
  const addDmwStaff = () => {
    const trimmedInput = newStaffInput.trim();
    if (trimmedInput && !dmwStaffList.includes(trimmedInput)) {
      setDmwStaffList([...dmwStaffList, trimmedInput]);
      setNewStaffInput('');
      // Clear validation error
      if (errors.dmw_staff_assigned) {
        setErrors(prev => ({ ...prev, dmw_staff_assigned: '' }));
      }
    }
  };

  const removeDmwStaff = (staffToRemove: string) => {
    setDmwStaffList(dmwStaffList.filter(staff => staff !== staffToRemove));
  };

  const handleStaffInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDmwStaff();
    }
  };

  const formatJobFairOption = (jobFair: JobFair) => {
    const date = jobFair.date instanceof Date 
      ? jobFair.date.toLocaleDateString()
      : new Date(jobFair.date).toLocaleDateString();
    return `${date} - ${jobFair.venue}`;
  };

  if (!open) return null;

    return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${mounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} />
       <div className={`relative bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-visible transform transition-all duration-150 ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">
              {editingRecord ? 'Edit Job Fair Monitoring Record' : 'Create Job Fair Monitoring Record'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

                 {/* Modal Content */}
         <div className="p-6 overflow-visible max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
                         {!editingRecord && (
               <div>
                 <Label className="text-sm font-medium">Select Job Fair:</Label>
                 <Select
                   key={`job-fair-select-${usedJobFairs.size}-${hasLoadedUsedJobFairs}`}
                   value={formData.selectedJobFairId}
                   onValueChange={handleJobFairSelection}
                   disabled={pastJobFairsLoading || loadingUsedJobFairs || !hasLoadedUsedJobFairs}
                 >
                   <SelectTrigger className={`mt-1 ${errors.selectedJobFairId ? 'border-red-500 focus:border-red-500' : ''}`}>
                     <SelectValue placeholder={(pastJobFairsLoading || loadingUsedJobFairs || !hasLoadedUsedJobFairs) ? "Loading..." : "Choose a past job fair"} />
                   </SelectTrigger>
                   <SelectContent className="z-[70]">
                     {availableJobFairs.length === 0 ? (
                       <div className="px-2 py-1.5 text-sm text-muted-foreground">
                         {pastJobFairs.length === 0 
                           ? "No past job fairs found" 
                           : loadingUsedJobFairs || !hasLoadedUsedJobFairs
                           ? "Loading available job fairs..."
                           : "All available job fairs have been used"}
                       </div>
                     ) : (
                       <>
                         {availableJobFairs
                           .filter((jobFair) => {
                             // Double-check this job fair isn't used before rendering
                             if (editingRecord) return true;
                             
                             // Use same normalization as in availableJobFairs filter (local timezone)
                             let dateStr: string;
                             try {
                               if (jobFair.date instanceof Date) {
                                 // Use local timezone methods to extract date part (not UTC)
                                 const year = jobFair.date.getFullYear();
                                 const month = String(jobFair.date.getMonth() + 1).padStart(2, '0');
                                 const day = String(jobFair.date.getDate()).padStart(2, '0');
                                 dateStr = `${year}-${month}-${day}`;
                               } else if (typeof jobFair.date === 'string') {
                                 if (jobFair.date.includes('T')) {
                                   dateStr = jobFair.date.split('T')[0];
                                 } else if (jobFair.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                   dateStr = jobFair.date;
                                 } else {
                                   const date = new Date(jobFair.date);
                                   const year = date.getFullYear();
                                   const month = String(date.getMonth() + 1).padStart(2, '0');
                                   const day = String(date.getDate()).padStart(2, '0');
                                   dateStr = `${year}-${month}-${day}`;
                                 }
                               } else {
                                 const date = new Date(jobFair.date);
                                 const year = date.getFullYear();
                                 const month = String(date.getMonth() + 1).padStart(2, '0');
                                 const day = String(date.getDate()).padStart(2, '0');
                                 dateStr = `${year}-${month}-${day}`;
                               }
                             } catch (e) {
                               console.error('Error normalizing date in render filter:', e);
                               return true; // Include if we can't parse
                             }
                             const venue = (jobFair.venue || '').trim().toUpperCase();
                             const key = `${dateStr}|${venue}`;
                             
                            if (usedJobFairs.has(key)) {
                              return false; // Don't render used job fairs
                            }
                             return true;
                           })
                           .map((jobFair) => (
                             <SelectItem key={jobFair.id} value={jobFair.id}>
                               {formatJobFairOption(jobFair)}
                             </SelectItem>
                           ))}
                       </>
                     )}
                   </SelectContent>
                 </Select>
                {errors.selectedJobFairId && (
                  <p className="text-xs text-red-500 mt-1">{errors.selectedJobFairId}</p>
                )}
                {availableJobFairs.length === 0 && !pastJobFairsLoading && !loadingUsedJobFairs && (
                  <p className="text-xs text-orange-500 mt-1">
                    {pastJobFairs.length === 0
                      ? "No past job fairs found. Please add job fairs with dates in the past first."
                      : "All available job fairs have already been used in previous monitoring records."}
                  </p>
                )}
              </div>
            )}

                         <div>
               <Label className="text-sm font-medium">Date of Job Fair:</Label>
               <Input
                 type="date"
                 value={formData.date_of_job_fair}
                 onChange={(e) => handleInputChange('date_of_job_fair', e.target.value)}
                 className={`mt-1 ${errors.date_of_job_fair ? 'border-red-500 focus:border-red-500' : ''} ${!editingRecord && !!formData.selectedJobFairId ? 'bg-gray-100 text-gray-500' : ''}`}
                 readOnly={!editingRecord && !!formData.selectedJobFairId}
               />
               {errors.date_of_job_fair && (
                 <p className="text-xs text-red-500 mt-1">{errors.date_of_job_fair}</p>
               )}
             </div>

             <div>
               <Label className="text-sm font-medium">Venue:</Label>
               <Input
                 type="text"
                 value={formData.venue}
                 onChange={(e) => handleInputChange('venue', e.target.value)}
                 placeholder="Enter venue"
                 className={`mt-1 ${errors.venue ? 'border-red-500 focus:border-red-500' : ''} ${!editingRecord && !!formData.selectedJobFairId ? 'bg-gray-100 text-gray-500' : ''}`}
                 readOnly={!editingRecord && !!formData.selectedJobFairId}
               />
               {errors.venue && (
                 <p className="text-xs text-red-500 mt-1">{errors.venue}</p>
               )}
             </div>

            <div>
              <Label className="text-sm font-medium">Number of Invited Agencies:</Label>
              <Input
                type="number"
                min="0"
                value={formData.no_of_invited_agencies}
                onChange={(e) => handleInputChange('no_of_invited_agencies', e.target.value)}
                className={`mt-1 ${errors.no_of_invited_agencies ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.no_of_invited_agencies && (
                <p className="text-xs text-red-500 mt-1">{errors.no_of_invited_agencies}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Number of Agencies with JFA:</Label>
              <Input
                type="number"
                min="0"
                value={formData.no_of_agencies_with_jfa}
                onChange={(e) => handleInputChange('no_of_agencies_with_jfa', e.target.value)}
                className={`mt-1 ${errors.no_of_agencies_with_jfa ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.no_of_agencies_with_jfa && (
                <p className="text-xs text-red-500 mt-1">{errors.no_of_agencies_with_jfa}</p>
              )}
            </div>

            {/* Male and Female Applicants on the same line */}
            <div>
              <div className="flex gap-2 mb-1">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Male Applicants:</Label>
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">Female Applicants:</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    value={formData.male_applicants}
                    onChange={(e) => handleInputChange('male_applicants', e.target.value)}
                    className={errors.male_applicants ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {errors.male_applicants && (
                    <p className="text-xs text-red-500 mt-1">{errors.male_applicants}</p>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    value={formData.female_applicants}
                    onChange={(e) => handleInputChange('female_applicants', e.target.value)}
                    className={errors.female_applicants ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {errors.female_applicants && (
                    <p className="text-xs text-red-500 mt-1">{errors.female_applicants}</p>
                  )}
                </div>
              </div>
            </div>

                         <div>
               <Label className="text-sm font-medium">DMW Staff Assigned to the Job Fair:</Label>
               <div className="space-y-3">
                 {/* Input field for adding new staff */}
                 <div className="flex gap-2">
                   <Input
                     type="text"
                     value={newStaffInput}
                     onChange={(e) => setNewStaffInput(e.target.value)}
                     onKeyPress={handleStaffInputKeyPress}
                     placeholder="Enter DMW staff name and press Enter"
                     className="flex-1"
                   />
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={addDmwStaff}
                     disabled={!newStaffInput.trim()}
                   >
                     <Plus className="h-4 w-4" />
                   </Button>
                 </div>
                 
                 {/* Display staff tags */}
                 {dmwStaffList.length > 0 && (
                   <div className="flex flex-wrap gap-2">
                     {dmwStaffList.map((staff, index) => (
                       <div
                         key={index}
                         className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                       >
                         <span>{staff}</span>
                         <button
                           type="button"
                           onClick={() => removeDmwStaff(staff)}
                           className="text-blue-600 hover:text-blue-800 ml-1"
                         >
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               {errors.dmw_staff_assigned && (
                 <p className="text-xs text-red-500 mt-1">{errors.dmw_staff_assigned}</p>
               )}
             </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1976D2] hover:bg-[#1565C0] text-white"
                disabled={loading || pastJobFairsLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingRecord ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
