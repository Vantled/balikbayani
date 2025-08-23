// components/job-fair-monitoring-table.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { JobFairMonitoring } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface JobFairMonitoringTableProps {
  data: JobFairMonitoring[];
  onEdit: (record: JobFairMonitoring) => void;
  onDelete: (id: string) => void;
  onView: (record: JobFairMonitoring) => void;
  loading?: boolean;
}

export default function JobFairMonitoringTable({
  data,
  onEdit,
  onDelete,
  onView,
  loading = false
}: JobFairMonitoringTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<JobFairMonitoring | null>(null);

  const handleDeleteClick = (record: JobFairMonitoring) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      onDelete(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date of Job Fair</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">No. of Invited Agencies</th>
                <th className="py-3 px-4 font-medium text-center">No. of Agencies with JFA</th>
                <th className="py-3 px-4 font-medium text-center">Male(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Female(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Total(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-8 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg">No job fair monitoring records found</p>
          <p className="text-gray-400 text-sm mt-2">Create your first monitoring record to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date of Job Fair</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">No. of Invited Agencies</th>
                <th className="py-3 px-4 font-medium text-center">No. of Agencies with JFA</th>
                <th className="py-3 px-4 font-medium text-center">Male(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Female(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Total(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">
                    {formatDate(record.date_of_job_fair)}
                  </td>
                  <td className="py-3 px-4 text-center font-medium">
                    {record.venue}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.no_of_invited_agencies}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.no_of_agencies_with_jfa}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.male_applicants}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.female_applicants}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold">
                    {record.total_applicants}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(record)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(record)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(record)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job fair monitoring record
              for {recordToDelete?.venue} on {recordToDelete ? formatDate(recordToDelete.date_of_job_fair) : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
