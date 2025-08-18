"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Trash2, FileText, Plus, BadgeCheck, X, AlertTriangle, Loader2, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { DirectHireApplication } from "@/lib/types"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { Document } from "@/lib/types"
import StatusChecklist from "@/components/status-checklist"
import CreateApplicationModal from "@/components/create-application-modal"

interface DirectHireApplicationsTableProps {
  search: string
  filterQuery?: string
}

interface ApplicantDocumentsTabProps {
  applicationId: string
  refreshTrigger?: number
  onRefresh?: () => void
}

export default function DirectHireApplicationsTable({ search, filterQuery = "" }: DirectHireApplicationsTableProps) {
  const { toast } = useToast()
  const { 
    applications, 
    loading, 
    error, 
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
  })
  const [showEditDraftModal, setShowEditDraftModal] = useState<{open: boolean, app: DirectHireApplication | null}>({ open: false, app: null })

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
  }, []);

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
    if (checked.length === 0) return null
    return checked[checked.length - 1][0]
  }

  const statusKeyToLabel: Record<string, string> = {
    draft: 'draft',
    pending: 'pending',
    evaluated: 'evaluated',
    for_confirmation: 'for confirmation',
    emailed_to_dhad: 'emailed to dhad',
    received_from_dhad: 'received from dhad',
    for_interview: 'for interview',
    approved: 'approved',
    rejected: 'rejected',
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

    if (!normalizedSearch && !normalizedFilterQuery) return applications

    return applications.filter((application) => {
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

    // Get the current status based on checklist
    const checkedItems = Object.entries(status_checklist).filter(([_, status]) => status.checked)
    let currentStatus = "No statuses checked"
    let statusColor = "bg-gray-100 text-gray-800"

    if (checkedItems.length > 0) {
      const lastChecked = checkedItems[checkedItems.length - 1]
      const statusKey = lastChecked[0]
      
      switch (statusKey) {
        case "evaluated":
          currentStatus = "Evaluated"
          statusColor = "bg-blue-100 text-blue-800"
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
        default:
          currentStatus = "Unknown status"
          statusColor = "bg-gray-100 text-gray-800"
      }
    }

    return (
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
          setSelectedApplicationForStatus(application)
          setStatusChecklistOpen(true)
        }}
      >
        {currentStatus}
        {application.status !== 'draft' && (
          <Settings className="h-3 w-3 ml-1" />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
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
                    <td className="py-3 px-4 text-center">{application.name}</td>
                    <td className="py-3 px-4 text-center capitalize">{application.sex}</td>
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setShowEditDraftModal({ open: true, app: application })
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Continue Draft
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => { setSelected(application); setOpen(true) }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  toast({ title: "Edit functionality coming soon", description: "This feature will be available in the next update" })
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => { const confirmDelete = window.confirm(`Are you sure you want to delete the application for ${application.name}?`); if (confirmDelete) { const success = await deleteApplication(application.id); if (success) { toast({ title: "Application deleted successfully", description: `${application.name}'s application has been removed` }) } } }} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { toast({ title: "Compliance form generated", description: "The document has been prepared and is ready for download" }) }}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Compliance Form
                                </DropdownMenuItem>
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
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium capitalize">{selected.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status:</div>
                    <div className="font-medium">
                      {(() => {
                        const { status_checklist } = selected
                        if (!status_checklist) {
                          const capitalizeWords = (str: string) => {
                            return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          }
                          return capitalizeWords(selected.status)
                        }
                        
                        const checkedItems = Object.entries(status_checklist).filter(([_, status]) => (status as any).checked)
                        if (checkedItems.length === 0) return "No statuses checked"
                        
                        const lastChecked = checkedItems[checkedItems.length - 1]
                        const statusKey = lastChecked[0]
                        
                        switch (statusKey) {
                          case "evaluated": return "Evaluated"
                          case "for_confirmation": return "For Confirmation"
                          case "emailed_to_dhad": return "Emailed to DHAD"
                          case "received_from_dhad": return "Received from DHAD"
                          case "for_interview": return "For Interview"
                          default: return "Unknown status"
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
                    <div className="font-medium">{selected.jobsite}</div>
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
                              timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()
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
                  <Button variant="outline" className="text-xs">+ Merge</Button>
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
                />
              </div>
            </div>
          )}
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
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
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
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.jobsite} onChange={e => setFormData({ ...formData, jobsite: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Position:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
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
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.evaluator} onChange={e => setFormData({ ...formData, evaluator: e.target.value })} />
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button 
                      className="bg-[#1976D2] text-white px-8" 
                      type="button" 
                      onClick={() => setFormStep(2)}
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
                    <Button variant="outline" className="flex-1" type="button" onClick={() => { 
                      setCreateOpen(false); 
                      toast({
                        title: 'Draft saved successfully',
                        description: 'You can continue editing this application later',
                      }) 
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
                          setCreateOpen(false);
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
                            description: `${formData.name} has been added to the system`,
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
      {showEditDraftModal.open && showEditDraftModal.app && (
        <CreateApplicationModal 
          onClose={() => setShowEditDraftModal({ open: false, app: null })}
          initialData={{
            id: showEditDraftModal.app.id,
            name: showEditDraftModal.app.name,
            sex: showEditDraftModal.app.sex,
            job_type: showEditDraftModal.app.job_type,
            jobsite: showEditDraftModal.app.jobsite,
            position: showEditDraftModal.app.position,
            salary: Number(showEditDraftModal.app.salary)
          }}
          applicationId={showEditDraftModal.app.id}
        />
      )}
    </>
  )
}

// Applicant Documents List Component
function ApplicantDocumentsList({ applicationId, refreshTrigger, onRefresh }: ApplicantDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const { toast } = useToast()

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
      const response = await fetch(`/api/documents/${document.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('View failed')
      }
    } catch (error) {
      toast({
        title: 'View Error',
        description: 'Failed to view document',
        variant: 'destructive'
      })
    }
  }

  // Handle document edit
  const handleEdit = (document: Document) => {
    setEditingDocument(document.id)
    setEditName(document.document_type)
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
      toast({
        title: 'Update Error',
        description: 'Failed to update document name',
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

  return (
    <ul className="space-y-2">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-2">
          <input type="checkbox" checked readOnly className="accent-[#1976D2]" />
          {editingDocument === document.id ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 text-sm border rounded px-2 py-1"
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
            <span className="flex-1 text-sm">{document.document_type}</span>
          )}
          <span className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(document)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(document)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(document)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </li>
      ))}
    </ul>
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

