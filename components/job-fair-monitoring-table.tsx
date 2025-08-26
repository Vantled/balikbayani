// components/job-fair-monitoring-table.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Eye, RefreshCcw, Loader2 } from 'lucide-react';
import { JobFairMonitoring } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JobFairMonitoringTableProps {
  data: JobFairMonitoring[];
  onEdit: (record: JobFairMonitoring) => void;
  onDelete: (id: string) => void;
  onView: (record: JobFairMonitoring) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  loading?: boolean;
  search?: string;
  filterQuery?: string;
  showDeletedOnly?: boolean;
  setShowDeletedOnly?: (value: boolean) => void;
  currentUser?: any;
  fetchMonitoring?: (page?: number, limit?: number, search?: string, filterQuery?: string, showDeletedOnly?: boolean) => Promise<void>;
}

export default function JobFairMonitoringTable({
  data,
  onEdit,
  onDelete,
  onView,
  onRestore,
  onPermanentDelete,
  loading = false,
  search = "",
  filterQuery = "",
  showDeletedOnly = false,
  setShowDeletedOnly,
  currentUser,
  fetchMonitoring
}: JobFairMonitoringTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<JobFairMonitoring | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [recordToRestore, setRecordToRestore] = useState<JobFairMonitoring | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [recordToPermanentDelete, setRecordToPermanentDelete] = useState<JobFairMonitoring | null>(null);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmingPassword, setConfirmingPassword] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("");
  const { toast } = useToast();



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

  const handleRestoreClick = (record: JobFairMonitoring) => {
    setRecordToRestore(record);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = () => {
    if (recordToRestore && onRestore) {
      onRestore(recordToRestore.id);
      setRestoreDialogOpen(false);
      setRecordToRestore(null);
    }
  };

  const handlePermanentDeleteClick = (record: JobFairMonitoring) => {
    setRecordToPermanentDelete(record);
    setPermanentDeleteDialogOpen(true);
  };

  const handlePermanentDeleteConfirm = () => {
    if (recordToPermanentDelete && onPermanentDelete) {
      onPermanentDelete(recordToPermanentDelete.id);
      setPermanentDeleteDialogOpen(false);
      setRecordToPermanentDelete(null);
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
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date of Job Fair</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">Male(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Female(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Total(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">DMW Staff Assigned</th>
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
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
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



  return (
    <>
      <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
        {/* Superadmin controls */}
        <div className="flex items-center justify-end px-4 py-2 border-b bg-gray-50 gap-6">
          {currentUser?.role === 'superadmin' && (
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={showDeletedOnly}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Require password confirmation before enabling
                    setConfirmPasswordOpen(true)
                  } else {
                    setShowDeletedOnly?.(false)
                    fetchMonitoring?.(1, 10, search, filterQuery, false)
                  }
                }}
              />
              Show deleted only
            </label>
          )}
        </div>
        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date of Job Fair</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">Male(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Female(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">Total(Applicants)</th>
                <th className="py-3 px-4 font-medium text-center">DMW Staff Assigned</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-gray-500 text-lg">No job fair monitoring records found</p>
                      <p className="text-gray-400 text-sm mt-2">Create your first monitoring record to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((record) => (
                  <tr key={record.id} className={`hover:bg-gray-50 ${record.deleted_at ? 'bg-red-50' : ''}`}>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span>{formatDate(record.date_of_job_fair)}</span>
                        {record.deleted_at && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full mt-1">
                            Deleted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {record.venue}
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
                      {record.dmw_staff_assigned || '-'}
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
                          {showDeletedOnly ? (
                            // Show restore and permanent delete for deleted records
                            <>
                              <DropdownMenuItem onClick={() => handleRestoreClick(record)}>
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePermanentDeleteClick(record)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Permanent Delete
                              </DropdownMenuItem>
                            </>
                          ) : (
                            // Show edit and delete for active records
                            <>
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
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the job fair monitoring record for {recordToDelete?.venue} on {recordToDelete ? formatDate(recordToDelete.date_of_job_fair) : ''} to the deleted records. 
              The record can be restored later by a superadmin if needed.
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

      <AlertDialog open={restoreDialogOpen} onOpenChange={(open) => {
        setRestoreDialogOpen(open);
        if (!open) setRestoreConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore the job fair monitoring record
              for {recordToRestore?.venue} on {recordToRestore ? formatDate(recordToRestore.date_of_job_fair) : ''}?
              <br /><br />
              Type <strong>RESTORE</strong> to confirm this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="Type RESTORE to confirm"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestoreConfirm} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={restoreConfirmText !== "RESTORE"}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={(open) => {
        setPermanentDeleteDialogOpen(open);
        if (!open) setPermanentDeleteConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanent Delete</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the job fair monitoring record
              for {recordToPermanentDelete?.venue} on {recordToPermanentDelete ? formatDate(recordToPermanentDelete.date_of_job_fair) : ''} from the database.
              <br /><br />
              Type <strong>DELETE</strong> to confirm this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="Type DELETE to confirm"
              value={permanentDeleteConfirmText}
              onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700"
              disabled={permanentDeleteConfirmText !== "DELETE"}
            >
              Permanent Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Password Modal for Show Deleted Only */}
      <Dialog open={confirmPasswordOpen} onOpenChange={(open) => {
        setConfirmPasswordOpen(open)
        if (!open) setConfirmPassword("")
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter your password to view deleted job fair monitoring records.</p>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const username = currentUser?.username || ''
                  if (!username || !confirmPassword) return
                  setConfirmingPassword(true)
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, password: confirmPassword })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setShowDeletedOnly?.(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      fetchMonitoring?.(1, 10, search, filterQuery, true)
                    } else {
                      toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
                    }
                  } finally {
                    setConfirmingPassword(false)
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfirmPasswordOpen(false); setConfirmPassword("") }}>Cancel</Button>
              <Button
                className="bg-[#1976D2] text-white"
                onClick={async () => {
                  const username = currentUser?.username || ''
                  if (!username || !confirmPassword) return
                  setConfirmingPassword(true)
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, password: confirmPassword })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setShowDeletedOnly?.(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      fetchMonitoring?.(1, 10, search, filterQuery, true)
                    } else {
                      toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
                    }
                  } finally {
                    setConfirmingPassword(false)
                  }
                }}
                disabled={confirmingPassword || !confirmPassword}
              >
                {confirmingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
