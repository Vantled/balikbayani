// components/job-fair-monitoring-details.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobFairMonitoring } from '@/lib/types';

interface JobFairMonitoringDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: JobFairMonitoring | null;
}

export default function JobFairMonitoringDetails({
  open,
  onOpenChange,
  record
}: JobFairMonitoringDetailsProps) {
  if (!record) return null;

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateParticipationRate = () => {
    if (record.no_of_invited_agencies === 0) return 0;
    return ((record.no_of_agencies_with_jfa / record.no_of_invited_agencies) * 100).toFixed(1);
  };

  const calculateGenderRatio = () => {
    if (record.total_applicants === 0) return { male: 0, female: 0 };
    return {
      male: ((record.male_applicants / record.total_applicants) * 100).toFixed(1),
      female: ((record.female_applicants / record.total_applicants) * 100).toFixed(1)
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1976D2]">
            Job Fair Monitoring Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Date of Job Fair</label>
                <p className="text-gray-900 font-medium">{formatDate(record.date_of_job_fair)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Venue</label>
                <p className="text-gray-900 font-medium">{record.venue}</p>
              </div>
            </div>
          </div>

          {/* Agency Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Agency Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Invited Agencies</label>
                <p className="text-2xl font-bold text-blue-600">{record.no_of_invited_agencies}</p>
              </div>
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Agencies with JFA</label>
                <p className="text-2xl font-bold text-green-600">{record.no_of_agencies_with_jfa}</p>
              </div>
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Participation Rate</label>
                <p className="text-2xl font-bold text-purple-600">{calculateParticipationRate()}%</p>
              </div>
            </div>
          </div>

          {/* Applicant Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Applicant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Male Applicants</label>
                <p className="text-2xl font-bold text-blue-600">{record.male_applicants}</p>
                <p className="text-sm text-gray-500">{calculateGenderRatio().male}%</p>
              </div>
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Female Applicants</label>
                <p className="text-2xl font-bold text-pink-600">{record.female_applicants}</p>
                <p className="text-sm text-gray-500">{calculateGenderRatio().female}%</p>
              </div>
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Total Applicants</label>
                <p className="text-2xl font-bold text-green-600">{record.total_applicants}</p>
              </div>
              <div className="text-center">
                <label className="text-sm font-medium text-gray-600">Average per Agency</label>
                <p className="text-2xl font-bold text-purple-600">
                  {record.no_of_agencies_with_jfa > 0 
                    ? Math.round(record.total_applicants / record.no_of_agencies_with_jfa)
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="text-gray-900">{formatDateTime(record.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(record.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Summary Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Agency Participation Rate:</span>
                <span className="font-semibold">{calculateParticipationRate()}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gender Distribution:</span>
                <span className="font-semibold">
                  {calculateGenderRatio().male}% Male / {calculateGenderRatio().female}% Female
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Applicants per Participating Agency:</span>
                <span className="font-semibold">
                  {record.no_of_agencies_with_jfa > 0 
                    ? Math.round(record.total_applicants / record.no_of_agencies_with_jfa)
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
