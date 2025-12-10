"use client"

import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { MoreHorizontal, Eye, Edit, Trash2, FileText, File, Image as ImageIcon, FileArchive, Plus, BadgeCheck, X, AlertTriangle, Loader2, Settings, RefreshCcw, Download, RotateCcw, ArrowRight, Flag, Flag as FlagSolid } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState, useEffect, useCallback } from "react"
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
import TransactionHistory from "@/components/transaction-history"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const correctionFieldOptions = [
  { value: 'email', label: 'Email Address' },
  { value: 'cellphone', label: 'Phone Number' },
  { value: 'name', label: 'Full Name' },
  { value: 'sex', label: 'Sex' },
  { value: 'jobsite', label: 'Job Site' },
  { value: 'position', label: 'Position' },
  { value: 'job_type', label: 'Job Type' },
  { value: 'employer', label: 'Employer' },
  { value: 'salary', label: 'Salary' },
  { value: 'evaluator', label: 'Evaluator' },
  { value: 'documents', label: 'Documents (re-upload)' },
]

const statusProgression = [
  { key: 'evaluated', label: 'Evaluated' },
  { key: 'for_confirmation', label: 'For Confirmation' },
  { key: 'emailed_to_dhad', label: 'Emailed to DHAD' },
  { key: 'received_from_dhad', label: 'Received from DHAD' },
  { key: 'for_interview', label: 'For Interview' },
]

const getNextStatus = (statusChecklist?: any, fallbackStatus?: string) => {
  if (statusChecklist) {
    for (const item of statusProgression) {
      const checked = statusChecklist[item.key]?.checked
      if (!checked) return item
    }
    return null
  }
  // Fallback: derive from legacy status
  const order = ['pending', ...statusProgression.map(s => s.key)]
  const idx = fallbackStatus ? order.indexOf(fallbackStatus) : -1
  if (idx === -1 || idx === order.length - 1) return null
  const nextKey = order[idx + 1]
  return statusProgression.find(s => s.key === nextKey) || null
}

// Defer auth role check to client to avoid hydration mismatch

interface DirectHireApplicationsTableProps {
  search: string
  filterQuery?: string
  showDeletedOnly?: boolean
  showFinishedOnly?: boolean
  showProcessingOnly?: boolean
  statusFilter?: string[]
}

interface ApplicantDocumentsTabProps {
  applicationId: string
  refreshTrigger?: number
  onRefresh?: () => void
  onViewPDF?: (documentId: string, documentName: string) => void
  setSelectedDocument: (document: {id: string, name: string, fileBlob?: Blob} | null) => void
  setPdfViewerOpen: (open: boolean) => void
  onFlagDocument?: (key: string, label: string) => void
  isDocumentFlagged?: (key: string) => boolean
  getDocumentFlagReason?: (key: string) => string
  isDocumentCorrected?: (key: string) => boolean
  isDocumentResolved?: (key: string) => boolean
  onResolveDocument?: (key: string) => Promise<void>
  isPendingStatus?: boolean
}

