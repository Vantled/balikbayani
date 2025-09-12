"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Trash2, FileText, File, Image as ImageIcon, FileArchive, Plus, BadgeCheck, X, AlertTriangle, Loader2, Settings, RefreshCcw, Download } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"
import type { User } from "@/lib/auth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { DirectHireApplication } from "@/lib/types"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { Document } from "@/lib/types"
import StatusChecklist from "@/components/status-checklist"
import CreateApplicationModal from "@/components/create-application-modal"
import DocumentViewerModal from "@/components/pdf-viewer-modal"

// Defer auth role check to client to avoid hydration mismatch

interface DirectHireApplicationsTableProps {
  search: string
  filterQuery?: string
}

interface ApplicantDocumentsTabProps {
  applicationId: string
  refreshTrigger?: number
  onRefresh?: () => void
  onViewPDF?: (documentId: string, documentName: string) => void
  setSelectedDocument: (document: {id: string, name: string, fileBlob?: Blob} | null) => void
  setPdfViewerOpen: (open: boolean) => void
}

export default function DirectHireApplicationsTable({ search, filterQuery = "" }: DirectHireApplicationsTableProps) {
  console.log('DirectHireApplicationsTable component rendered');
  const { toast } = useToast()
  const { 
    applications, 
    loading, 
    error, 
    pagination,
    createApplication, 
    deleteApplication,
    fetchApplications 
  } = useDirectHireApplications()
  
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<DirectHireApplication | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  const [statusChecklistOpen, setStatusChecklistOpen] = useState(false)
  const [selectedApplicationForStatus, setSelectedApplicationForStatus] = useState<DirectHireApplication | null>(null)

  const [formData, setFormData] = useState<any>({
    name: "",
    sex: "male",
    jobsite: "",
    position: "",
    salary: "",
    salaryCurrency: "USD" as Currency,
    evaluator: "",
    employer: "",
  })
  const [showEditDraftModal, setShowEditDraftModal] = useState<{open: boolean, app: DirectHireApplication | null}>({ open: false, app: null })

  const [userIsSuperadmin, setUserIsSuperadmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [showFinishedOnly, setShowFinishedOnly] = useState(false)
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmingPassword, setConfirmingPassword] = useState(false)
  const [confirmPurpose, setConfirmPurpose] = useState<'deleted' | 'finished' | null>(null)
  
  // Confirmation states for restore and permanent delete
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState("")
  const [applicationToRestore, setApplicationToRestore] = useState<DirectHireApplication | null>(null)
  const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false)
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("")
  const [applicationToPermanentDelete, setApplicationToPermanentDelete] = useState<DirectHireApplication | null>(null)
  
  // Confirmation state for cancel draft
  const [cancelDraftConfirmOpen, setCancelDraftConfirmOpen] = useState(false)
  const [applicationToCancelDraft, setApplicationToCancelDraft] = useState<DirectHireApplication | null>(null)
  
  // PDF Viewer Modal state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{id: string, name: string, fileBlob?: Blob} | null>(null)
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<DirectHireApplication | null>(null)

  // Resolve superadmin on client after mount to keep SSR markup stable
  useEffect(() => {
    let mounted = true
    import('@/lib/auth').then(mod => {
      const u = mod.getUser()
      const isSuper = mod.isSuperadmin(u)
      if (mounted) {
        setUserIsSuperadmin(isSuper)
        setCurrentUser(u)
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Initial load and whenever showDeletedOnly toggles
  useEffect(() => {
    fetchApplications(search, 1, showDeletedOnly)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeletedOnly])

  // Generate control number preview
  const generateControlNumberPreview = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthDay = `${month}${day}`;
    
    // For preview, we'll use a placeholder count that will be updated by the backend
    const monthlyCountStr = "001";
    const yearlyCountStr = "001";
    
    return `DHPSW-ROIVA-${year}-${monthDay}-${monthlyCountStr}-${yearlyCountStr}`;
  };

  // Get converted USD amount for display
  const getUSDEquivalentDisplay = (): string => {
    if (!formData.salary || isNaN(parseFloat(formData.salary))) return "";
    return getUSDEquivalent(parseFloat(formData.salary), formData.salaryCurrency);
  };

  useEffect(() => {
    setControlNumberPreview(generateControlNumberPreview());
    fetchApplications(search, 1, showDeletedOnly)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global refresh events (e.g., from page-level Create modal)
  useEffect(() => {
    const handler = () => {
      fetchApplications(search, 1, showDeletedOnly)
    }
    window.addEventListener('refresh:direct_hire' as any, handler as any)
    return () => window.removeEventListener('refresh:direct_hire' as any, handler as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showDeletedOnly])

  // Filter applications based on search
  const normalizedSearch = search.trim().toLowerCase()
  const normalizedFilterQuery = (filterQuery || '').trim().toLowerCase()

  // Parse key:value filters and free-text terms
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

  const getDerivedStatusKey = (application: DirectHireApplication): string | null => {
    if (application.status === 'draft') return 'draft'
    if (!application.status_checklist) return application.status
    const checked = Object.entries(application.status_checklist).filter(([, s]) => (s as any).checked)
    if (checked.length === 0) {
      // Fallback to status field when checklist not yet updated
      return application.status || null
    }
    // Pick the most recent by timestamp to avoid relying on object key order
    const latest = checked.reduce((acc, curr) => {
      const accTs = new Date(((acc[1] as any)?.timestamp) || 0).getTime()
      const currTs = new Date(((curr[1] as any)?.timestamp) || 0).getTime()
      return currTs >= accTs ? curr : acc
    })
    return latest[0]
  }

  const isFinished = (application: DirectHireApplication): boolean => {
    const sc: any = (application as any).status_checklist
    if (!sc) return false
    const requiredKeys = ['evaluated','for_confirmation','emailed_to_dhad','received_from_dhad','for_interview']
    return requiredKeys.every(k => sc[k]?.checked === true)
  }

  const statusKeyToLabel: Record<string, string> = {
    draft: 'draft',
    pending: 'pending',
    evaluated: 'evaluated',
    for_confirmation: 'for confirmation',
    for_confirmation_confirmed: 'confirmed',
    emailed_to_dhad: 'emailed to dhad',
    received_from_dhad: 'received from dhad',
    for_interview: 'for interview',
    approved: 'approved',
    rejected: 'rejected',
  }

  const handleDeleteConfirm = async () => {
    if (!applicationToDelete) return
    
    try {
      // Check if this is a deleted application (permanent deletion)
      const isDeleted = Boolean((applicationToDelete as any).deleted_at)
      
      if (isDeleted) {
        // For deleted items, open permanent delete confirmation directly
        setApplicationToPermanentDelete(applicationToDelete)
        setPermanentDeleteConfirmOpen(true)
        setDeleteConfirmOpen(false)
        setApplicationToDelete(null)
      } else {
        // Soft deletion for active items
        const success = await deleteApplication(applicationToDelete.id)
        if (success) {
          await fetchApplications(search, 1, showDeletedOnly)
          toast({ 
            title: "Application deleted successfully", 
            description: `${applicationToDelete.name}'s application has been moved to deleted items` 
          })
        } else {
          throw new Error('Soft deletion failed')
        }
        setDeleteConfirmOpen(false)
        setApplicationToDelete(null)
      }
    } catch (error) {
      toast({
        title: 'Delete Error',
        description: error instanceof Error ? error.message : 'Failed to delete application',
        variant: 'destructive'
      })
      setDeleteConfirmOpen(false)
      setApplicationToDelete(null)
    }
  }

  const handleRestoreConfirm = async () => {
    if (!applicationToRestore || restoreConfirmText !== "RESTORE") return
    
    try {
      const res = await fetch(`/api/direct-hire/${applicationToRestore.id}/restore`, { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        if (showDeletedOnly) {
          await fetchApplications(search, 1, true)
        } else {
          await fetchApplications(search, 1, false)
        }
        toast({ title: 'Application restored', description: `${applicationToRestore.name} has been restored` })
      } else {
        throw new Error(result.error || 'Restore failed')
      }
    } catch (err) {
      toast({ title: 'Restore error', description: 'Failed to restore application', variant: 'destructive' })
    }
    
    setRestoreConfirmOpen(false)
    setRestoreConfirmText("")
    setApplicationToRestore(null)
  }

  const handlePermanentDeleteConfirm = async () => {
    if (!applicationToPermanentDelete || permanentDeleteConfirmText !== "DELETE") return
    
    try {
      const response = await fetch(`/api/direct-hire/${applicationToPermanentDelete.id}/permanent-delete`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        await fetchApplications(search, 1, showDeletedOnly)
        toast({ 
          title: "Application permanently deleted", 
          description: `${applicationToPermanentDelete.name}'s application has been permanently removed` 
        })
      } else {
        throw new Error(result.error || 'Permanent deletion failed')
      }
    } catch (error) {
      toast({
        title: 'Delete Error',
        description: error instanceof Error ? error.message : 'Failed to permanently delete application',
        variant: 'destructive'
      })
    }
    
    setPermanentDeleteConfirmOpen(false)
    setPermanentDeleteConfirmText("")
    setApplicationToPermanentDelete(null)
  }

  const handleCancelDraftConfirm = async () => {
    if (!applicationToCancelDraft) return
    
    try {
      const success = await deleteApplication(applicationToCancelDraft.id)
      if (success) {
        await fetchApplications(search, 1, showDeletedOnly)
        toast({ title: 'Draft cancelled', description: `${applicationToCancelDraft.name}'s draft has been cancelled.` })
      } else {
        throw new Error('Failed to cancel draft')
      }
    } catch (error) {
      toast({
        title: 'Cancel Error',
        description: error instanceof Error ? error.message : 'Failed to cancel draft',
        variant: 'destructive'
      })
    }
    
    setCancelDraftConfirmOpen(false)
    setApplicationToCancelDraft(null)
  }

  const matchesFilter = (application: DirectHireApplication, key: string, value: string): boolean => {
    switch (key) {
      case 'name':
        return application.name.toLowerCase().includes(value)
      case 'sex':
        return application.sex.toLowerCase().includes(value)
      case 'status': {
        const statusKey = getDerivedStatusKey(application)
        const statusLabel = statusKey ? (statusKeyToLabel[statusKey] || statusKey.replace(/_/g, ' ')) : ''
        return (
          (statusKey ? statusKey.toLowerCase().includes(value) : false) ||
          statusLabel.toLowerCase().includes(value)
        )
      }
      case 'control':
      case 'control_number':
      case 'controlno':
        return application.control_number.toLowerCase().includes(value)
      case 'jobsite':
      case 'site':
        return application.jobsite.toLowerCase().includes(value)
      case 'position':
      case 'pos':
        return application.position.toLowerCase().includes(value)
      case 'evaluator':
      case 'eval':
        return (application.evaluator || '').toLowerCase().includes(value)
      case 'job_type':
      case 'jobtype':
      case 'type':
        return ((application as any).job_type || '').toLowerCase().includes(value)
      case 'salary':
        return String(application.salary).toLowerCase().includes(value)
      case 'date_range': {
        const [startStr, endStr] = value.split('|')
        if (!startStr || !endStr) return true
        const createdAtRaw: any = (application as any).created_at
        if (!createdAtRaw) return false
        const created = new Date(createdAtRaw)
        if (isNaN(created.getTime())) return false
        const start = new Date(startStr)
        const end = new Date(endStr)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return true
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        return created >= start && created <= end
      }
      default:
        // Unknown key: try to match against a combined haystack
        const haystack = [
          application.control_number,
          application.name,
          application.sex,
          application.jobsite,
          application.position,
          (application as any).job_type || '',
          application.evaluator || '',
          String(application.salary),
        ].join(' | ').toLowerCase()
        const statusKey = getDerivedStatusKey(application)
        if (statusKey) {
          const statusLabel = statusKeyToLabel[statusKey] || statusKey.replace(/_/g, ' ')
          return haystack.includes(value) || statusKey.toLowerCase().includes(value) || statusLabel.toLowerCase().includes(value)
        }
        return haystack.includes(value)
    }
  }

  const filteredApplications = (() => {
    const { filters: searchFilters, terms } = parseSearch(normalizedSearch)
    const { filters: panelFilters } = parseSearch(normalizedFilterQuery)
    const combinedFilters = { ...searchFilters, ...panelFilters }

    // Start with server list; apply deleted/finished visibility first
    const base = applications.filter(app => {
      const deleted = Boolean((app as any).deleted_at)
      const finished = isFinished(app)
      if (showDeletedOnly) return deleted
      if (showFinishedOnly) return !deleted && finished
      // default monitoring view: exclude deleted and finished
      return !deleted && !finished
    })

    if (!normalizedSearch && !normalizedFilterQuery) return base

    return base
      .filter((application) => {
        // All key:value filters must match
        const allFiltersMatch = Object.entries(combinedFilters).every(([k, v]) => matchesFilter(application, k, v))
        if (!allFiltersMatch) return false

        if (terms.length === 0) return true

        // Free-text terms: require every term to appear somewhere in the haystack
        const fields: string[] = []
        fields.push(application.control_number)
        fields.push(application.name)
        fields.push(application.sex)
        fields.push(application.jobsite)
        fields.push(application.position)
        fields.push(((application as any).job_type || ''))
        if (application.evaluator) fields.push(application.evaluator)
        fields.push(String(application.salary))
        const statusKey = getDerivedStatusKey(application)
        if (statusKey) {
          fields.push(statusKey)
          fields.push(statusKeyToLabel[statusKey] || statusKey.replace(/_/g, ' '))
        }
        const haystack = fields.join(' | ').toLowerCase()
        return terms.every(term => haystack.includes(term))
      })
  })()

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
    }
  }, [error, toast])

  const getStatusBadge = (application: DirectHireApplication) => {
    const { status, status_checklist } = application
    // Soft-deleted marker overrides all
    if ((application as any).deleted_at) {
      const isDraft = status === 'draft'
      return (
        <div
          className={"bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-full w-fit font-medium"}
          title={`This ${isDraft ? 'draft' : 'application'} has been deleted`}
        >
          {isDraft ? 'Deleted Draft' : 'Deleted'}
        </div>
      )
    }
    
    // If no status_checklist exists, fall back to the old status system
    if (!status_checklist) {
    const capitalizeWords = (str: string) => {
      return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    switch (status) {
        case "draft":
          return <div className="bg-gray-100 text-gray-600 text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Draft</div>
      case "pending":
          return <div className="bg-[#FFF3E0] text-[#F57C00] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Pending</div>
      case "evaluated":
          return <div className="bg-[#E3F2FD] text-[#1976D2] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Evaluated</div>
      case "for_confirmation":
          return <div className="bg-[#F5F5F5] text-[#424242] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">For Confirmation</div>
      case "for_interview":
          return <div className="bg-[#FCE4EC] text-[#C2185B] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">For Interview</div>
      case "approved":
          return <div className="bg-[#E8F5E9] text-[#2E7D32] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Approved</div>
      case "rejected":
          return <div className="bg-[#FFEBEE] text-[#C62828] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Rejected</div>
      default:
          return <div className="bg-[#F5F5F5] text-[#424242] text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">{capitalizeWords(status)}</div>
      }
    }

    // Handle draft status with checklist
    if (status === 'draft') {
      return <div className="bg-gray-100 text-gray-600 text-sm px-3 py-1.5 rounded-full text-center w-fit font-medium">Draft</div>
    }

    // Get the current status based on latest timestamp in checklist (or fallback)
    const latestKey = getDerivedStatusKey(application)
    let currentStatus = "No statuses checked"
    let statusColor = "bg-gray-100 text-gray-800"

    switch (latestKey) {
      case "evaluated":
        currentStatus = "Evaluated"
        statusColor = "bg-blue-100 text-blue-800"
        break
      case "for_confirmation_confirmed":
        currentStatus = "Confirmed"
        statusColor = "bg-teal-100 text-teal-800"
        break
      case "for_confirmation":
        currentStatus = "For Confirmation"
        statusColor = "bg-yellow-100 text-yellow-800"
        break
      case "emailed_to_dhad":
        currentStatus = "Emailed to DHAD"
        statusColor = "bg-purple-100 text-purple-800"
        break
      case "received_from_dhad":
        currentStatus = "Received from DHAD"
        statusColor = "bg-green-100 text-green-800"
        break
      case "for_interview":
        currentStatus = "For Interview"
        statusColor = "bg-pink-100 text-pink-800"
        break
      case null:
      default:
        // If no derived key, fall back to legacy status
        switch (application.status) {
          case 'evaluated':
            currentStatus = 'Evaluated'
            statusColor = 'bg-blue-100 text-blue-800'
            break
          case 'pending':
            currentStatus = 'Pending'
            statusColor = 'bg-orange-100 text-orange-700'
            break
          case 'approved':
            currentStatus = 'Approved'
            statusColor = 'bg-green-100 text-green-700'
            break
          case 'rejected':
            currentStatus = 'Rejected'
            statusColor = 'bg-red-100 text-red-700'
            break
          default:
            currentStatus = 'No statuses checked'
            statusColor = 'bg-gray-100 text-gray-800'
        }
    }

    return (
      <div className="flex flex-col gap-2">
        <div 
          className={`${statusColor} text-sm px-3 py-1.5 rounded-full w-fit font-medium cursor-pointer hover:opacity-80 transition-opacity flex justify-center items-center`}
          onClick={() => {
            // Don't open status checklist for draft applications
            if (application.status === 'draft') {
              toast({
                title: "Draft Application",
                description: "This is a draft application. Complete the form to proceed with status updates.",
                variant: "default"
              });
              return;
            }
            // Don't open for deleted applications
            if ((application as any).deleted_at) {
              toast({
                title: "Deleted Application",
                description: "This application is deleted. Restore it to update statuses.",
                variant: "destructive"
              })
              return;
            }
            setSelectedApplicationForStatus(application)
            setStatusChecklistOpen(true)
          }}
        >
          {currentStatus}
          {application.status !== 'draft' && (
            <Settings className="h-3 w-3 ml-1" />
          )}
        </div>
        
        
      </div>
    )
  }

  return (
    <>
      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total applications)
            </span>

          </div>
          <div className="flex items-center gap-1">
            {(() => {
              const pages = [];
              const totalPages = pagination.totalPages;
              const currentPage = pagination.page;
              
              if (totalPages <= 7) {
                // If 7 or fewer pages, show all pages
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={i === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchApplications(search, i, showDeletedOnly)}
                      className="min-w-[40px] h-8"
                    >
                      {i}
                    </Button>
                  );
                }
              } else {
                // Dynamic pagination: show 5 pages around current page
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 4);
                
                // Adjust if we're near the end
                if (endPage - startPage < 4) {
                  startPage = Math.max(1, endPage - 4);
                }
                
                // Always show first page if not in range
                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant={1 === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchApplications(search, 1, showDeletedOnly)}
                      className="min-w-[40px] h-8"
                    >
                      1
                    </Button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipses-start" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                }
                
                // Show the 5 pages around current page
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={i === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchApplications(search, i, showDeletedOnly)}
                      className="min-w-[40px] h-8"
                    >
                      {i}
                    </Button>
                  );
                }
                
                // Always show last page if not in range
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipses-end" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  
                  pages.push(
                    <Button
                      key={totalPages}
                      variant={totalPages === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchApplications(search, totalPages, showDeletedOnly)}
                      className="min-w-[40px] h-8"
                    >
                      {totalPages}
                    </Button>
                  );
                }
              }
              
              return pages;
            })()}
          </div>
        </div>
      )}

      <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
        {/* Superadmin controls */}
        <div className="flex items-center justify-end px-4 py-2 border-b bg-gray-50 gap-6">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={showFinishedOnly}
              onChange={async (e) => {
                const next = e.target.checked
                if (next) {
                  setShowDeletedOnly(false)
                  setConfirmPurpose('finished')
                  setConfirmPasswordOpen(true)
                } else {
                  setShowFinishedOnly(false)
                  await fetchApplications(search, 1, false)
                }
              }}
            />
            Show finished only
          </label>
          {userIsSuperadmin && (
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={showDeletedOnly}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Require password confirmation before enabling
                    setShowFinishedOnly(false)
                    setConfirmPurpose('deleted')
                    setConfirmPasswordOpen(true)
                  } else {
                    setShowDeletedOnly(false)
                    fetchApplications(search, 1, false)
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
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                <th className="py-3 px-4 font-medium text-center">Control #</th>
                <th className="py-3 px-4 font-medium text-center">Name</th>
                <th className="py-3 px-4 font-medium text-center">Sex</th>
                <th className="py-3 px-4 font-medium text-center">Salary</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading applications...
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-center">{application.control_number}</td>
                    <td className="py-3 px-4 text-center">{(application.name || '').toUpperCase()}</td>
                    <td className="py-3 px-4 text-center capitalize">{(application.sex || '').toUpperCase()}</td>
                    <td className={`py-3 px-4 text-center font-medium ${application.salary < 1000 ? 'text-red-500' : ''}`}>
                      ${application.salary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 flex justify-center items-center">{getStatusBadge(application)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {application.status === 'draft' ? (
                              <>
                                {/* For deleted drafts, only show Restore and Delete */}
                                {(application as any).deleted_at ? (
                                  <>
                                    {userIsSuperadmin && (
                                      <DropdownMenuItem onClick={() => {
                                        setApplicationToRestore(application)
                                        setRestoreConfirmOpen(true)
                                      }}>
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Restore
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => {
                                        setApplicationToPermanentDelete(application)
                                        setPermanentDeleteConfirmOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Permanently Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    {/* For active drafts, show Continue Draft first, then Cancel Draft */}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setShowEditDraftModal({ open: true, app: application })
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Continue Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setApplicationToCancelDraft(application)
                                        setCancelDraftConfirmOpen(true)
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Cancel Draft
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {/* For non-draft applications */}
                                {(application as any).deleted_at ? (
                                  <>
                                    {/* For deleted non-draft applications, show View, Restore, and Delete */}
                                    <DropdownMenuItem onClick={() => { setSelected(application); setOpen(true) }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    {userIsSuperadmin && (
                                      <DropdownMenuItem onClick={() => {
                                        setApplicationToRestore(application)
                                        setRestoreConfirmOpen(true)
                                      }}>
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Restore
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => {
                                        setApplicationToPermanentDelete(application)
                                        setPermanentDeleteConfirmOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Permanently Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    {/* For active non-draft applications, show all normal actions */}
                                    <DropdownMenuItem onClick={() => { setSelected(application); setOpen(true) }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setShowEditDraftModal({ open: true, app: application })
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => {
                                        setApplicationToDelete(application)
                                        setDeleteConfirmOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                    {application.salary < 1000 && (
                                      <DropdownMenuItem onClick={() => { toast({ title: "Compliance form generated", description: "The document has been prepared and is ready for download" }) }}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Compliance Form
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      {/* Applicant Details Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Applicant Details</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selected && (
            <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
              {/* Personal Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Personal Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Control No.:</div>
                    <div className="font-medium">{selected.control_number}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Name:</div>
                    <div className="font-medium">{selected.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email:</div>
                    <div className="font-medium">{(selected as any).email || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Cellphone No.:</div>
                    <div className="font-medium">{(selected as any).cellphone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium capitalize">{selected.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status:</div>
                    <div className="font-medium">
                      {(() => {
                        if ((selected as any).deleted_at) return 'Deleted'
                        const latestKey = getDerivedStatusKey(selected)
                        switch (latestKey) {
                          case 'evaluated': return 'Evaluated'
                          case 'for_confirmation_confirmed': return 'Confirmed'
                          case 'for_confirmation': return 'For Confirmation'
                          case 'emailed_to_dhad': return 'Emailed to DHAD'
                          case 'received_from_dhad': return 'Received from DHAD'
                          case 'for_interview': return 'For Interview'
                          case null:
                          default: {
                            const capitalizeWords = (str: string) => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                            if (!selected.status_checklist && selected.status) return capitalizeWords(selected.status)
                            return 'No statuses checked'
                          }
                        }
                      })()}
                  </div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Employment Details */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Employment Details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Jobsite:</div>
                    <div className="font-medium">{(selected.jobsite || '').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Position:</div>
                    <div className="font-medium">{selected.position}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Salary:</div>
                    <div className="font-medium">${selected.salary.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Evaluator:</div>
                    <div className="font-medium">{selected.evaluator || 'Not assigned'}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Application Status */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Application Status</div>
                <ul className="text-sm">
                  {(() => {
                    const { status_checklist } = selected
                    const statusOptions = [
                      { key: 'evaluated', label: 'Evaluated', color: 'text-blue-600' },
                      { key: 'for_confirmation', label: 'For Confirmation', color: 'text-yellow-600' },
                      { key: 'emailed_to_dhad', label: 'Emailed to DHAD', color: 'text-purple-600' },
                      { key: 'received_from_dhad', label: 'Received from DHAD', color: 'text-green-600' },
                      { key: 'for_interview', label: 'For Interview', color: 'text-pink-600' }
                    ]
                    
                    if (!status_checklist) {
                      // Fallback to old status system
                      const oldStatuses = [
                        { key: 'pending', label: 'Pending', color: 'text-orange-600' },
                        { key: 'evaluated', label: 'Evaluated', color: 'text-green-600' },
                        { key: 'for_confirmation', label: 'For Confirmation', color: 'text-blue-600' },
                        { key: 'for_interview', label: 'For Interview', color: 'text-purple-600' },
                        { key: 'approved', label: 'Approved', color: 'text-green-600' },
                        { key: 'rejected', label: 'Rejected', color: 'text-red-600' }
                      ]
                      
                      return oldStatuses.map(status => (
                        <li key={status.key} className="flex items-center gap-2 mb-1">
                          <span className={`text-lg ${selected.status === status.key ? status.color : 'text-gray-400'}`}>●</span>
                          <span className={`font-semibold ${selected.status === status.key ? status.color.replace('text-', 'text-').replace('-600', '-700') : 'text-gray-700'}`}>
                            {status.label}
                    </span>
                          <span className={`ml-auto text-xs ${selected.status === status.key ? status.color.replace('text-', 'text-').replace('-600', '-700') : 'text-gray-500'}`}>
                            {selected.status === status.key ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                      ))
                    }
                    
                    // Get current status from checklist
                    const checkedItems = Object.entries(status_checklist).filter(([_, status]) => (status as any).checked)
                    const currentStatusKey = checkedItems.length > 0 ? checkedItems[checkedItems.length - 1][0] : null
                    
                    return statusOptions.map(status => {
                      const isChecked = status_checklist[status.key as keyof typeof status_checklist]?.checked
                      const timestamp = status_checklist[status.key as keyof typeof status_checklist]?.timestamp
                      const isCurrent = currentStatusKey === status.key
                      
                      return (
                        <li key={status.key} className="flex items-center gap-2 mb-1">
                          <span className={`text-lg ${isChecked ? status.color : 'text-gray-400'}`}>●</span>
                          <span className={`font-semibold ${isChecked ? status.color.replace('text-', 'text-').replace('-600', '-700') : 'text-gray-700'}`}>
                            {status.label}
                    </span>
                          <span className={`ml-auto text-xs ${isChecked ? status.color.replace('text-', 'text-').replace('-600', '-700') : 'text-gray-500'}`}>
                            {isChecked ? (
                              timestamp 
                                ? new Date(timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : new Date().toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                            ) : 'N/A'}
                    </span>
                  </li>
                      )
                    })
                  })()}
                </ul>
              </div>
              <hr className="my-4" />
              {/* Documents */}
              <div>
                <div className="font-semibold text-gray-700 mb-2">Documents</div>
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={async () => {
                      if (!selected) return
                      try {
                        const res = await fetch(`/api/direct-hire/${selected.id}/comprehensive-clearance`, { method: 'POST' })
                        const result = await res.json()
                        if (result.success) {
                          setDocumentsRefreshTrigger(prev => prev + 1)
                          toast({ title: 'Document generated', description: 'Comprehensive clearance document has been attached.' })
                        } else if (res.status === 409) {
                          // Show confirmation modal for override
                          const confirmOverride = window.confirm('A comprehensive clearance document already exists. Do you want to replace it?')
                          if (confirmOverride) {
                            const res2 = await fetch(`/api/direct-hire/${selected.id}/comprehensive-clearance?override=true`, { method: 'POST' })
                            const result2 = await res2.json()
                            if (result2.success) {
                              setDocumentsRefreshTrigger(prev => prev + 1)
                              toast({ title: 'Document replaced', description: 'Comprehensive clearance document has been updated.' })
                            } else {
                              throw new Error(result2.error || 'Override failed')
                            }
                          }
                        } else {
                          throw new Error(result.error || 'Generation failed')
                        }
                      } catch (err) {
                        toast({ title: 'Generation error', description: 'Failed to generate the comprehensive clearance document.', variant: 'destructive' })
                      }
                    }}
                  >
                    Generate Clearance
                  </Button>
                  <Button 
                    className="bg-[#1976D2] text-white text-xs"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    + New
                  </Button>
                </div>
                <ApplicantDocumentsList 
                  applicationId={selected.id} 
                  refreshTrigger={documentsRefreshTrigger}
                  onRefresh={() => setDocumentsRefreshTrigger(prev => prev + 1)}
                  onViewPDF={(documentId, documentName) => {
                    setSelectedDocument({ id: documentId, name: documentName })
                    setPdfViewerOpen(true)
                  }}
                  setSelectedDocument={setSelectedDocument}
                  setPdfViewerOpen={setPdfViewerOpen}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Password Modal for Show Deleted/Finished Only */}
      <Dialog open={confirmPasswordOpen} onOpenChange={(open) => {
        setConfirmPasswordOpen(open)
        if (!open) setConfirmPassword("")
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter your password to view {confirmPurpose === 'deleted' ? 'deleted' : 'finished'} applications.</p>
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
                      if (confirmPurpose === 'deleted') setShowDeletedOnly(true)
                      if (confirmPurpose === 'finished') setShowFinishedOnly(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      await fetchApplications(search, 1, confirmPurpose === 'deleted')
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
                      if (confirmPurpose === 'deleted') setShowDeletedOnly(true)
                      if (confirmPurpose === 'finished') setShowFinishedOnly(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      await fetchApplications(search, 1, confirmPurpose === 'deleted')
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

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          <DocumentUploadForm 
            applicationId={selected?.id || ''}
            applicationType="direct_hire"
            onSuccess={() => {
              setUploadModalOpen(false)
              // Refresh the documents list
              setDocumentsRefreshTrigger(prev => prev + 1)
              toast({
                title: 'Document uploaded',
                description: 'Document has been uploaded successfully',
              })
            }}
            onError={(error) => {
              toast({
                title: 'Upload Error',
                description: error,
                variant: 'destructive'
              })
            }}
            onCancel={() => {
              setUploadModalOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Status Checklist Modal */}
      {selectedApplicationForStatus && (
        <StatusChecklist
          applicationId={selectedApplicationForStatus.id}
          applicantName={selectedApplicationForStatus.name}
          currentStatus={selectedApplicationForStatus.status}
          statusChecklist={selectedApplicationForStatus.status_checklist || {
            evaluated: { checked: true, timestamp: new Date().toISOString() },
            for_confirmation: { checked: false, timestamp: undefined },
            emailed_to_dhad: { checked: false, timestamp: undefined },
            received_from_dhad: { checked: false, timestamp: undefined },
            for_interview: { checked: false, timestamp: undefined }
          }}
          onStatusUpdate={(newStatus, newChecklist) => {
            // Update the application in the local state
            const updatedApplications = applications.map(app => 
              app.id === selectedApplicationForStatus.id 
                ? { ...app, status_checklist: newChecklist }
                : app
            )
            // This would need to be handled by the hook, but for now we'll just refresh
            fetchApplications()
          }}
          isOpen={statusChecklistOpen}
          onClose={() => {
            setStatusChecklistOpen(false)
            setSelectedApplicationForStatus(null)
          }}
        />
      )}

      

      {/* Create Applicant Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span>📝</span> Fill Out Form
            </DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="px-8 py-6">
            <Tabs value={`form${formStep}`} className="w-full">
              <TabsList className="w-full flex mb-6">
                <TabsTrigger value="form1" className={`flex-1 ${formStep === 1 ? '!bg-white !text-[#1976D2]' : ''}`}>Form 1</TabsTrigger>
                <TabsTrigger value="form2" className={`flex-1 ${formStep === 2 ? '!bg-white !text-[#1976D2]' : ''}`}>Form 2</TabsTrigger>
              </TabsList>
              <TabsContent value="form1">
                {/* Form 1 Fields */}
                <form className="space-y-4">
                  <div>
                    <label className="text-xs font-medium flex items-center gap-2"><span>Control No. (Preview)</span></label>
                    <input className="w-full border rounded px-3 py-2 mt-1 bg-gray-50 font-mono text-sm" value={controlNumberPreview} disabled />
                    <p className="text-xs text-gray-500 mt-1">
                      This is a preview. The actual control number will be generated upon creation.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium flex items-center gap-2"><span>Name of Worker:</span></label>
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Sex:</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'male'} onChange={() => setFormData({ ...formData, sex: 'male' })} /> Male</label>
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'female'} onChange={() => setFormData({ ...formData, sex: 'female' })} /> Female</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Jobsite:</label>
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      value={formData.jobsite} 
                      onChange={e => setFormData({ ...formData, jobsite: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Position:</label>
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      value={formData.position} 
                      onChange={e => setFormData({ ...formData, position: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Salary:</label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <input 
                          className="w-full border rounded px-3 py-2" 
                          type="number" 
                          step="0.01" 
                          value={formData.salary} 
                          onChange={e => setFormData({ ...formData, salary: e.target.value })} 
                          placeholder="Enter salary amount"
                        />
                      </div>
                      <div className="w-32">
                        <select 
                          className="w-full border rounded px-3 py-2 text-sm"
                          value={formData.salaryCurrency} 
                          onChange={e => setFormData({ ...formData, salaryCurrency: e.target.value as Currency })}
                        >
                          {AVAILABLE_CURRENCIES.map((currency) => (
                            <option key={currency.value} value={currency.value}>
                              {currency.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {formData.salary && formData.salaryCurrency !== "USD" && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md">
                        <span className="text-xs text-blue-700">
                          USD Equivalent: {getUSDEquivalentDisplay()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium">Evaluator:</label>
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      value={formData.evaluator} 
                      onChange={e => setFormData({ ...formData, evaluator: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Employer:</label>
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      value={formData.employer} 
                      onChange={e => setFormData({ ...formData, employer: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button 
                      className="bg-[#1976D2] text-white px-8" 
                      type="button" 
                      onClick={() => {
                        console.log('NEXT BUTTON CLICKED');
                        setFormStep(2);
                      }}
                      disabled={!formData.name || !formData.jobsite || !formData.position || !formData.salary}
                    >
                      Next
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="form2">
                {/* Form 2 Fields */}
                <form className="space-y-4">
                  <div>
                    <label className="text-xs font-medium">Passport:</label>
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, passport: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Visa/Work Permit:</label>
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, visa: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium">TESDA NCII/PRC License:</label>
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, tesda: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                  </div>
                  <div className="flex justify-between mt-6 gap-2">
                    <Button variant="outline" className="flex-1" type="button" onClick={async (e) => {
                      e.preventDefault();
                      alert('SAVE AS DRAFT BUTTON CLICKED!');
                      console.log('SAVE AS DRAFT BUTTON CLICKED!');
                      console.log('Current form data state:', formData); 
                      try {
                        console.log('Saving draft with form data:', formData);
                        
                        // For drafts, save the raw salary and currency
                        const formDataToSend = new FormData();
                        formDataToSend.append('name', formData.name);
                        formDataToSend.append('sex', formData.sex);
                        formDataToSend.append('salary', formData.salary || '0');
                        formDataToSend.append('salaryCurrency', formData.salaryCurrency || 'USD');
                        formDataToSend.append('jobsite', formData.jobsite || '');
                        formDataToSend.append('position', formData.position || '');
                        formDataToSend.append('evaluator', formData.evaluator || '');
                        formDataToSend.append('employer', formData.employer || '');
                        formDataToSend.append('status', 'draft');

                        // Add files if they exist
                        if (formData.passport) {
                          formDataToSend.append('passport', formData.passport);
                        }
                        if (formData.visa) {
                          formDataToSend.append('visa', formData.visa);
                        }
                        if (formData.tesda) {
                          formDataToSend.append('tesda', formData.tesda);
                        }

                        console.log('FormData entries:');
                        for (let [key, value] of formDataToSend.entries()) {
                          console.log(`${key}:`, value);
                        }

                        const response = await fetch('/api/direct-hire', {
                          method: 'POST',
                          body: formDataToSend,
                        });

                        const result = await response.json();
                        console.log('API response:', result);
                        
                        if (result.success) {
                          setCreateOpen(false);
                          await fetchApplications(search, 1, showDeletedOnly);
                          // Reset form
                          setFormData({
                            name: "",
                            sex: "male",
                            jobsite: "",
                            position: "",
                            salary: "",
                            salaryCurrency: "USD" as Currency,
                            evaluator: "",
                            employer: "",
                          });
                          setControlNumberPreview(generateControlNumberPreview());
                          setFormStep(1);
                          toast({
                            title: 'Draft saved successfully',
                            description: 'You can continue editing this application later',
                          });
                        } else {
                          throw new Error(result.error || 'Failed to save draft');
                        }
                      } catch (error) {
                        console.error('Error saving draft:', error);
                        toast({
                          title: 'Error saving draft',
                          description: 'Failed to save the draft. Please try again.',
                          variant: 'destructive'
                        });
                      }
                    }}>Save as Draft</Button>
                    <Button 
                      className="bg-[#1976D2] text-white flex-1" 
                      type="button" 
                      onClick={async () => {
                        try {
                        // Convert salary to USD for storage
                        const salaryInUSD = formData.salaryCurrency === "USD" 
                          ? parseFloat(formData.salary)
                          : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency);

                        // Create FormData for file upload
                        const formDataToSend = new FormData();
                        formDataToSend.append('name', formData.name);
                        formDataToSend.append('sex', formData.sex);
                        formDataToSend.append('salary', salaryInUSD.toString());
                        formDataToSend.append('jobsite', formData.jobsite);
                        formDataToSend.append('position', formData.position);
                        formDataToSend.append('evaluator', formData.evaluator);
                        formDataToSend.append('status', 'evaluated'); // Default to evaluated for new applications

                        // Add files if they exist
                        if (formData.passport) {
                          formDataToSend.append('passport', formData.passport);
                        }
                        if (formData.visa) {
                          formDataToSend.append('visa', formData.visa);
                        }
                        if (formData.tesda) {
                          formDataToSend.append('tesda', formData.tesda);
                        }

                        const response = await fetch('/api/direct-hire', {
                          method: 'POST',
                          body: formDataToSend,
                        });

                        const result = await response.json();
                        if (result.success) {
                          const createdName = formData.name
                          // Close modal first so the list is visible
                          setCreateOpen(false);
                          // Refresh the table to include the newly created applicant
                          await fetchApplications(search, 1, showDeletedOnly)
                          // Allow render to commit
                          await new Promise(requestAnimationFrame)
                          // Small delay and a second refresh to avoid race conditions (e.g., doc generation)
                          await new Promise(resolve => setTimeout(resolve, 100))
                          await fetchApplications(search, 1, showDeletedOnly)
                          await new Promise(requestAnimationFrame)
                          // Reset form after refresh
                          setFormData({
                            name: "",
                            sex: "male",
                            jobsite: "",
                            position: "",
                            salary: "",
                            salaryCurrency: "USD" as Currency,
                            evaluator: "",
                          });
                          setControlNumberPreview(generateControlNumberPreview());
                          setFormStep(1);
                          toast({
                            title: 'Applicant created successfully!',
                            description: `${createdName} has been added to the system`,
                          });
                        } else {
                          throw new Error(result.error || 'Failed to create application');
                        }
                        } catch (error) {
                          toast({
                            title: 'Error creating application',
                            description: 'Failed to create the application. Please try again.',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      Create
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      {showEditDraftModal.open && showEditDraftModal.app && (() => {
        // Get fresh data from the applications list instead of stale modal state
        const freshApp = applications.find(app => app.id === showEditDraftModal.app?.id)
        const appData = freshApp || showEditDraftModal.app
        
        return (
          <CreateApplicationModal 
            onClose={() => setShowEditDraftModal({ open: false, app: null })}
            initialData={{
              id: appData.id,
              name: appData.name,
              email: (appData as any).email || '',
              cellphone: (appData as any).cellphone || '',
              sex: appData.sex,
              job_type: appData.job_type,
              jobsite: appData.jobsite,
              position: appData.position,
              salary: (appData as any).raw_salary || Number(appData.salary),
              salaryCurrency: (appData as any).salary_currency || 'USD',
              employer: (appData as any).employer || '',
              raw_salary: (appData as any).raw_salary || Number(appData.salary),
              control_number: appData.control_number,
              status: appData.status,
              status_checklist: appData.status_checklist
            }}
            applicationId={appData.id}
            onSuccess={() => fetchApplications(search, 1, showDeletedOnly)}
          />
        )
      })()}
      
      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false)
            setSelectedDocument(null)
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
          fileBlob={selectedDocument.fileBlob}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {applicationToDelete && (applicationToDelete as any).deleted_at ? 'Permanently Delete Application' : 'Delete Application'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {applicationToDelete && (applicationToDelete as any).deleted_at ? (
                <>
                  Are you sure you want to <strong>permanently delete</strong> the application for <strong>{applicationToDelete.name}</strong>? 
                  This action will permanently remove all data and cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete the application for <strong>{applicationToDelete?.name}</strong>? 
                  This will move the application to deleted items where it can be restored later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false)
              setApplicationToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {applicationToDelete && (applicationToDelete as any).deleted_at ? 'Permanently Delete' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={(open) => {
        setRestoreConfirmOpen(open)
        if (!open) {
          setRestoreConfirmText("")
          setApplicationToRestore(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore the application for <strong>{applicationToRestore?.name}</strong>?
              <br /><br />
              To confirm, please type <strong>RESTORE</strong> in the field below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="Type RESTORE to confirm"
              className="w-full border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && restoreConfirmText === "RESTORE") {
                  handleRestoreConfirm()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRestoreConfirmOpen(false)
              setRestoreConfirmText("")
              setApplicationToRestore(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestoreConfirm}
              disabled={restoreConfirmText !== "RESTORE"}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={permanentDeleteConfirmOpen} onOpenChange={(open) => {
        setPermanentDeleteConfirmOpen(open)
        if (!open) {
          setPermanentDeleteConfirmText("")
          setApplicationToPermanentDelete(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>permanently delete</strong> the application for <strong>{applicationToPermanentDelete?.name}</strong>?
              This action will permanently remove all data and cannot be undone.
              <br /><br />
              To confirm, please type <strong>DELETE</strong> in the field below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={permanentDeleteConfirmText}
              onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && permanentDeleteConfirmText === "DELETE") {
                  handlePermanentDeleteConfirm()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPermanentDeleteConfirmOpen(false)
              setPermanentDeleteConfirmText("")
              setApplicationToPermanentDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDeleteConfirm}
              disabled={permanentDeleteConfirmText !== "DELETE"}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Draft Confirmation Dialog */}
      <AlertDialog open={cancelDraftConfirmOpen} onOpenChange={(open) => {
        setCancelDraftConfirmOpen(open)
        if (!open) {
          setApplicationToCancelDraft(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the draft for <strong>{applicationToCancelDraft?.name}</strong>?
              <br /><br />
              This will move the draft to deleted items where it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCancelDraftConfirmOpen(false)
              setApplicationToCancelDraft(null)
            }}>
              Keep Draft
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelDraftConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  )
}

// Applicant Documents List Component
function ApplicantDocumentsList({ applicationId, refreshTrigger, onRefresh, onViewPDF, setSelectedDocument, setPdfViewerOpen }: ApplicantDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const { toast } = useToast()

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = (fileName.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf' || mimeType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-600" />
    }
    if (['doc', 'docx', 'rtf'].includes(ext) || mimeType.includes('word')) {
      return <FileText className="h-4 w-4 text-blue-600" />
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('spreadsheet')) {
      return <FileText className="h-4 w-4 text-green-600" />
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext) || mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-teal-600" />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="h-4 w-4 text-yellow-600" />
    }
    return <File className="h-4 w-4 text-gray-500" />
  }

  const formatDocumentType = (raw: string, fileName: string): string => {
    if (!raw) return ''
    
    // Get file extension from the actual file name
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    
    const key = raw.toLowerCase().trim()
    const map: Record<string, string> = {
      passport: 'Passport',
      visa: 'Visa/Work Permit',
      'visa/work permit': 'Visa/Work Permit',
      'visa work permit': 'Visa/Work Permit',
      tesda: 'TESDA NC/PRC License',
      'tesda nc': 'TESDA NC/PRC License',
      'tesda nc/prc license': 'TESDA NC/PRC License',
      clearance: 'Clearance',
      comprehensive_clearance: 'Comprehensive Clearance',
      confirmation: 'MWO/POLO/PE/PCG Confirmation',
      issuance_of_oec_memorandum: 'Memorandum Issuance of OEC',
      dmw_clearance_request: 'Clearance Request',
    }
    
    let formattedName = ''
    if (map[key]) {
      formattedName = map[key]
    } else {
      formattedName = raw
        .replace(/[_-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    
    // Append file extension if it exists
    return fileExtension ? `${formattedName}.${fileExtension}` : formattedName
  }

  // Fetch documents for this application
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
        const result = await response.json()
        
        if (result.success) {
          setDocuments(result.data)
        } else {
          console.error('Failed to fetch documents:', result.error)
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
        toast({
          title: 'Error',
          description: 'Failed to load documents',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    if (applicationId) {
      fetchDocuments()
    }
  }, [applicationId, refreshTrigger, toast])

  // Handle document view/download
  const handleView = async (document: Document) => {
    try {
      console.log('Attempting to view document:', {
        id: document.id,
        fileName: document.file_name,
        documentType: document.document_type,
        mimeType: document.mime_type,
        filePath: document.file_path
      })
      
      // Use document ID approach instead of fetching blob
      setSelectedDocument({
        id: document.id,
        name: document.file_name
      })
      setPdfViewerOpen(true)
    } catch (error) {
      console.error('View error:', error)
      toast({
        title: 'View Error',
        description: `Failed to view document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  // Handle document edit
  const handleEdit = (document: Document) => {
    setEditingDocument(document.id)
    // Extract just the document type name without the file extension
    // The document_type field contains the original name without extension
    setEditName(document.document_type)
  }

  // Handle document download
  const handleDownload = async (doc: Document, format: 'pdf' | 'docx' | 'original') => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download?format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Generate appropriate filename based on format and original file type
        let filename: string
        if (format === 'original') {
          // Use the original file name and extension
          filename = doc.file_name
        } else {
          // For format conversion requests, use the requested format
          const baseName = doc.file_name.split('.')[0]
          const extension = format === 'pdf' ? 'pdf' : 'docx'
          filename = `${baseName}.${extension}`
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        const formatText = format === 'original' ? 'original format' : format.toUpperCase()
        toast({
          title: 'Download Started',
          description: `${doc.document_type} has been downloaded in ${formatText}`,
        })
      } else {
        // Handle conversion error responses
        const errorData = await response.json()
        if (errorData.error && errorData.originalFormat && errorData.requestedFormat) {
          toast({
            title: 'Conversion Not Supported',
            description: errorData.error,
            variant: 'destructive'
          })
        } else {
          throw new Error('Download failed')
        }
      }
    } catch (error) {
      toast({
        title: 'Download Error',
        description: `Failed to download document`,
        variant: 'destructive'
      })
    }
  }

  // Handle document name update
  const handleUpdateName = async (document: Document) => {
    if (!editName.trim()) {
      toast({
        title: 'Error',
        description: 'Document name cannot be empty',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentName: editName.trim() })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setDocuments(docs => docs.map(doc => 
          doc.id === document.id 
            ? { ...doc, document_type: editName.trim() }
            : doc
        ))
        setEditingDocument(null)
        setEditName('')
        // Refresh the documents list
        onRefresh?.()
        toast({
          title: 'Document updated',
          description: 'Document name has been updated',
        })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      console.error('Error updating document name:', error)
      toast({
        title: 'Update Error',
        description: error instanceof Error ? error.message : 'Failed to update document name',
        variant: 'destructive'
      })
    }
  }

  // Handle document delete
  const handleDelete = async (document: Document) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${document.file_name}?`)
    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        setDocuments(docs => docs.filter(doc => doc.id !== document.id))
        // Refresh the documents list
        onRefresh?.()
        toast({
          title: 'Document deleted',
          description: `${document.file_name} has been removed`,
        })
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error) {
      toast({
        title: 'Delete Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    }
  }

  const isImportantDocument = (doc: Document): boolean => {
    const type = (doc.document_type || '').toLowerCase().trim()
    const file = (doc.file_name || '').toLowerCase().trim()
    const ext = file.split('.').pop() || ''

    // Always include these explicit types
    if (type === 'dmw_clearance_request') return true
    if (type === 'evaluation_requirements_checklist') return true
    if (type === 'issuance_of_oec_memorandum') return true
    if (type === 'clearance') return true
    if (type === 'comprehensive_clearance') return true

    // Include the confirmation DOCX, but NOT its verification image
    if (type === 'confirmation') return true
    if (type === 'confirmation_verification_image') return false

    // Fallback filename-based heuristics (DOCX only)
    const isDocx = ext === 'docx'
    if (isDocx && (file.includes('dmw clearance request') || file.includes('dmw-clearance-request'))) return true
    if (isDocx && (file.includes('issuance of oec') || file.includes('issuance-of-oec') || file.includes('memorandum issuance of oec'))) return true
    if (isDocx && (file.includes('evaluation requirements checklist') || file.includes('evaluation-requirements-checklist'))) return true
    if (isDocx && (file.includes('mwo-polo-pe-pcg confirmation') || file.includes('mwo polo pe pcg confirmation'))) return true
    if (isDocx && file.includes('clearance')) return true

    return false
  }

  const renderDocumentRow = (document: Document) => (
    <div key={document.id} className="relative flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
      <div className="flex items-center space-x-3">
        {getFileIcon(document.file_name, document.mime_type)}
        {editingDocument === document.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-sm border rounded px-2 py-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateName(document)
                } else if (e.key === 'Escape') {
                  setEditingDocument(null)
                  setEditName('')
                }
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleUpdateName(document)}
              className="h-6 px-2 text-xs"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingDocument(null)
                setEditName('')
              }}
              className="h-6 px-2 text-xs"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <span className="text-sm font-medium">{formatDocumentType(document.document_type, document.file_name)}</span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(() => {
              const isDocx = document.file_name.toLowerCase().endsWith('.docx')
              if (isDocx) return null
              return (
                <DropdownMenuItem onClick={() => handleView(document)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
              )
            })()}
            {(() => {
              const fileExtension = document.file_name.split('.').pop()?.toLowerCase() || ''
              let downloadText = 'Download'
              if (document.mime_type.includes('word') || document.file_name.toLowerCase().endsWith('.docx')) {
                downloadText = 'Download DOCX'
              } else if (document.mime_type.includes('pdf') || document.file_name.toLowerCase().endsWith('.pdf')) {
                downloadText = 'Download PDF'
              } else if (document.mime_type.includes('image') || document.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
                downloadText = `Download ${fileExtension.toUpperCase()}`
              } else {
                downloadText = `Download ${fileExtension.toUpperCase()}`
              }
              return (
                <DropdownMenuItem onClick={() => handleDownload(document, 'original')}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloadText}
                </DropdownMenuItem>
              )
            })()}
            {(() => {
              // Hide edit for specific screenshot documents
              const type = String(document.document_type || '').toLowerCase()
              const isScreenshotType = type === 'for_interview_screenshot' || type === 'confirmation_verification_image'
              const file = String(document.file_name || '')
              const isScreenshotFile = file === 'For Interview Screenshot.png' || file === 'Confirmation Verification Image.png'
              if (isScreenshotType || isScreenshotFile) return null
              return (
                <DropdownMenuItem onClick={() => handleEdit(document)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Name
                </DropdownMenuItem>
              )
            })()}
            {(() => {
              // Hide delete button for specific screenshot documents
              const type = String(document.document_type || '').toLowerCase()
              const isScreenshotType = type === 'for_interview_screenshot' || type === 'confirmation_verification_image'
              // Also fall back to filename check to be safe
              const file = String(document.file_name || '')
              const isScreenshotFile = file === 'For Interview Screenshot.png' || file === 'Confirmation Verification Image.png'
              if (isScreenshotType || isScreenshotFile) return null
              return (
                <DropdownMenuItem className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(document)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )
            })()}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading documents...
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No documents uploaded yet
      </div>
    )
  }

  const importantDocs = documents.filter(isImportantDocument)
  const otherDocs = documents.filter(d => !isImportantDocument(d))

  return (
    <div className="space-y-4">
      {importantDocs.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Important Documents</div>
          <div className="space-y-2">
            {importantDocs.map(renderDocumentRow)}
          </div>
        </div>
      )}
      {otherDocs.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Other Documents</div>
          <div className="space-y-2">
            {otherDocs.map(renderDocumentRow)}
          </div>
        </div>
      )}
    </div>
  )
}

// Document Upload Form Component
interface DocumentUploadFormProps {
  applicationId: string
  applicationType: string
  onSuccess: () => void
  onError: (error: string) => void
  onCancel: () => void
}

function DocumentUploadForm({ applicationId, applicationType, onSuccess, onError, onCancel }: DocumentUploadFormProps) {
  const [uploading, setUploading] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      onError('Please select a file and enter a document name')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('applicationId', applicationId)
      formData.append('applicationType', applicationType)
      formData.append('documentName', documentName.trim())

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Document Name</label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Enter document name (e.g., Passport, Visa, Employment Contract)"
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">File</label>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          accept=".jpg,.jpeg,.png,.pdf"
          className="w-full border rounded px-3 py-2 mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !documentName.trim()}
          className="bg-[#1976D2] hover:bg-[#1565C0]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </div>
    </div>
  )
}

