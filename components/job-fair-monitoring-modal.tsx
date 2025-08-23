// components/job-fair-monitoring-modal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JobFairMonitoring } from '@/lib/types';

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
  const [formData, setFormData] = useState({
    date_of_job_fair: '',
    venue: '',
    no_of_invited_agencies: '',
    no_of_agencies_with_jfa: '',
    male_applicants: '',
    female_applicants: '',
    total_applicants: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        date_of_job_fair: editingRecord.date_of_job_fair instanceof Date 
          ? editingRecord.date_of_job_fair.toISOString().split('T')[0]
          : new Date(editingRecord.date_of_job_fair).toISOString().split('T')[0],
        venue: editingRecord.venue,
        no_of_invited_agencies: editingRecord.no_of_invited_agencies.toString(),
        no_of_agencies_with_jfa: editingRecord.no_of_agencies_with_jfa.toString(),
        male_applicants: editingRecord.male_applicants.toString(),
        female_applicants: editingRecord.female_applicants.toString(),
        total_applicants: editingRecord.total_applicants.toString()
      });
    } else {
      setFormData({
        date_of_job_fair: '',
        venue: '',
        no_of_invited_agencies: '',
        no_of_agencies_with_jfa: '',
        male_applicants: '',
        female_applicants: '',
        total_applicants: ''
      });
    }
    setErrors({});
  }, [editingRecord, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const totalApplicants = parseInt(formData.male_applicants) + parseInt(formData.female_applicants);
    
    const monitoringData = {
      date_of_job_fair: new Date(formData.date_of_job_fair),
      venue: formData.venue.trim(),
      no_of_invited_agencies: parseInt(formData.no_of_invited_agencies),
      no_of_agencies_with_jfa: parseInt(formData.no_of_agencies_with_jfa),
      male_applicants: parseInt(formData.male_applicants),
      female_applicants: parseInt(formData.female_applicants),
      total_applicants
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? 'Edit Job Fair Monitoring Record' : 'Create Job Fair Monitoring Record'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date_of_job_fair">Date of Job Fair</Label>
            <Input
              id="date_of_job_fair"
              type="date"
              value={formData.date_of_job_fair}
              onChange={(e) => handleInputChange('date_of_job_fair', e.target.value)}
              className={errors.date_of_job_fair ? 'border-red-500' : ''}
            />
            {errors.date_of_job_fair && (
              <p className="text-sm text-red-500 mt-1">{errors.date_of_job_fair}</p>
            )}
          </div>

          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              type="text"
              value={formData.venue}
              onChange={(e) => handleInputChange('venue', e.target.value)}
              placeholder="Enter venue"
              className={errors.venue ? 'border-red-500' : ''}
            />
            {errors.venue && (
              <p className="text-sm text-red-500 mt-1">{errors.venue}</p>
            )}
          </div>

          <div>
            <Label htmlFor="no_of_invited_agencies">Number of Invited Agencies</Label>
            <Input
              id="no_of_invited_agencies"
              type="number"
              min="0"
              value={formData.no_of_invited_agencies}
              onChange={(e) => handleInputChange('no_of_invited_agencies', e.target.value)}
              className={errors.no_of_invited_agencies ? 'border-red-500' : ''}
            />
            {errors.no_of_invited_agencies && (
              <p className="text-sm text-red-500 mt-1">{errors.no_of_invited_agencies}</p>
            )}
          </div>

          <div>
            <Label htmlFor="no_of_agencies_with_jfa">Number of Agencies with JFA</Label>
            <Input
              id="no_of_agencies_with_jfa"
              type="number"
              min="0"
              value={formData.no_of_agencies_with_jfa}
              onChange={(e) => handleInputChange('no_of_agencies_with_jfa', e.target.value)}
              className={errors.no_of_agencies_with_jfa ? 'border-red-500' : ''}
            />
            {errors.no_of_agencies_with_jfa && (
              <p className="text-sm text-red-500 mt-1">{errors.no_of_agencies_with_jfa}</p>
            )}
          </div>

          <div>
            <Label htmlFor="male_applicants">Male Applicants</Label>
            <Input
              id="male_applicants"
              type="number"
              min="0"
              value={formData.male_applicants}
              onChange={(e) => handleInputChange('male_applicants', e.target.value)}
              className={errors.male_applicants ? 'border-red-500' : ''}
            />
            {errors.male_applicants && (
              <p className="text-sm text-red-500 mt-1">{errors.male_applicants}</p>
            )}
          </div>

          <div>
            <Label htmlFor="female_applicants">Female Applicants</Label>
            <Input
              id="female_applicants"
              type="number"
              min="0"
              value={formData.female_applicants}
              onChange={(e) => handleInputChange('female_applicants', e.target.value)}
              className={errors.female_applicants ? 'border-red-500' : ''}
            />
            {errors.female_applicants && (
              <p className="text-sm text-red-500 mt-1">{errors.female_applicants}</p>
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
              className="bg-[#1976D2] text-white hover:bg-[#1565C0]"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingRecord ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
