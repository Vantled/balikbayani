// components/job-fair-monitoring-details.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
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



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
        <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold">Job Fair Monitoring Details</DialogTitle>
          <DialogClose asChild>
            <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
          </DialogClose>
        </div>
        
        <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="mb-6">
            <div className="font-semibold text-gray-700 mb-2">Basic Information</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-gray-500">Date of Job Fair:</div>
                <div className="font-medium">{formatDate(record.date_of_job_fair)}</div>
              </div>
              <div>
                <div className="text-gray-500">Venue:</div>
                <div className="font-medium">{record.venue}</div>
              </div>
            </div>
          </div>
          <hr className="my-4" />

          {/* Agency Information */}
          <div className="mb-6">
            <div className="font-semibold text-gray-700 mb-2">Agency Information</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-gray-500">No. of Invited Agencies:</div>
                <div className="font-medium">{record.no_of_invited_agencies}</div>
              </div>
              <div>
                <div className="text-gray-500">No. of Agencies with JFA:</div>
                <div className="font-medium">{record.no_of_agencies_with_jfa}</div>
              </div>
            </div>
          </div>
          <hr className="my-4" />

          {/* Applicant Information */}
          <div className="mb-6">
            <div className="font-semibold text-gray-700 mb-2">Applicant Information</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-gray-500">Male Applicants:</div>
                <div className="font-medium">{record.male_applicants}</div>
              </div>
              <div>
                <div className="text-gray-500">Female Applicants:</div>
                <div className="font-medium">{record.female_applicants}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Applicants:</div>
                <div className="font-medium">{record.total_applicants}</div>
              </div>
            </div>
          </div>
          <hr className="my-4" />

          {/* DMW Staff Assigned */}
          <div className="mb-6">
            <div className="font-semibold text-gray-700 mb-2">DMW Staff Assigned</div>
            <div className="text-sm">
              {record.dmw_staff_assigned ? (
                <ul className="list-disc list-inside space-y-1">
                  {record.dmw_staff_assigned.split(',').map((staff, index) => (
                    <li key={index} className="text-gray-700">{staff.trim()}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500">No staff assigned</div>
              )}
            </div>
          </div>
          <hr className="my-4" />

          {/* System Information */}
          <div>
            <div className="font-semibold text-gray-700 mb-2">System Information</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-gray-500">Created:</div>
                <div className="font-medium">{formatDateTime(record.created_at)}</div>
              </div>
              <div>
                <div className="text-gray-500">Last Updated:</div>
                <div className="font-medium">{formatDateTime(record.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
