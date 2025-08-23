// components/job-fair-details.tsx
import { Button } from '@/components/ui/button';
import { X, Calendar, MapPin, User, Mail, Phone } from 'lucide-react';
import { JobFair } from '@/lib/types';

interface JobFairDetailsProps {
  jobFair: JobFair;
  onClose: () => void;
}

export default function JobFairDetails({ jobFair, onClose }: JobFairDetailsProps) {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1976D2] text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Job Fair Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Date with Rescheduled Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <h3 className="font-medium text-gray-900">Date</h3>
                  <p className="text-gray-600">{formatDate(jobFair.date)}</p>
                </div>
              </div>
              {jobFair.is_rescheduled && (
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  Rescheduled
                </span>
              )}
            </div>

            {/* Venue */}
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="font-medium text-gray-900">Venue</h3>
                <p className="text-gray-600">{jobFair.venue}</p>
              </div>
            </div>

            {/* Office Head */}
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="font-medium text-gray-900">Office Head</h3>
                <p className="text-gray-600">{jobFair.office_head}</p>
              </div>
            </div>

            {/* Email Addresses */}
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">Email Addresses</h3>
                                 {jobFair.emails && jobFair.emails.length > 0 ? (
                   <div className="space-y-2">
                     {jobFair.emails.map((email, index) => (
                       <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                         <span className={jobFair.emails.length === 1 ? "text-gray-600" : "text-gray-600 text-sm"}>{email.email_address}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-gray-500">No email addresses available</p>
                 )}
              </div>
            </div>

            {/* Contact Numbers */}
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">Contact Numbers</h3>
                                 {jobFair.contacts && jobFair.contacts.length > 0 ? (
                   <div className="space-y-2">
                     {jobFair.contacts.map((contact, index) => (
                       <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                         <span className={jobFair.contacts.length === 1 ? "font-medium text-gray-600 min-w-[80px]" : "text-sm font-medium text-gray-600 min-w-[80px]"}>
                           {contact.contact_category}:
                         </span>
                         <span className={jobFair.contacts.length === 1 ? "text-gray-600" : "text-gray-600"}>{contact.contact_number}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-gray-500">No contact numbers available</p>
                 )}
              </div>
            </div>

            {/* Created/Updated Info */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(jobFair.created_at)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {formatDate(jobFair.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