export default function DirectHireApplicationsTable({ search, filterQuery = "", showDeletedOnly: propShowDeletedOnly, showFinishedOnly: propShowFinishedOnly, showProcessingOnly: propShowProcessingOnly, statusFilter: propStatusFilter }: DirectHireApplicationsTableProps) {
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
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [correctionItems, setCorrectionItems] = useState<{ field_key: string; message: string }[]>([{ field_key: '', message: '' }])
  const [correctionNote, setCorrectionNote] = useState('')
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [openCorrections, setOpenCorrections] = useState<{ field_key: string; message: string; created_at?: string }[]>([])
  const [allCorrections, setAllCorrections] = useState<{ field_key: string; message: string; resolved_at?: string | null; created_at?: string }[]>([])
  const [correctionsLoading, setCorrectionsLoading] = useState(false)
  const [flagTarget, setFlagTarget] = useState<{ key: string; label: string } | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [flagModalOpen, setFlagModalOpen] = useState(false)
  const [isReFlagging, setIsReFlagging] = useState(false)
  const [localFlags, setLocalFlags] = useState<{ field_key: string; message: string }[]>([])
  const [selectedDocsMeta, setSelectedDocsMeta] = useState<Record<string, string>>({})
  
  // Check if field is flagged (either locally or in corrections)
  const isFieldFlagged = (key: string) => {
    return localFlags.some(f => f.field_key === key) || allCorrections.some(c => c.field_key === key)
  }
  
  // Get flag reason
  const getFlagReason = (key: string) => {
    const localFlag = localFlags.find(f => f.field_key === key)
    if (localFlag) return localFlag.message
    const correction = allCorrections.find(c => c.field_key === key)
    return correction?.message || ''
  }
  
  // Check if field was corrected by applicant (orange flag)
  // A field is "corrected" if it was flagged, applicant resubmitted (needs_correction = false), but staff hasn't verified yet (not resolved)
  const isFieldCorrected = (key: string) => {
    const correction = allCorrections.find(c => c.field_key === key)
    if (!correction || correction.resolved_at) return false
    
    // If correction exists, not resolved, and needs_correction is false, it means applicant has corrected but staff hasn't verified
    return !selected?.needs_correction
  }
  
  // Check if field is resolved (green flag)
  const isFieldResolved = (key: string) => {
    const correction = allCorrections.find(c => c.field_key === key)
    return correction ? !!correction.resolved_at : false
  }
  
  // Helper function to get user-friendly field labels
  const getFieldLabel = (fieldKey: string): string => {
    const fieldLabelMap: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      cellphone: 'Phone Number',
      sex: 'Sex',
      jobsite: 'Job Site',
      position: 'Position',
      job_type: 'Job Type',
      employer: 'Employer',
      salary: 'Salary',
      raw_salary: 'Salary',
      salary_currency: 'Salary Currency',
      evaluator: 'Evaluator',
      passport_number: 'Passport Number',
      passport_validity: 'Passport Validity',
      visa_category: 'Visa Category',
      visa_type: 'Visa Type',
      visa_number: 'Visa Number',
      visa_validity: 'Visa Validity',
      ec_issued_date: 'Employment Contract Issued Date',
      ec_verification: 'Employment Contract Verification Type',
    }
    
    // Handle document fields (e.g., document_passport -> Passport)
    if (fieldKey.startsWith('document_')) {
      const docType = fieldKey.replace('document_', '')
      return docType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    return fieldLabelMap[fieldKey] || fieldKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  const renderFlaggableField = (key: string, label: string, value: React.ReactNode) => {
    const flagged = isFieldFlagged(key)
    const corrected = isFieldCorrected(key)
    const resolved = isFieldResolved(key)
    const isPendingStatus = selected?.status === 'pending' || (selected as any)?.status_checklist === null
    // Flagging should only be available when status is 'pending' AND evaluated is not checked
    // If evaluated is checked, the application has moved past "For Evaluation"
    const statusChecklist = (selected as any)?.status_checklist
    const isEvaluated = statusChecklist?.evaluated?.checked === true
    const isForEvaluation = selected?.status === 'pending' && !isEvaluated
    
    // Determine flag color and state
    let flagColor = 'text-red-600 fill-red-600'
    let flagBorderColor = 'border-red-200'
    let flagTextColor = 'text-red-700'
    let flagState = 'Flagged'
    
    if (resolved) {
      flagColor = 'text-green-600 fill-green-600'
      flagBorderColor = 'border-green-200'
      flagTextColor = 'text-green-700'
      flagState = '✓ Resolved'
    } else if (corrected) {
      flagColor = 'text-amber-600 fill-amber-600'
      flagBorderColor = 'border-amber-300'
      flagTextColor = 'text-amber-800'
      flagState = 'Needs Review'
    }
    
    return (
      <div className="relative group">
        <div className="text-gray-500">{label}</div>
        <div className="font-medium flex items-center gap-1">
          {value}
          {flagged && (
            <div className="relative flex items-center gap-1">
              <FlagSolid className={`h-5 w-5 ${flagColor}`} />
              <div className={`absolute z-20 hidden group-hover:block left-0 top-full mt-1 min-w-[180px] rounded-md bg-white shadow-lg border ${flagBorderColor} p-2 text-xs ${flagTextColor}`}>
                {corrected ? (
                  <div>{getFlagReason(key)}</div>
                ) : (
                  <>
                    <div className="font-medium mb-1">{flagState}</div>
                    <div>{getFlagReason(key)}</div>
                  </>
                )}
              </div>
              {isForEvaluation && corrected && !resolved && (
                <button
                  type="button"
                  onClick={() => {
                    setFieldToResolve({ key, label })
                    setResolveConfirmOpen(true)
                  }}
                  className="ml-1 text-xs text-green-600 hover:text-green-700 underline"
                  title="Mark as resolved"
                >
                  ✓
                </button>
              )}
            </div>
          )}
          {!flagged && isForEvaluation && (
            <button
              type="button"
              onClick={() => {
                setFlagTarget({ key, label })
                setFlagReason(getFlagReason(key))
                setIsReFlagging(false)
                setFlagModalOpen(true)
              }}
              className="inline-flex items-center text-red-600 hover:text-red-700 transition-opacity ml-1 opacity-0 group-hover:opacity-100"
              aria-label={`Flag ${label}`}
              title={`Flag ${label}`}
            >
              <Flag className="h-5 w-5" />
            </button>
          )}
          {corrected && !resolved && isForEvaluation && (
            <button
              type="button"
              onClick={() => {
                setFlagTarget({ key, label })
                setFlagReason(getFlagReason(key))
                setIsReFlagging(true)
                setFlagModalOpen(true)
              }}
              className="inline-flex items-center text-red-600 hover:text-red-700 ml-1"
              aria-label="Flag again"
              title="Flag again - correction not sufficient"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {flagged && !corrected && (
          <div className={`text-xs ${flagTextColor}`}>
            {flagState}: {getFlagReason(key)}
          </div>
        )}
      </div>
    )
  }

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
  const [showProcessingOnly, setShowProcessingOnly] = useState(false)
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmingPassword, setConfirmingPassword] = useState(false)
  const [correctionRefreshKey, setCorrectionRefreshKey] = useState(0)
  const [confirmPurpose, setConfirmPurpose] = useState<'deleted' | 'finished' | null>(null)
  const [viewedApplications, setViewedApplications] = useState<Set<string>>(new Set())
  
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
  const fetchOpenCorrections = async (applicationId: string) => {
    try {
      setCorrectionsLoading(true)
      // Fetch all corrections including resolved ones
      const res = await fetch(`/api/direct-hire/${applicationId}/corrections?include_resolved=true`)
      const data = await res.json()
      if (data.success) {
        const allCorrs = data.data || []
        setAllCorrections(allCorrs)
        // Filter to only open corrections for the openCorrections state
        const openCorrs = allCorrs.filter((c: any) => !c.resolved_at)
        setOpenCorrections(openCorrs)
        // Set local flags to open corrections (for new flags being added)
        setLocalFlags(openCorrs)
      } else {
        setOpenCorrections([])
        setAllCorrections([])
        setLocalFlags([])
      }
    } catch (err) {
      setOpenCorrections([])
      setAllCorrections([])
      setLocalFlags([])
    } finally {
      setCorrectionsLoading(false)
    }
  }

  const fetchSelectedDocumentsMeta = async (applicationId: string) => {
    try {
      const res = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
      const data = await res.json()
      if (!data.success) {
        setSelectedDocsMeta({})
        return
      }
      const meta: Record<string, string> = {}
      const docs = data.data || []
      docs.forEach((doc: any) => {
        const m = doc.meta || {}
        if (m.passport_number) meta.passport_number = m.passport_number
        if (m.passport_expiry) meta.passport_validity = m.passport_expiry
        if (m.visa_category) meta.visa_category = m.visa_category
        if (m.visa_type) meta.visa_type = m.visa_type
        if (m.visa_number) meta.visa_number = m.visa_number
        if (m.visa_validity) meta.visa_validity = m.visa_validity
        if (m.ec_issued_date) meta.ec_issued_date = m.ec_issued_date
        if (m.ec_verification) meta.ec_verification = m.ec_verification
      })
      setSelectedDocsMeta(meta)
    } catch (err) {
      setSelectedDocsMeta({})
    }
  }
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<DirectHireApplication | null>(null)
  
  // Status change confirmation state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [statusToChange, setStatusToChange] = useState<{key: string, label: string} | null>(null)
  
  // Return for compliance confirmation state
  const [returnForComplianceConfirmOpen, setReturnForComplianceConfirmOpen] = useState(false)
  
  // Mark as resolved confirmation state
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false)
  const [fieldToResolve, setFieldToResolve] = useState<{ key: string; label: string } | null>(null)

  // Extract sex filter from parsed filters (moved to top to avoid initialization error)
  const normalizedSearch = search.trim().toLowerCase()
  const normalizedFilterQuery = (filterQuery || '').trim().toLowerCase()
  
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

  const { filters: searchFilters } = parseSearch(normalizedSearch)
  const { filters: panelFilters } = parseSearch(normalizedFilterQuery)
  const combinedFilters = { ...searchFilters, ...panelFilters }
  const sexFilter = combinedFilters.sex
  const statusFilter = propStatusFilter || (combinedFilters.status ? combinedFilters.status.split(',') : undefined)
  const evaluatorFilter = combinedFilters.evaluator
  const jobsiteFilter = combinedFilters.jobsite
  const positionFilter = combinedFilters.position
  const dateRangeFilter = combinedFilters.date_range || combinedFilters.date
  const effectiveSearch = [
    normalizedSearch,
    evaluatorFilter ? `evaluator:${evaluatorFilter}` : '',
    jobsiteFilter ? `jobsite:${jobsiteFilter}` : '',
    positionFilter ? `position:${positionFilter}` : '',
    dateRangeFilter ? `date:${dateRangeFilter}` : ''
  ]
    .filter(Boolean)
    .join(' ')

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

  // Function to mark application as viewed
  const markApplicationAsViewed = useCallback(async (applicationId: string) => {
    // Check if already marked as viewed locally
    if (viewedApplications.has(applicationId)) {
      return
    }

    try {
      const response = await fetch(`/api/direct-hire/${applicationId}/view`, {
        method: 'POST',
        credentials: 'include',
      })
      
      if (response.ok) {
        // Add to viewed set
        setViewedApplications(prev => new Set(prev).add(applicationId))
      }
    } catch (error) {
      console.error('Error marking application as viewed:', error)
    }
  }, [viewedApplications])

  // Function to check if application has been viewed
  const checkApplicationViewed = useCallback(async (applicationId: string) => {
    if (viewedApplications.has(applicationId)) {
      return true
    }

    try {
      const response = await fetch(`/api/direct-hire/${applicationId}/view`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.viewed) {
          setViewedApplications(prev => new Set(prev).add(applicationId))
          return true
        }
      }
    } catch (error) {
      console.error('Error checking application view status:', error)
    }
    
    return false
  }, [viewedApplications])

  useEffect(() => {
    if (correctionModalOpen && selected?.id) {
      void fetchOpenCorrections(selected.id)
    }
  }, [correctionModalOpen, selected?.id])

  // Check view status for all applications with applicant_user_id when applications are loaded
  useEffect(() => {
    const checkViews = async () => {
      const applicantApps = applications.filter(app => (app as any).applicant_user_id)
      const promises = applicantApps.map(app => checkApplicationViewed(app.id))
      await Promise.all(promises)
    }
    
    if (applications.length > 0) {
      void checkViews()
    }
  }, [applications, checkApplicationViewed])

  // Fetch corrections when view modal opens or when corrections are refreshed
  useEffect(() => {
    if (open && selected?.id) {
      void fetchOpenCorrections(selected.id)
      // Mark application as viewed when modal opens
      markApplicationAsViewed(selected.id)
    }
  }, [open, selected?.id, correctionRefreshKey, markApplicationAsViewed])

  useEffect(() => {
    if (selected?.id) {
      void fetchSelectedDocumentsMeta(selected.id)
    } else {
      setSelectedDocsMeta({})
    }
  }, [selected?.id])

  const handleFlagContext = (e: React.MouseEvent, key: string, label: string) => {
    e.preventDefault()
    setFlagTarget({ key, label })
    setFlagReason(getFlagReason(key))
    setFlagModalOpen(true)
  }

  const upsertFlag = (key: string, message: string) => {
    setLocalFlags(prev => {
      const existing = prev.find(f => f.field_key === key)
      if (existing) {
        return prev.map(f => f.field_key === key ? { ...f, message } : f)
      }
      return [...prev, { field_key: key, message }]
    })
  }

  // Initial load and whenever filter toggles change
  useEffect(() => {
    fetchApplications(effectiveSearch, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, evaluatorFilter, jobsiteFilter, positionFilter, dateRangeFilter])

  // Sync toggles from parent filter panel (apply-on-apply behavior)
  useEffect(() => {
    if (typeof propShowDeletedOnly === 'boolean') {
      setShowDeletedOnly(propShowDeletedOnly)
    }
  }, [propShowDeletedOnly])

  useEffect(() => {
    if (typeof propShowFinishedOnly === 'boolean') {
      setShowFinishedOnly(propShowFinishedOnly)
    }
  }, [propShowFinishedOnly])

  useEffect(() => {
    if (typeof propShowProcessingOnly === 'boolean') {
      setShowProcessingOnly(propShowProcessingOnly)
    }
  }, [propShowProcessingOnly])

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
    fetchApplications(effectiveSearch, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only fetch on initial load and when explicitly triggered

  // Listen for global refresh events (e.g., from page-level Create modal)
  useEffect(() => {
    const handler = () => {
      fetchApplications(effectiveSearch, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
    }
    window.addEventListener('refresh:direct_hire' as any, handler as any)
    return () => window.removeEventListener('refresh:direct_hire' as any, handler as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter, evaluatorFilter, jobsiteFilter, positionFilter, dateRangeFilter])

  // Listen for open application view event (from notifications)
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { applicationId, applicationType } = event.detail
      if (applicationType === 'direct_hire' && applicationId) {
        // Wait a bit for the page to load, then try to find the application
        setTimeout(() => {
          // Find the application in the current list
          const app = applications.find(a => a.id === applicationId)
          if (app) {
            setSelected(app)
            setOpen(true)
            markApplicationAsViewed(applicationId)
          } else {
            // Application not in current list, fetch it directly
            fetch(`/api/direct-hire/${applicationId}`, {
              credentials: 'include',
            })
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data) {
                  setSelected(data.data)
                  setOpen(true)
                  markApplicationAsViewed(applicationId)
                  // Refresh the list to include this application
                  fetchApplications(effectiveSearch, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
                }
              })
              .catch(err => {
                console.error('Error fetching application:', err)
              })
          }
        }, 300) // Small delay to ensure page is loaded
      }
    }
    window.addEventListener('open:application:view', handler as EventListener)
    return () => window.removeEventListener('open:application:view', handler as EventListener)
  }, [applications, markApplicationAsViewed, effectiveSearch, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter, fetchApplications])

  // Filter applications based on search (parseSearch and sexFilter already defined above)
  
  // Debug logs removed

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
          await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
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
        await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
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
        await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
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

  // Server-side filtering handles search, status, sex, and toggles.
  // To avoid hiding valid rows (e.g., "finished"), use the API result as-is.
  const filteredApplications = applications

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

    // Compute progress based on how many main statuses are completed
    const STATUS_KEYS = ['evaluated','for_confirmation','emailed_to_dhad','received_from_dhad','for_interview'] as const
    const completedCount = STATUS_KEYS.reduce((acc, key) => acc + (status_checklist?.[key]?.checked ? 1 : 0), 0)
    const totalCount = STATUS_KEYS.length

    switch (latestKey) {
      case "evaluated":
        currentStatus = "Evaluated"
        statusColor = "bg-blue-50 text-blue-700" // Very Light Blue
        break
      case "for_confirmation_confirmed":
        currentStatus = "Confirmed"
        statusColor = "bg-blue-100 text-blue-800" // Light Blue
        break
      case "for_confirmation":
        currentStatus = "For Confirmation"
        statusColor = "bg-blue-100 text-blue-800" // Light Blue
        break
      case "emailed_to_dhad":
        currentStatus = "Emailed to DHAD"
        statusColor = "bg-blue-200 text-blue-800" // Medium Blue
        break
      case "received_from_dhad":
        currentStatus = "Received from DHAD"
        statusColor = "bg-teal-100 text-teal-800" // Teal / Aqua
        break
      case "for_interview":
        currentStatus = "For Interview"
        statusColor = "bg-green-500 text-white" // Medium Green
        break
      case null:
      default:
        // If no derived key, fall back to legacy status
        switch (application.status) {
          case 'evaluated':
            currentStatus = 'Evaluated'
            statusColor = 'bg-blue-50 text-blue-700' // Very Light Blue
            break
          case 'pending':
            currentStatus = 'For Evaluation'
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
            statusColor = 'bg-gray-100 text-gray-800' // 0 – Gray
        }
    }

    // If all statuses are checked, show Finished
    if (totalCount > 0 && completedCount === totalCount) {
      currentStatus = 'Finished'
      statusColor = 'bg-green-600 text-white' // Bold Green
    }

    // Keep numeric indicator only (no progress bar colors)

    return (
      <div className="flex flex-col gap-2">
        <div 
          className={`${statusColor} text-sm px-3 py-1.5 rounded-full w-fit font-medium flex justify-center items-center border`}
        >
          <span>{currentStatus}</span>
          {status_checklist && (
            <span className="ml-2 flex items-center gap-1">
              <span className="opacity-60">|</span>
              <span className="text-xs opacity-80">{completedCount}/{totalCount}</span>
            </span>
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
                      onClick={() => fetchApplications(search, i, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)}
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
                      onClick={() => fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly)}
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
                      onClick={() => fetchApplications(search, i, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)}
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
                      onClick={() => fetchApplications(search, totalPages, showDeletedOnly, showFinishedOnly, showProcessingOnly)}
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
        {/* toggles moved into filter panel */}

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
                filteredApplications.map((application) => {
                  const isDeleted = (application as any).deleted_at
                  return (
                    <tr 
                      key={application.id} 
                      className={`transition-colors duration-75 select-none ${
                        isDeleted 
                          ? 'bg-gray-100 opacity-75 cursor-not-allowed' 
                          : 'hover:bg-gray-150 cursor-pointer'
                      }`}
                      onDoubleClick={isDeleted ? undefined : (e) => {
                        e.preventDefault()
                        setSelected(application)
                        setOpen(true)
                        markApplicationAsViewed(application.id)
                      }}
                    >
                    <td className="py-3 px-4 text-center">
                      {application.control_number}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(application.name || '').toUpperCase()}
                      {(application as any).applicant_user_id && (
                        <div className="mt-1 inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 relative">
                          Applicant
                          {!viewedApplications.has(application.id) && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center capitalize">{(application.sex || '').toUpperCase()}</td>
                    {(() => {
                      const raw = (application as any).raw_salary ?? (application as any).rawSalary
                      const curRaw = (
                        (application as any).salary_currency ??
                        (application as any).salaryCurrency ??
                        (application as any).currency ??
                        (application as any).currency_code ??
                        (application as any).currencyCode
                      ) as string | undefined
                      const cur = curRaw ? (curRaw as string).toUpperCase() : undefined
                      const storedSalary = (() => {
                        const val = (application as any).salary
                        if (typeof val === 'number') return val
                        if (typeof val === 'string') return Number(val.replace(/,/g, '')) || 0
                        return 0
                      })()
                      let usd = storedSalary
                      let rawNum: number | null = null
                      if (cur && raw !== undefined && raw !== null) {
                        rawNum = typeof raw === 'string' ? Number(String(raw).replace(/,/g, '')) : Number(raw || 0)
                        usd = convertToUSD(rawNum, cur as any)
                      } else if (cur && (raw === undefined || raw === null)) {
                        // Historical rows: no raw_salary, but have currency; treat stored salary as raw
                        rawNum = storedSalary
                        usd = convertToUSD(storedSalary, cur as any)
                      }
                      // Round USD to nearest hundredths for display consistency
                      usd = Math.round((usd + Number.EPSILON) * 100) / 100
                      const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      const cls = usd < 1000 ? 'text-red-500' : ''
                      return (
                        <td className={`py-3 px-4 text-center font-medium ${cls}`}>
                          {cur && rawNum !== null
                            ? `USD ${fmt(usd)} / ${cur} ${fmt(rawNum)}`
                            : `$${fmt(usd)}`}
                        </td>
                      )
                    })()}
                    <td className="py-3 px-4 flex justify-center items-center">{getStatusBadge(application)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${isDeleted ? 'hover:bg-gray-200' : 'hover:bg-gray-150'}`}
                            >
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
                                      }} className="text-green-600 focus:text-green-700">
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
                                    {/* For deleted non-draft applications, show only Restore and Permanently Delete */}
                                    {userIsSuperadmin && (
                                      <DropdownMenuItem onClick={() => {
                                        setApplicationToRestore(application)
                                        setRestoreConfirmOpen(true)
                                      }} className="text-green-600 focus:text-green-700">
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
                                    <DropdownMenuItem onClick={() => { 
                                      setSelected(application)
                                      setOpen(true)
                                      markApplicationAsViewed(application.id)
                                    }}>
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
                                    {/* Compliance Form button hidden for now when salary is below threshold */}
                                    {/* {application.salary < 1000 && (
                                      <DropdownMenuItem onClick={() => { toast({ title: "Compliance form generated", description: "The document has been prepared and is ready for download" }) }}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Compliance Form
                                      </DropdownMenuItem>
                                    )} */}
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      {/* Applicant Details Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{selected?.name}'s Application</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selected && (
            <>
            <div className="px-8 py-6 overflow-y-auto flex-1">
              {/* Personal Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Applicant Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {renderFlaggableField('name', 'Name:', selected.name)}
                  {renderFlaggableField('email', 'Email:', (selected as any).email || 'N/A')}
                  {renderFlaggableField('cellphone', 'Cellphone No.:', (selected as any).cellphone || 'N/A')}
                  {renderFlaggableField('sex', 'Sex:', <span className="uppercase">{selected.sex}</span>)}
                </div>
              </div>
              <hr className="my-4" />
              {/* Employment Details */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Employment Details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {renderFlaggableField('jobsite', 'Jobsite:', (selected.jobsite || '').toUpperCase())}
                  {renderFlaggableField('position', 'Position:', selected.position)}
                  {renderFlaggableField('job_type', 'Job Type:', ((selected as any).job_type || 'N/A').toUpperCase())}
                  {renderFlaggableField('employer', 'Employer:', (selected as any).employer || 'N/A')}
                  {renderFlaggableField('salary', 'Salary (per month):', (() => {
                    const raw = (selected as any).raw_salary ?? (selected as any).rawSalary
                    const cur = ((selected as any).salary_currency ?? (selected as any).salaryCurrency) || ''
                    const rawNum = typeof raw === 'string' ? Number(String(raw).replace(/,/g, '')) : Number(raw || 0)
                    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return `${fmt(rawNum)} ${cur ? String(cur).toUpperCase() : ''}`.trim()
                  })())}
                  {renderFlaggableField('evaluator', 'Evaluator:', selected.evaluator || 'Not assigned')}
                </div>
              </div>
              <hr className="my-4" />
              {/* Processing Times */}
              {((selected as any).time_received || (selected as any).time_released) && (
                <>
                  <div className="mb-6">
                    <div className="font-semibold text-gray-700 mb-2">Processing Times</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {(selected as any).time_received && (
                        <div>
                          <div className="text-gray-500">Time Received:</div>
                          <div className="font-medium">
                            {new Date((selected as any).time_received).toLocaleString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      )}
                      {(selected as any).time_released && (
                        <div>
                          <div className="text-gray-500">Time Released:</div>
                          <div className="font-medium">
                            {new Date((selected as any).time_released).toLocaleString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <hr className="my-4" />
                </>
              )}
              {/* Application Status */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-700">Application Status</div>
                </div>
                <ul className="text-sm">
                  {(() => {
                    const { status_checklist } = selected
                    const statusOptions = [
                      { key: 'evaluated', label: 'Evaluated', dot: 'text-blue-600', text: 'text-blue-700' },
                      { key: 'for_confirmation', label: 'For Confirmation', dot: 'text-blue-500', text: 'text-blue-800' },
                      { key: 'emailed_to_dhad', label: 'Emailed to DHAD', dot: 'text-blue-600', text: 'text-blue-800' },
                      { key: 'received_from_dhad', label: 'Received from DHAD', dot: 'text-teal-600', text: 'text-teal-700' },
                      { key: 'for_interview', label: 'For Interview', dot: 'text-green-600', text: 'text-green-700' }
                    ]
                    
                    if (!status_checklist) {
                      // Fallback to old status system
                      const oldStatuses = [
                        { key: 'pending', label: 'For Evaluation', color: 'text-orange-600' },
                        { key: 'evaluated', label: 'Evaluated', color: 'text-green-600' },
                        { key: 'for_confirmation', label: 'For Confirmation', color: 'text-blue-600' },
                        { key: 'for_interview', label: 'For Interview', color: 'text-purple-600' },
                        { key: 'approved', label: 'Approved', color: 'text-green-600' },
                        { key: 'rejected', label: 'Rejected', color: 'text-red-600' }
                      ]
                      
                      return oldStatuses.map(status => (
                        <li 
                          key={status.key} 
                          className={`flex items-center gap-2 py-1 px-2 rounded ${selected.status === status.key ? 'bg-green-50' : ''}`}
                        >
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
                      // Special handling: For Confirmation should consider confirmed state as checked
                      const isForConfirmation = status.key === 'for_confirmation'
                      const baseChecked = status_checklist[status.key as keyof typeof status_checklist]?.checked
                      const confirmedChecked = (status_checklist as any)?.for_confirmation_confirmed?.checked
                      const isChecked = isForConfirmation ? (baseChecked || confirmedChecked) : baseChecked

                      // Prefer confirmed timestamp if available for For Confirmation
                      const baseTs = status_checklist[status.key as keyof typeof status_checklist]?.timestamp
                      const confirmedTs = (status_checklist as any)?.for_confirmation_confirmed?.timestamp
                      const timestamp = isForConfirmation ? (confirmedTs || baseTs) : baseTs
                      const isCurrent = currentStatusKey === status.key
                      
                      return (
                        <li 
                          key={status.key} 
                          className={`flex items-center gap-2 py-1 px-2 rounded ${isChecked ? 'bg-green-50' : ''}`}
                        >
                          <span className={`text-lg ${isChecked ? (status as any).dot : 'text-gray-400'}`}>●</span>
                          <span className={`font-semibold ${isChecked ? (status as any).text : 'text-gray-700'}`}>
                            {status.label}
                    </span>
                          <span className={`ml-auto text-xs ${isChecked ? (status as any).text : 'text-gray-500'}`}>
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
              {/* Documents Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Documents Information</div>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Passport</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {renderFlaggableField('passport_number', 'Passport Number:', selectedDocsMeta.passport_number || (selected as any).passport_number || 'N/A')}
                      {renderFlaggableField('passport_validity', 'Passport Validity:', selectedDocsMeta.passport_validity || (selected as any).passport_validity || 'N/A')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Visa / Work Permit</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {renderFlaggableField('visa_category', 'Visa Category:', selectedDocsMeta.visa_category || (selected as any).visa_category || 'N/A')}
                      {renderFlaggableField('visa_type', 'Visa Type:', selectedDocsMeta.visa_type || (selected as any).visa_type || 'N/A')}
                      {renderFlaggableField('visa_number', 'Visa Number:', selectedDocsMeta.visa_number || (selected as any).visa_number || 'N/A')}
                      {renderFlaggableField('visa_validity', 'Visa Validity:', selectedDocsMeta.visa_validity || (selected as any).visa_validity || 'N/A')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Employment Contract</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {renderFlaggableField('ec_issued_date', 'Issued Date:', selectedDocsMeta.ec_issued_date || (selected as any).ec_issued_date || 'N/A')}
                      {renderFlaggableField('ec_verification', 'Verification Type:', selectedDocsMeta.ec_verification || (selected as any).ec_verification || 'N/A')}
                    </div>
                  </div>
                </div>
              </div>
              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-700">Documents</div>
                  <div className="flex gap-2">
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
                            toast({ title: 'Document generated', description: 'Direct Hire Clearance document has been attached.' })
                          } else if (res.status === 409) {
                            // Show confirmation modal for override
                            const confirmOverride = window.confirm('A Direct Hire Clearance document already exists. Do you want to replace it?')
                            if (confirmOverride) {
                              const res2 = await fetch(`/api/direct-hire/${selected.id}/comprehensive-clearance?override=true`, { method: 'POST' })
                              const result2 = await res2.json()
                              if (result2.success) {
                                setDocumentsRefreshTrigger(prev => prev + 1)
                                toast({ title: 'Document replaced', description: 'Direct Hire Clearance document has been updated.' })
                              } else {
                                throw new Error(result2.error || 'Override failed')
                              }
                            }
                          } else {
                            throw new Error(result.error || 'Generation failed')
                          }
                        } catch (err) {
                          toast({ title: 'Generation error', description: 'Failed to generate the Direct Hire Clearance document.', variant: 'destructive' })
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
                  onFlagDocument={(key, label) => {
                    setFlagTarget({ key, label })
                    setFlagReason(getFlagReason(key))
                    setIsReFlagging(true)
                    setFlagModalOpen(true)
                  }}
                  isDocumentFlagged={(key) => isFieldFlagged(key)}
                  getDocumentFlagReason={(key) => getFlagReason(key)}
                  isDocumentCorrected={(key) => isFieldCorrected(key)}
                  isDocumentResolved={(key) => isFieldResolved(key)}
                  isPendingStatus={(() => {
                    const statusChecklist = (selected as any)?.status_checklist
                    const isEvaluated = statusChecklist?.evaluated?.checked === true
                    return selected?.status === 'pending' && !isEvaluated
                  })()}
                  onResolveDocument={(key) => {
                    setFieldToResolve({ key, label: getFieldLabel(key) })
                    setResolveConfirmOpen(true)
                  }}
                />
              <TransactionHistory
                applicationType="direct-hire"
                recordId={selected.id}
                refreshKey={documentsRefreshTrigger}
                />
              </div>
            </div>
            {(() => {
              const nextStatus = selected ? getNextStatus(selected.status_checklist, selected.status) : null
              const isPendingStatus = selected?.status === 'pending' || (selected as any)?.status_checklist === null
              // Return for Compliance should only be available when status is 'pending' AND evaluated is not checked
              // If evaluated is checked, the application has moved past "For Evaluation"
              const statusChecklist = (selected as any)?.status_checklist
              const isEvaluated = statusChecklist?.evaluated?.checked === true
              const isForEvaluation = selected?.status === 'pending' && !isEvaluated
              return nextStatus ? (
              <div className="flex justify-end gap-2 px-6 py-3 bg-white border-t">
                {isForEvaluation && (
                  <Button
                    variant="destructive"
                    className="bg-red-700 hover:bg-red-800 flex items-center gap-2"
                    size="sm"
                    disabled={correctionSaving || !localFlags.length}
                    onClick={() => {
                      if (!selected) return
                      const validItems = localFlags.filter(i => i.field_key.trim() && i.message.trim())
                      if (!validItems.length) {
                        toast({ title: 'No flagged fields', description: 'Flag at least one field with a reason.', variant: 'destructive' })
                        return
                      }
                      setReturnForComplianceConfirmOpen(true)
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return for Compliance
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    setStatusToChange({ key: nextStatus.key, label: nextStatus.label })
                    setStatusConfirmOpen(true)
                  }}
                >
                  {`Mark as ${nextStatus.label}`}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              ) : null
            })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag reason modal */}
      <Dialog open={flagModalOpen} onOpenChange={(open) => {
        setFlagModalOpen(open)
        if (!open) {
          setIsReFlagging(false)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flag issue for {flagTarget?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Describe what needs to be corrected for this field.</p>
            <Textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setFlagModalOpen(false)
              setIsReFlagging(false)
            }}>Cancel</Button>
            <Button
              onClick={async () => {
                if (flagTarget && flagReason.trim()) {
                  if (isReFlagging && selected) {
                    // Immediately re-flag via API
                    try {
                      const res = await fetch(`/api/direct-hire/${selected.id}/corrections`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          items: [{ field_key: flagTarget.key, message: flagReason.trim() }], 
                          note: '' 
                        }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        toast({ title: 'Field re-flagged', description: `${flagTarget.label} has been re-flagged for correction.` })
                        setCorrectionRefreshKey(prev => prev + 1)
                        void fetchOpenCorrections(selected.id)
                        // Refresh application data to update needs_correction
                        const appRes = await fetch(`/api/direct-hire/${selected.id}`)
                        if (appRes.ok) {
                          const appData = await appRes.json()
                          if (appData.success && appData.data) {
                            setSelected(appData.data)
                          }
                        }
                      } else {
                        toast({ title: 'Error', description: data.error || 'Failed to re-flag field', variant: 'destructive' })
                      }
                    } catch (err: any) {
                      toast({ title: 'Error', description: err?.message || 'Failed to re-flag field', variant: 'destructive' })
                    }
                  } else {
                    // Add to local flags for initial flagging
                    upsertFlag(flagTarget.key, flagReason.trim())
                  }
                  setFlagModalOpen(false)
                  setIsReFlagging(false)
                } else {
                  toast({ title: 'Reason required', description: 'Please enter a reason for the flag.', variant: 'destructive' })
                }
              }}
            >
              {isReFlagging ? 'Re-flag' : 'Save flag'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Corrections Modal */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send back for correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3 bg-gray-50">
              <div className="text-sm font-medium mb-2">Current open corrections</div>
              {correctionsLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : openCorrections.length === 0 ? (
                <div className="text-sm text-gray-500">None</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {openCorrections.map((c) => (
                    <li key={c.field_key + c.message} className="flex flex-col rounded border p-2 bg-white">
                      <span className="font-semibold">{c.field_key}</span>
                      <span className="text-gray-700">{c.message}</span>
                      {c.created_at && <span className="text-xs text-gray-500">Added: {new Date(c.created_at).toLocaleString()}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              {correctionItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[2fr,3fr,auto] gap-2 items-start">
                  <div>
                    <Label className="text-xs">Field</Label>
                    <select
                      className="w-full border rounded px-2 py-2 text-sm"
                      value={item.field_key}
                      onChange={(e) => {
                        const next = [...correctionItems]
                        next[idx].field_key = e.target.value
                        setCorrectionItems(next)
                      }}
                    >
                      <option value="">Select field</option>
                      {correctionFieldOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Problem</Label>
                    <Textarea
                      value={item.message}
                      onChange={(e) => {
                        const next = [...correctionItems]
                        next[idx].message = e.target.value
                        setCorrectionItems(next)
                      }}
                      placeholder="Describe what needs to be corrected"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCorrectionItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCorrectionItems(prev => [...prev, { field_key: '', message: '' }])}
              >
                Add another field
              </Button>
            </div>

            <div>
              <Label className="text-xs">Overall note (optional)</Label>
              <Textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="Additional context for the applicant"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selected) return
                const validItems = (localFlags.length ? localFlags : correctionItems).filter(i => i.field_key.trim() && i.message.trim())
                if (validItems.length === 0) {
                  toast({ title: 'Missing fields', description: 'Select at least one field and message.', variant: 'destructive' })
                  return
                }
                setCorrectionSaving(true)
                try {
                  const res = await fetch(`/api/direct-hire/${selected.id}/corrections`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: validItems, note: correctionNote }),
                  })
                  const data = await res.json()
                  if (!data.success) throw new Error(data.error || 'Failed to send corrections')
                  toast({ title: 'Sent back for correction', description: 'Applicant will be notified.' })
                  setCorrectionModalOpen(false)
                  setCorrectionRefreshKey(prev => prev + 1)
                  setLocalFlags([])
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || 'Failed to send corrections', variant: 'destructive' })
                } finally {
                  setCorrectionSaving(false)
                }
              }}
              disabled={correctionSaving}
            >
              {correctionSaving ? 'Sending...' : 'Send back'}
            </Button>
          </div>
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
                      if (confirmPurpose === 'deleted') setShowDeletedOnly(true)
                      if (confirmPurpose === 'finished') setShowFinishedOnly(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      await fetchApplications(search, 1, confirmPurpose === 'deleted', showFinishedOnly, showProcessingOnly)
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
                      await fetchApplications(search, 1, confirmPurpose === 'deleted', showFinishedOnly, showProcessingOnly)
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
                          await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter);
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
                          await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
                          // Allow render to commit
                          await new Promise(requestAnimationFrame)
                          // Small delay and a second refresh to avoid race conditions (e.g., doc generation)
                          await new Promise(resolve => setTimeout(resolve, 100))
                          await fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
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
            onSuccess={() => fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)}
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

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Application Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status to <strong>{statusToChange?.label}</strong> for <strong>{selected?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selected || !statusToChange) return
                
                try {
                  const res = await fetch(`/api/direct-hire/${selected.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: statusToChange.key })
                  })
                  const json = await res.json()
                  if (json.success) {
                    toast({ title: 'Status updated', description: `Set to ${statusToChange.label}` })
                    setStatusConfirmOpen(false)
                    setOpen(false)
                    fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
                  } else {
                    toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                }
              }}
            >
              Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return for Compliance Confirmation Dialog */}
      <AlertDialog open={returnForComplianceConfirmOpen} onOpenChange={setReturnForComplianceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Application for Compliance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to return this application to the applicant for compliance? 
              The applicant will be notified and will need to correct the flagged fields before resubmitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {localFlags.length > 0 && (
            <div className="mt-3">
              <div className="font-medium text-sm mb-2">Flagged fields ({localFlags.length}):</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {localFlags.map((flag, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{getFieldLabel(flag.field_key)}:</span> {flag.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-800"
              onClick={async () => {
                if (!selected) return
                const validItems = localFlags.filter(i => i.field_key.trim() && i.message.trim())
                if (!validItems.length) {
                  toast({ title: 'No flagged fields', description: 'Flag at least one field with a reason.', variant: 'destructive' })
                  setReturnForComplianceConfirmOpen(false)
                  return
                }
                setCorrectionSaving(true)
                try {
                  const res = await fetch(`/api/direct-hire/${selected.id}/corrections`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: validItems, note: '' }),
                  })
                  const data = await res.json()
                  if (!data.success) throw new Error(data.error || 'Failed to send corrections')
                  toast({ title: 'Sent back for correction', description: 'Applicant will be notified.' })
                  setReturnForComplianceConfirmOpen(false)
                  setCorrectionRefreshKey(prev => prev + 1)
                  setLocalFlags([])
                  // Keep the view modal open after flagging
                  // setOpen(false)
                  fetchApplications(search, 1, showDeletedOnly, showFinishedOnly, showProcessingOnly, sexFilter, statusFilter)
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || 'Failed to send corrections', variant: 'destructive' })
                } finally {
                  setCorrectionSaving(false)
                }
              }}
            >
              Return for Compliance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Resolved Confirmation Dialog */}
      <AlertDialog open={resolveConfirmOpen} onOpenChange={(open) => {
        setResolveConfirmOpen(open)
        if (!open) {
          setFieldToResolve(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">Mark Correction as Resolved</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this correction as resolved?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark as Resolved
            </div>
            <p className="text-green-700">
              You are about to mark the correction for <strong>{fieldToResolve?.label}</strong> as resolved.
            </p>
            <p className="text-green-700 mt-2">
              This will indicate that the applicant's correction has been reviewed and accepted. The flag will turn green.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setResolveConfirmOpen(false)
              setFieldToResolve(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!selected || !fieldToResolve) return
                try {
                  const res = await fetch(`/api/direct-hire/${selected.id}/corrections`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ field_key: fieldToResolve.key, resolved: true }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    toast({ title: 'Correction marked as resolved', description: `${fieldToResolve.label} is now marked as resolved.` })
                    setCorrectionRefreshKey(prev => prev + 1)
                    void fetchOpenCorrections(selected.id)
                    setResolveConfirmOpen(false)
                    setFieldToResolve(null)
                  } else {
                    toast({ title: 'Error', description: data.error || 'Failed to mark as resolved', variant: 'destructive' })
                  }
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || 'Failed to mark as resolved', variant: 'destructive' })
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Mark as Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogTitle className="text-green-600">Restore Application</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Restore Application
                </div>
                <p className="text-green-700">
                  You are about to restore the application for <strong>{applicationToRestore?.name}</strong>.
                </p>
                <p className="text-green-700 mt-2">
                  This will move the application back to the active applications list and make it available for editing and processing.
                </p>
              </div>
              <p className="font-semibold">Are you sure you want to restore this application?</p>
              <br />
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
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
            <AlertDialogTitle className="text-red-600">Permanently Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Warning: This action cannot be undone
                </div>
                <p className="text-red-700">
                  You are about to permanently delete the application for <strong>{applicationToPermanentDelete?.name}</strong>.
                </p>
                <p className="text-red-700 mt-2">
                  This will permanently remove all data including documents, status checklist, and cannot be recovered.
                </p>
              </div>
              <p className="font-semibold">Are you absolutely sure you want to proceed?</p>
              <br />
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
function ApplicantDocumentsList({ applicationId, refreshTrigger, onRefresh, onViewPDF, setSelectedDocument, setPdfViewerOpen, onFlagDocument, isDocumentFlagged, getDocumentFlagReason, isDocumentCorrected, isDocumentResolved, onResolveDocument, isPendingStatus }: ApplicantDocumentsTabProps) {
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
      comprehensive_clearance: 'Direct Hire Clearance',
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

  const handleOpenInline = (doc: Document) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const docUrl = `${origin}/api/documents/${doc.id}/file.docx`
      const isDocx = doc.file_name.toLowerCase().endsWith('.docx') || doc.mime_type.includes('word')

      if (isDocx) {
        const protocolUrl = `ms-word:ofe|u|${encodeURI(docUrl)}`
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.width = '0'
        iframe.height = '0'
        document.body.appendChild(iframe)
        // Attempt to open via custom protocol without navigating the app
        iframe.src = protocolUrl
        // Cleanup after a short delay
        setTimeout(() => {
          try { document.body.removeChild(iframe) } catch {}
        }, 3000)
      } else {
        // Non-DOCX: open inline in same tab (PDF/images)
        window.location.href = docUrl
      }
    } catch {
      toast({
        title: 'Open Error',
        description: 'Failed to open document',
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
            <span className="text-sm font-medium flex items-center gap-2 group/document">
              {formatDocumentType(document.document_type, document.file_name)}
              {(() => {
                const docKey = `document_${document.document_type}`
                const isFlagged = isDocumentFlagged && isDocumentFlagged(docKey)
                const corrected = isDocumentCorrected && isDocumentCorrected(docKey)
                const resolved = isDocumentResolved && isDocumentResolved(docKey)
                
                if (isFlagged) {
                  let flagColor = 'text-red-600 fill-red-600'
                  let flagBorderColor = 'border-red-200'
                  let flagTextColor = 'text-red-700'
                  let flagState = 'Flagged'
                  
                  if (resolved) {
                    flagColor = 'text-green-600 fill-green-600'
                    flagBorderColor = 'border-green-200'
                    flagTextColor = 'text-green-700'
                    flagState = '✓ Resolved'
                  } else if (corrected) {
                    flagColor = 'text-amber-600 fill-amber-600'
                    flagBorderColor = 'border-amber-300'
                    flagTextColor = 'text-amber-800'
                    flagState = 'Needs Review'
                  }
                  
                  return (
                    <div className="relative group flex items-center gap-1">
                      <FlagSolid className={`h-4 w-4 ${flagColor}`} />
                      <div className={`absolute z-20 hidden group-hover:block left-0 top-full mt-1 min-w-[180px] rounded-md bg-white shadow-lg border ${flagBorderColor} p-2 text-xs ${flagTextColor}`}>
                        {corrected ? (
                          <div>{getDocumentFlagReason ? getDocumentFlagReason(docKey) : 'Flagged for review'}</div>
                        ) : (
                          <>
                            <div className="font-medium mb-1">{flagState}</div>
                            <div>{getDocumentFlagReason ? getDocumentFlagReason(docKey) : 'Flagged for review'}</div>
                          </>
                        )}
                      </div>
                      {corrected && !resolved && onResolveDocument && isPendingStatus && (
                        <button
                          type="button"
                          onClick={() => onResolveDocument(docKey)}
                          className="ml-1 text-xs text-green-600 hover:text-green-700 underline"
                          title="Mark as resolved"
                        >
                          ✓
                        </button>
                      )}
                      {corrected && !resolved && onFlagDocument && isPendingStatus && (
                        <button
                          type="button"
                          onClick={() => onFlagDocument(docKey, formatDocumentType(document.document_type, document.file_name))}
                          className="ml-1 text-xs text-red-600 hover:text-red-700"
                          title="Flag again - correction not sufficient"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                } else {
                  return (
                    onFlagDocument && isPendingStatus ? (
                      <button
                        type="button"
                        className="inline-flex items-center text-red-600 hover:text-red-700 opacity-0 group-hover/document:opacity-100 transition-opacity"
                        onClick={() => onFlagDocument(docKey, formatDocumentType(document.document_type, document.file_name))}
                        aria-label={`Flag ${formatDocumentType(document.document_type, document.file_name)}`}
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    ) : null
                  )
                }
              })()}
            </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-150">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(() => {
              const isDocx = document.file_name.toLowerCase().endsWith('.docx')
              if (isDocx) return (
                <DropdownMenuItem onClick={() => handleOpenInline(document)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Open
                </DropdownMenuItem>
              )
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

