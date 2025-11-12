// components/job-fair-table.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Eye, Loader2, RefreshCcw } from 'lucide-react';
import { JobFair } from '@/lib/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface JobFairTableProps {
  data: JobFair[];
  onEdit: (record: JobFair) => void;
  onDelete: (id: string) => void;
  onView: (record: JobFair) => void;
  onRestore?: (id: string) => void;
  loading?: boolean;
  search?: string;
  filterQuery?: string;
  showDeletedOnly?: boolean;
  setShowDeletedOnly?: (value: boolean) => void;
  userIsSuperadmin?: boolean;
  currentUser?: any;
}

export default function JobFairTable({
  data,
  onEdit,
  onDelete,
  onView,
  onRestore,
  loading = false,
  search = "",
  filterQuery = "",
  showDeletedOnly = false,
  setShowDeletedOnly,
  userIsSuperadmin = false,
  currentUser = null
}: JobFairTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<JobFair | null>(null);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmingPassword, setConfirmingPassword] = useState(false);
  const [restorePasswordOpen, setRestorePasswordOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState("");
  const [confirmingRestorePassword, setConfirmingRestorePassword] = useState(false);
  const [jobFairToRestore, setJobFairToRestore] = useState<JobFair | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (record: JobFair) => {
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

  const handleRestore = (jobFair: JobFair) => {
    setJobFairToRestore(jobFair);
    setRestorePasswordOpen(true);
  };

  const confirmRestore = async () => {
    if (!jobFairToRestore || !restorePassword) return;
    
    try {
      setConfirmingRestorePassword(true);
      
      // First verify password
      const username = currentUser?.username || '';
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: restorePassword })
      });
      const authData = await authRes.json();
      
      if (!authData.success) {
        toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' });
        return;
      }

      // Then restore the job fair
      const res = await fetch(`/api/job-fairs/${jobFairToRestore.id}/restore`, { method: 'POST' });
      const result = await res.json();
      
      if (result.success) {
        toast({ title: 'Job fair restored', description: `${jobFairToRestore.venue} has been restored` });
        setRestorePasswordOpen(false);
        setRestorePassword("");
        setJobFairToRestore(null);
        // Refresh the list by calling the parent's onRestore callback
        if (onRestore) {
          onRestore(jobFairToRestore.id);
        }
      } else {
        throw new Error(result.error || 'Restore failed');
      }
    } catch (err) {
      toast({ title: 'Restore error', description: 'Failed to restore job fair', variant: 'destructive' });
    } finally {
      setConfirmingRestorePassword(false);
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

    // Parse search input for key:value filters and free-text terms
  const parseSearch = (input: string): { filters: Record<string, string>; terms: string[] } => {
    const tokens = input.split(/[\s,]+/).filter(Boolean)
    const filters: Record<string, string> = {}
    const terms: string[] = []
    for (const token of tokens) {
      const match = token.match(/^([a-z_]+):(.*)$/i)
      if (match && match[2] !== '') {
        filters[match[1].toLowerCase()] = match[2].toLowerCase()
      } else {
        terms.push(token.toLowerCase())
      }
    }
    return { filters, terms }
  }

  // Filter data based on search and filter query
  const filteredData = data.filter(record => {
    const normalizedSearch = (search || '').trim().toLowerCase()
    const normalizedFilterQuery = (filterQuery || '').trim().toLowerCase()

    // Parse search and filter query
    const { filters: searchFilters, terms } = parseSearch(normalizedSearch)
    const { filters: panelFilters } = parseSearch(normalizedFilterQuery)
    const combinedFilters = { ...searchFilters, ...panelFilters }

    // All key:value filters must match
    const allFiltersMatch = Object.entries(combinedFilters).every(([key, value]) => {
      switch (key) {
        case 'venue':
          return record.venue.toLowerCase().includes(value)
        case 'office_head':
        case 'officehead':
          return record.office_head.toLowerCase().includes(value)
        case 'is_rescheduled':
        case 'rescheduled':
          if (value === 'true') return record.is_rescheduled
          if (value === 'false') return !record.is_rescheduled
          return true
        case 'year':
          const recordYear = new Date(record.date).getFullYear().toString()
          return recordYear === value
        case 'month':
          const recordMonth = (new Date(record.date).getMonth() + 1).toString()
          return recordMonth === value
        case 'date_range':
          const [startDate, endDate] = value.split('|')
          const recordDate = new Date(record.date)
          const start = new Date(startDate)
          const end = new Date(endDate)
          return recordDate >= start && recordDate <= end
        case 'email':
          return record.emails && record.emails.some(email => 
            email.email_address.toLowerCase().includes(value)
          )
        case 'contact':
          return record.contacts && record.contacts.some(contact => 
            contact.contact_number.toLowerCase().includes(value) ||
            contact.contact_category.toLowerCase().includes(value)
          )
        default:
          // Unknown key: try to match against a combined haystack
          const haystack = [
            record.venue,
            record.office_head,
            record.is_rescheduled ? 'rescheduled' : 'not rescheduled',
            ...(record.emails?.map(e => e.email_address) || []),
            ...(record.contacts?.map(c => `${c.contact_category}: ${c.contact_number}`) || [])
          ].join(' | ').toLowerCase()
          return haystack.includes(value)
      }
    })

    if (!allFiltersMatch) return false

    // Free-text terms: require every term to appear somewhere in the haystack
    if (terms.length === 0) return true

    const fields: string[] = []
    fields.push(record.venue)
    fields.push(record.office_head)
    fields.push(record.is_rescheduled ? 'rescheduled' : 'not rescheduled')
    if (record.emails) {
      record.emails.forEach(email => fields.push(email.email_address))
    }
    if (record.contacts) {
      record.contacts.forEach(contact => {
        fields.push(contact.contact_category)
        fields.push(contact.contact_number)
      })
    }
    
    const haystack = fields.join(' | ').toLowerCase()
    return terms.every(term => haystack.includes(term))
  })

  if (loading) {
    return (
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">Office Head</th>
                <th className="py-3 px-4 font-medium text-center">Email</th>
                <th className="py-3 px-4 font-medium text-center">Contact No.</th>
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
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
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

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg">
            {data.length === 0 ? "No job fairs found" : "No job fairs match your search criteria"}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {data.length === 0 ? "Create your first job fair to get started" : "Try adjusting your search or filter criteria"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                <th className="py-3 px-4 font-medium text-center">Date</th>
                <th className="py-3 px-4 font-medium text-center">Venue</th>
                <th className="py-3 px-4 font-medium text-center">Office Head</th>
                <th className="py-3 px-4 font-medium text-center">Email</th>
                <th className="py-3 px-4 font-medium text-center">Contact No.</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
                         <tbody className="divide-y divide-gray-200">
               {filteredData.map((record) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-150 transition-colors duration-75 cursor-pointer select-none ${record.deleted_at ? 'bg-red-50' : ''}`}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    onView(record)
                  }}
                >
                                     <td className="py-3 px-4 text-center">
                     <div className="flex flex-col items-center">
                       <span>{formatDate(record.date)}</span>
                       {record.is_rescheduled && (
                         <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full mt-1">
                           Rescheduled
                         </span>
                       )}
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
                    {record.office_head}
                  </td>
                                     <td className="py-3 px-4 text-center">
                     {record.emails && record.emails.length > 0 ? (
                       <div className="space-y-1">
                         {record.emails.map((email, index) => (
                           <div key={index} className={record.emails.length === 1 ? "" : "text-xs"}>
                             {email.email_address}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <span className="text-gray-400">No emails</span>
                     )}
                   </td>
                                     <td className="py-3 px-4 text-center">
                     {record.contacts && record.contacts.length > 0 ? (
                       <div className="space-y-1">
                         {record.contacts.map((contact, index) => (
                           <div key={index} className={record.contacts.length === 1 ? "" : "text-xs"}>
                             <span className="font-medium text-gray-600">{contact.contact_category}:</span>
                             <span className="ml-1">{contact.contact_number}</span>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <span className="text-gray-400">No contacts</span>
                     )}
                   </td>
                  <td className="py-3 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-150">
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
                          // Show restore button for deleted records
                          userIsSuperadmin && record.deleted_at && (
                            <DropdownMenuItem onClick={() => handleRestore(record)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          )
                        ) : (
                          // Show edit and delete buttons for active records
                          <>
                            <DropdownMenuItem onClick={() => onEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit / Reschedule
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
              This action cannot be undone. This will permanently delete the job fair record
              for {recordToDelete?.venue} on {recordToDelete ? formatDate(recordToDelete.date) : ''}.
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
            <p className="text-sm text-gray-600">Enter your password to view deleted job fairs.</p>
            <PasswordInput
              className="w-full"
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

      {/* Confirm Password Modal for Restore */}
      <Dialog open={restorePasswordOpen} onOpenChange={(open) => {
        setRestorePasswordOpen(open);
        if (!open) {
          setRestorePassword("");
          setJobFairToRestore(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Restore</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter your password to restore {jobFairToRestore?.venue}.
            </p>
            <PasswordInput
              className="w-full"
              placeholder="Password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await confirmRestore();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { 
                setRestorePasswordOpen(false); 
                setRestorePassword(""); 
                setJobFairToRestore(null) 
              }}>
                Cancel
              </Button>
              <Button
                className="bg-[#1976D2] text-white"
                onClick={confirmRestore}
                disabled={confirmingRestorePassword || !restorePassword}
              >
                {confirmingRestorePassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
