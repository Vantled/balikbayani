// components/job-fair-monitoring-modal.tsx
import { useState, useEffect, useRef } from 'react';
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

  // Only fetch past job fairs once when modal opens for creating new record
  useEffect(() => {
    if (open && !editingRecord && !hasFetchedRef.current) {
      fetchPastJobFairs();
      hasFetchedRef.current = true;
    }
  }, [open, editingRecord, fetchPastJobFairs]);

  // Reset the fetch flag when modal closes
  useEffect(() => {
    if (!open) {
      hasFetchedRef.current = false;
    }
  }, [open]);

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

  const handleJobFairSelection = (jobFairId: string) => {
    const selectedJobFair = pastJobFairs.find(jf => jf.id === jobFairId);
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

    await onSubmit(monitoringData);
    onOpenChange(false);
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
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
       <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-visible">
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
                   value={formData.selectedJobFairId}
                   onValueChange={handleJobFairSelection}
                   disabled={pastJobFairsLoading}
                 >
                   <SelectTrigger className={`mt-1 ${errors.selectedJobFairId ? 'border-red-500 focus:border-red-500' : ''}`}>
                     <SelectValue placeholder={pastJobFairsLoading ? "Loading job fairs..." : "Choose a past job fair"} />
                   </SelectTrigger>
                   <SelectContent className="z-[70]">
                     {pastJobFairs.length === 0 ? (
                       <div className="px-2 py-1.5 text-sm text-muted-foreground">
                         No past job fairs found
                       </div>
                     ) : (
                       pastJobFairs.map((jobFair) => (
                         <SelectItem key={jobFair.id} value={jobFair.id}>
                           {formatJobFairOption(jobFair)}
                         </SelectItem>
                       ))
                     )}
                   </SelectContent>
                 </Select>
                {errors.selectedJobFairId && (
                  <p className="text-xs text-red-500 mt-1">{errors.selectedJobFairId}</p>
                )}
                {pastJobFairs.length === 0 && !pastJobFairsLoading && (
                  <p className="text-xs text-orange-500 mt-1">
                    No past job fairs found. Please add job fairs with dates in the past first.
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
