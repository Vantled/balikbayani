// app/balik-manggagawa/page.tsx
"use client"

import Header from "@/components/shared/header"
import { useBalikManggagawaClearance } from "@/hooks/use-balik-manggagawa-clearance"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, Search, Plus, MoreHorizontal, Eye, Edit, Trash2, FileText, Settings, Download, Loader2, ChevronUp, FileCheck, CheckCircle, XCircle } from "lucide-react"
import DocumentViewerModal from "@/components/pdf-viewer-modal"
import TransactionHistory from "@/components/transaction-history"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { AVAILABLE_CURRENCIES, getUSDEquivalentAsync, type Currency } from "@/lib/currency-converter"
import { useCallback, useRef } from "react"
import BMFilterPanel from "@/components/bm-filter-panel"
import ProcessingStatusCard from "@/components/processing-status-card"

function BMDocumentsSection({ 
  applicationId, 
  refreshTrigger,
  applicationStatus
}: { 
  applicationId?: string
  refreshTrigger?: number
  applicationStatus?: string
}) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; name: string } | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<any>(null)
  const mounted = useRef(false)

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
      return <FileText className="h-4 w-4 text-teal-600" />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileText className="h-4 w-4 text-yellow-600" />
    }
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  const formatDocumentType = (documentType: string, fileName: string): string => {
    if (!documentType) return 'Unknown Document'
    
    // Get file extension from the actual file name
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    
    // For BM clearance documents, prefer the actual file name so it reflects the clearance type
    if (documentType.toLowerCase().trim() === 'bm_clearance' && fileName) {
      return fileName
    }

    const key = documentType.toLowerCase().trim()
    const map: Record<string, string> = {
      bm_clearance: 'BM Clearance',
      clearance: 'Clearance',
      passport: 'Passport',
      visa: 'Visa/Work Permit',
      'visa/work permit': 'Visa/Work Permit',
      'visa work permit': 'Visa/Work Permit',
      tesda: 'TESDA NC/PRC License',
      'tesda nc': 'TESDA NC/PRC License',
      'tesda nc/prc license': 'TESDA NC/PRC License',
      confirmation: 'MWO/POLO/PE/PCG Confirmation',
      issuance_of_oec_memorandum: 'Memorandum Issuance of OEC',
      dmw_clearance_request: 'Clearance Request',
    }
    
    let formattedName = ''
    if (map[key]) {
      formattedName = map[key]
    } else {
      formattedName = documentType
        .replace(/[_-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    
    // Append file extension if it exists
    return fileExtension ? `${formattedName}.${fileExtension}` : formattedName
  }

  const load = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=balik_manggagawa`)
      const json = await res.json()
      if (json.success) setDocs(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => { load() }, [load, refreshTrigger])

  if (!applicationId) return null

  const isImportantDocument = (doc: any) => {
    return (doc.document_type || '').toLowerCase() === 'bm_clearance'
  }

  const handleView = async (document: any) => {
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

  const handleDownload = async (doc: any, format: 'pdf' | 'docx' | 'original' = 'original') => {
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

  const handleOpenInline = (doc: any) => {
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
        window.open(docUrl, '_blank')
      }
    } catch (error) {
      toast({
        title: 'Open Error',
        description: 'Failed to open document inline',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (document: any) => {
    setEditingDocument(document.id)
    setEditName(document.document_type)
  }

  const handleSaveEdit = async (documentId: string) => {
    if (!editName.trim()) {
      toast({
        title: 'Error',
        description: 'Document name cannot be empty',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
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
        setDocs(docs => docs.map(doc => 
          doc.id === documentId 
            ? { ...doc, document_type: editName.trim() }
            : doc
        ))
        setEditingDocument(null)
        setEditName('')
        toast({
          title: 'Document updated',
          description: 'Document name has been updated',
        })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Network error',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = (document: any) => {
    setDocumentToDelete(document)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return
    
    try {
      const res = await fetch(`/api/documents/${documentToDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Deleted', description: 'Document removed' })
        load()
      } else {
        toast({ title: 'Delete failed', description: json.error || 'Failed to delete', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setDeleteConfirmOpen(false)
      setDocumentToDelete(null)
    }
  }

  const renderDocumentRow = (doc: any) => (
    <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
      <div className="flex items-center gap-2 flex-1">
        {getFileIcon(doc.file_name, doc.mime_type)}
        {editingDocument === doc.id ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-sm h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(doc.id)
                if (e.key === 'Escape') setEditingDocument(null)
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => handleSaveEdit(doc.id)}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditingDocument(null)}>Cancel</Button>
          </div>
        ) : (
          <span className="text-sm">{formatDocumentType(doc.document_type, doc.file_name)}</span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(() => {
            const isDocx = doc.file_name.toLowerCase().endsWith('.docx')
            if (isDocx) return (
              <DropdownMenuItem onClick={() => handleOpenInline(doc)}>
                <Eye className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
            )
            return (
              <DropdownMenuItem onClick={() => handleView(doc)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
            )
          })()}
          {(() => {
            const fileExtension = doc.file_name.split('.').pop()?.toLowerCase() || ''
            let downloadText = 'Download'
            if (doc.mime_type.includes('word') || doc.file_name.toLowerCase().endsWith('.docx')) {
              downloadText = 'Download DOCX'
            } else if (doc.mime_type.includes('pdf') || doc.file_name.toLowerCase().endsWith('.pdf')) {
              downloadText = 'Download PDF'
            } else if (doc.mime_type.includes('image') || doc.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
              downloadText = `Download ${fileExtension.toUpperCase()}`
            } else {
              downloadText = `Download ${fileExtension.toUpperCase()}`
            }
            return (
              <DropdownMenuItem onClick={() => handleDownload(doc, 'original')}>
                <Download className="h-4 w-4 mr-2" />
                {downloadText}
              </DropdownMenuItem>
            )
          })()}
          {(() => {
            const status = (applicationStatus || '').toString()
            const isLocked = status === 'approved' || status === 'rejected'
            
            if (isLocked) return null
            
            return (
              <>
                <DropdownMenuItem onClick={() => handleEdit(doc)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )
          })()}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const importantDocs = docs.filter(d => isImportantDocument(d))
  const otherDocs = docs.filter(d => !isImportantDocument(d))

  return (
    <>
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
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name || 'this document'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

export default function BalikManggagawaPage() {
  const { clearances, loading, error, pagination, fetchClearances, createClearance } = useBalikManggagawaClearance()

  const [search, setSearch] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [panelQuery, setPanelQuery] = useState("")
  
  const [filters, setFilters] = useState({
    clearanceType: "",
    sex: "",
    dateFrom: "",
    dateTo: "",
    jobsite: "",
    position: "",
    showDeletedOnly: false,
  })

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

  // Parse filter query string from panel
  const parseFilterQuery = (query: string) => {
    const filters: any = {}
    if (!query) return filters
    
    const parts = query.split(' ')
    parts.forEach(part => {
      const [key, value] = part.split(':')
      if (key && value) {
        if (key === 'showDeletedOnly' && value === 'true') {
          filters[key] = true
        } else {
          filters[key] = value
        }
      }
    })
    return filters
  }

  // Helper function to get current filter parameters
  const getCurrentFilters = useCallback((page?: number, limit?: number) => {
    const queryFilters = parseFilterQuery(panelQuery)
    const { filters: searchFilters, terms } = parseSearch(search)
    
    // Combine search filters with panel filters (search filters take precedence)
    const combinedFilters = {
      clearanceType: searchFilters.clearanceType || searchFilters.clearance_type || queryFilters.clearanceType || filters.clearanceType,
      sex: searchFilters.sex || queryFilters.sex || filters.sex,
      dateFrom: searchFilters.dateFrom || searchFilters.date_from || queryFilters.dateFrom || filters.dateFrom,
      dateTo: searchFilters.dateTo || searchFilters.date_to || queryFilters.dateTo || filters.dateTo,
      jobsite: searchFilters.jobsite || searchFilters.destination || queryFilters.jobsite || filters.jobsite,
      position: searchFilters.position || queryFilters.position || filters.position,
      showDeletedOnly: searchFilters.showDeletedOnly || queryFilters.showDeletedOnly || filters.showDeletedOnly,
    }
    
    // Create the final search string from remaining terms (non-key:value parts)
    const finalSearch = terms.join(' ')
    
    return {
      page: page || pagination.page,
      limit: limit || pagination.limit,
      search: finalSearch, // Only send the free-text terms, not the key:value pairs
      ...combinedFilters,
    }
  }, [panelQuery, pagination.page, pagination.limit, search, filters])

  // create form minimal, matching hook schema
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    nameOfWorker: "",
    sex: "" as "male" | "female" | "",
    employer: "",
    destination: "",
    salary: "",
    position: "",
    job_type: "" as 'household' | 'professional' | '',
    salaryCurrency: "" as Currency | '',
    time_received: "",
    time_released: "",
  })

  // Helper function to reset the create form
  const resetCreateForm = () => {
    setFormData({ 
      nameOfWorker: "", 
      sex: "", 
      employer: "", 
      destination: "", 
      salary: "", 
      position: "", 
      job_type: "", 
      salaryCurrency: "", 
      time_received: "", 
      time_released: "" 
    });
    setControlPreview("");
  }
  const [controlPreview, setControlPreview] = useState("")
  const [creating, setCreating] = useState(false)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)
  const [usdDisplay, setUsdDisplay] = useState<string>("")
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editData, setEditData] = useState({
    nameOfWorker: "",
    sex: "" as "male" | "female" | "",
    employer: "",
    destination: "",
    position: "",
    salary: "",
    job_type: "" as 'household' | 'professional' | '',
    salaryCurrency: "" as Currency | '',
  })
  const [originalEditData, setOriginalEditData] = useState<typeof editData | null>(null)
  const [originalSalaryUSD, setOriginalSalaryUSD] = useState<number | null>(null)
  const [editUsdDisplay, setEditUsdDisplay] = useState<string>("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false)
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("")
  const [applicationToPermanentDelete, setApplicationToPermanentDelete] = useState<any>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState("")
  const [applicationToRestore, setApplicationToRestore] = useState<any>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false)
  const [selectedComplianceType, setSelectedComplianceType] = useState<string>("")
  const [complianceSubmitting, setComplianceSubmitting] = useState(false)
  const [complianceFields, setComplianceFields] = useState<Record<string, string>>({})
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])

  const getComplianceTitle = (type: string) => {
    switch (type) {
      case 'critical_skill': return 'Critical Skills'
      case 'for_assessment_country': return 'For Assessment Country'
      case 'non_compliant_country': return 'Non Compliant Country'
      case 'no_verified_contract': return 'No Verified Contract'
      case 'seafarer_position': return 'Seaferer\'s Position'
      case 'watchlisted_employer': return 'Watchlisted Employer'
      case 'watchlisted_similar_name': return 'Watchlisted OFW'
      default: return 'For Compliance'
    }
  }

  const getComplianceFieldDefs = (type: string) => {
    // Define per-type required fields for document generation
    if (type === 'critical_skill') {
      return [
        { key: 'principalName', label: 'Name of the new principal', required: true, toUpper: true },
        { key: 'employmentDurationFrom', label: 'Employment duration (from)', required: true, inputType: 'date' },
        { key: 'employmentDurationUntil', label: 'Employment duration (until)', required: true, inputType: 'date' },
        { key: 'dateArrival', label: 'Date of arrival', required: true, inputType: 'date' },
        { key: 'dateDeparture', label: 'Date of departure', required: true, inputType: 'date' },
        { key: 'remarks', label: 'Remarks', required: false, toUpper: true },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'seafarer_position') {
      return [
        { key: 'principalName', label: 'Name of the new principal', required: true, toUpper: true },
        { key: 'employmentDurationFrom', label: 'Employment duration (from)', required: true, inputType: 'date' },
        { key: 'employmentDurationUntil', label: 'Employment duration (until)', required: true, inputType: 'date' },
        { key: 'dateArrival', label: 'Date of arrival', required: true, inputType: 'date' },
        { key: 'dateDeparture', label: 'Date of departure', required: true, inputType: 'date' },
        { key: 'remarks', label: 'Remarks', required: false, toUpper: true },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'watchlisted_employer') {
      return [
        { key: 'placeEmployment', label: 'Place of Employment', required: true, toUpper: true },
        { key: 'dateEmployment', label: 'Year of Employment', required: true, inputType: 'year' },
        { key: 'totalDeployedOfws', label: 'Total Deployed OFWs', required: true, inputType: 'number' },
        { key: 'dateBlacklisting', label: 'Date of Blacklisting', required: true, inputType: 'date' },
        { key: 'reasonBlacklisting', label: 'Reason for Blacklisting', required: true, toUpper: true },
        { key: 'yearsWithPrincipal', label: 'No. of Years with the Principal', required: true, inputType: 'number' },
        { key: 'dateArrival', label: 'Date of Arrival', required: true, inputType: 'date' },
        { key: 'dateDeparture', label: 'Date of Departure', required: true, inputType: 'date' },
        { key: 'remarks', label: 'Remarks', required: false, toUpper: true },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'watchlisted_similar_name') {
      return [
        { key: 'activeEmailAddress', label: 'Active E-Mail Address', required: true, inputType: 'email' },
        { key: 'activePhMobileNumber', label: 'Active PH Mobile Number', required: true, inputType: 'number' },
        { key: 'dateDeparture', label: 'Date of Departure (PH to Job Site)', required: true, inputType: 'date' },
        { key: 'remarks', label: 'Remarks', required: false, toUpper: true },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'no_verified_contract') {
      return [
        { key: 'principalName', label: 'Name of the new principal', required: true, toUpper: true },
        { key: 'employmentDurationFrom', label: 'Employment duration (from)', required: true, inputType: 'date' },
        { key: 'employmentDurationUntil', label: 'Employment duration (until)', required: true, inputType: 'date' },
        { key: 'dateArrival', label: 'Date of arrival', required: true, inputType: 'date' },
        { key: 'dateDeparture', label: 'Date of departure', required: true, inputType: 'date' },
        { key: 'remarks', label: 'Remarks', required: false, toUpper: true },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'for_assessment_country') {
      return [
        { key: 'monthsYearsYears', label: 'Year(s)', required: true, inputType: 'number' },
        { key: 'monthsYearsMonths', label: 'Month(s)', required: true, inputType: 'number' },
        { key: 'employmentStartDate', label: 'Employment start date', required: true, inputType: 'date' },
        { key: 'dateProcessed', label: 'Date Processed by the Employer', required: true, inputType: 'date' },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    if (type === 'non_compliant_country') {
      return [
        { key: 'monthsYearsYears', label: 'Year(s)', required: true, inputType: 'number' },
        { key: 'monthsYearsMonths', label: 'Month(s)', required: true, inputType: 'number' },
        { key: 'employmentStartDate', label: 'Employment Start Date (as per Employment Certificate)', required: true, inputType: 'date' },
        { key: 'dateProcessed', label: 'Date Processed by the Employer', required: true, inputType: 'date' },
        { key: 'dateArrival', label: 'Date of Arrival', required: true, inputType: 'date' },
        { key: 'dateDeparture', label: 'Date of Departure', required: true, inputType: 'date' },
      ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
    }
    // Default: request remarks; can be extended per your spec later
    return [
      { key: 'remarks', label: 'Remarks', required: false },
    ] as Array<{ key: string; label: string; required?: boolean; inputType?: string; toUpper?: boolean }>
  }

  const openComplianceDialog = (type: string) => {
    setSelectedComplianceType(type)
    const defs = getComplianceFieldDefs(type)
    const initial: Record<string, string> = {}
    defs.forEach(d => { 
      if (d.key === 'activePhMobileNumber') {
        initial[d.key] = '09'
      } else {
        initial[d.key] = ''
      }
    })
    setComplianceFields(initial)
    setComplianceDialogOpen(true)
  }

  useEffect(() => {
    fetchClearances({ page: 1, limit: 10 })
  }, [fetchClearances])

  // Live search: refresh results whenever search text changes
  useEffect(() => {
    // Only trigger on search text changes, not filter changes
    if (search !== '') {
      fetchClearances(getCurrentFilters())
    }
  }, [search, fetchClearances])

  // Listen for global refresh events (e.g., from filters, etc.)
  useEffect(() => {
    const handler = () => {
      fetchClearances(getCurrentFilters())
    }
    window.addEventListener('refresh:balik_manggagawa' as any, handler as any)
    return () => window.removeEventListener('refresh:balik_manggagawa' as any, handler as any)
  }, [fetchClearances, getCurrentFilters])

  // Prefill time_received and time_released when form opens
  useEffect(() => {
    if (isCreateOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData(prev => ({
        ...prev,
        time_received: prev.time_received || localDateTime,
        time_released: prev.time_released || localDateTime
      }));
    }
  }, [isCreateOpen])

  
  useEffect(() => {
    const compute = async () => {
      if (!formData.salary || isNaN(parseFloat(formData.salary)) || !formData.salaryCurrency) {
        setUsdDisplay("")
        return
      }
      const val = await getUSDEquivalentAsync(parseFloat(formData.salary), formData.salaryCurrency)
      setUsdDisplay(val)
    }
    compute()
  }, [formData.salary, formData.salaryCurrency])

  useEffect(() => {
    const compute = async () => {
      if (!editData.salary || isNaN(parseFloat(editData.salary)) || !editData.salaryCurrency) {
        setEditUsdDisplay("")
        return
      }
      const val = await getUSDEquivalentAsync(parseFloat(editData.salary), editData.salaryCurrency)
      setEditUsdDisplay(val)
    }
    compute()
  }, [editData.salary, editData.salaryCurrency])


  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa</h2>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value (e.g., name:John, sex:male)" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('refresh:balik_manggagawa' as any))
                    }
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setShowFilter(!showFilter)}
                aria-label="Show filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <Button className="bg-[#1976D2] text-white h-9 flex items-center gap-2" onClick={() => {
              setIsCreateOpen(true)
              // Fetch BM control number preview
              fetch(`/api/balik-manggagawa/clearance/preview?type=BM`).then(r=>r.json()).then(res=>{
                if (res?.success) setControlPreview(res.data.preview)
                else setControlPreview("")
              }).catch(()=> setControlPreview(""))
            }}><Plus className="h-4 w-4" /> Create</Button>

            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-50">
                <BMFilterPanel 
                  onClose={() => setShowFilter(false)} 
                  onApply={(query) => {
                    setPanelQuery(query)
                    setShowFilter(false)
                    // Force the table to re-fetch with the newly applied filters
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('refresh:balik_manggagawa' as any))
                    }
                  }}
                  clearanceType={filters.clearanceType}
                  setClearanceType={(value) => setFilters(f => ({ ...f, clearanceType: value === 'all' ? '' : value }))}
                  sex={filters.sex}
                  setSex={(value) => setFilters(f => ({ ...f, sex: value }))}
                  status={filters.status}
                  setStatus={(value) => setFilters(f => ({ ...f, status: value === 'all' ? '' : value }))}
                  dateFrom={filters.dateFrom}
                  setDateFrom={(value) => setFilters(f => ({ ...f, dateFrom: value }))}
                  dateTo={filters.dateTo}
                  setDateTo={(value) => setFilters(f => ({ ...f, dateTo: value }))}
                  jobsite={filters.jobsite}
                  setJobsite={(value) => setFilters(f => ({ ...f, jobsite: value }))}
                  position={filters.position}
                  setPosition={(value) => setFilters(f => ({ ...f, position: value }))}
                  showDeletedOnly={filters.showDeletedOnly}
                  setShowDeletedOnly={(value) => setFilters(f => ({ ...f, showDeletedOnly: value }))}
                  onClear={() => {
                    setFilters({
                      clearanceType: "",
                      sex: "",
                      status: "",
                      dateFrom: "",
                      dateTo: "",
                      jobsite: "",
                      position: "",
                      showDeletedOnly: false
                    })
                    setPanelQuery("")
                    // Trigger refresh with cleared filters
                    fetchClearances({
                      page: 1,
                      limit: 10,
                      search: search,
                      clearanceType: "",
                      sex: "",
                      status: "",
                      dateFrom: "",
                      dateTo: "",
                      jobsite: "",
                      position: "",
                      showDeletedOnly: false
                    })
                    // Close the filter panel
                    setShowFilter(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls - Above table container */}
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
            </div>
            <div className="flex items-center gap-1">
              {(() => {
                const pages: any[] = []
                const totalPages = pagination.totalPages
                const currentPage = pagination.page
                const go = (p: number) => fetchClearances(getCurrentFilters(p))

                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(i)} className="min-w-[40px] h-8">{i}</Button>
                    )
                  }
                } else {
                  let startPage = Math.max(1, currentPage - 2)
                  let endPage = Math.min(totalPages, startPage + 4)
                  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)
                  if (startPage > 1) {
                    pages.push(<Button key={1} variant={1 === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(1)} className="min-w-[40px] h-8">1</Button>)
                    if (startPage > 2) pages.push(<span key="bm-ellipses-start" className="px-2 text-gray-500">...</span>)
                  }
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(i)} className="min-w-[40px] h-8">{i}</Button>
                    )
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="bm-ellipses-end" className="px-2 text-gray-500">...</span>)
                    pages.push(<Button key={totalPages} variant={totalPages === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(totalPages)} className="min-w-[40px] h-8">{totalPages}</Button>)
                  }
                }
                return pages
              })()}
            </div>
          </div>
        {/* Table placeholder: reuse existing clearance list via hook */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1976D2] text-white">
                    <th className="py-3 px-4 font-medium">Control No.</th>
                    <th className="py-3 px-4 font-medium">Name of Worker</th>
                    <th className="py-3 px-4 font-medium">Sex</th>
                    <th className="py-3 px-4 font-medium">Destination</th>
                    <th className="py-3 px-4 font-medium">Employer</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="py-8 text-center text-red-500">{error}</td></tr>
                  ) : clearances.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">No records found</td></tr>
                  ) : clearances.map((row: any, i: number) => (
                    <tr 
                      key={row.id ?? i} 
                      className={`hover:bg-gray-150 transition-colors duration-75 select-none ${row.deleted_at ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        // Prevent viewing deleted records
                        if (row.deleted_at) {
                          return
                        }
                        setSelected(row)
                        setViewOpen(true)
                      }}
                    >
                      <td className="py-3 px-4 text-center">{row.control_number || <span className="text-gray-400">-</span>}</td>
                      <td className="py-3 px-4 text-center">{row.name_of_worker}</td>
                      <td className="py-3 px-4 text-center">{(row.sex || '').toUpperCase()}</td>
                      <td className="py-3 px-4 text-center">{row.destination}</td>
                      <td className="py-3 px-4 text-center">{row.employer || <span className="text-gray-400">-</span>}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          {(() => {
                            // Check if record is soft deleted
                            if (row.deleted_at) {
                              return (
                                <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 bg-red-50 text-red-700 ring-red-200 font-medium">
                                  <span className="font-medium">Deleted</span>
                                </span>
                              )
                            }
                            
                            const s = (row.status || '').toString()
                            const label = s === 'for_clearance' ? 'For Compliance' : s === 'for_approval' ? 'For Approval' : s === 'approved' ? 'Approved' : (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending')
                            const color = s === 'finished' ? 'bg-green-50 text-green-700 ring-green-200' : s === 'approved' ? 'bg-green-100 text-green-800 ring-green-200' : (s === 'for_clearance' ? 'bg-blue-50 text-blue-700 ring-blue-200' : (s === 'for_approval' ? 'bg-blue-100 text-blue-800 ring-blue-200' : (s === 'rejected' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-[#FFF3E0] text-[#F57C00] ring-[#FFE0B2]')))
                            return (
                              <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ${color} font-medium`}>
                                <span className="font-medium">{label}</span>
                              </span>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-150">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {!row.deleted_at && (
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`)
                                  const json = await res.json()
                                  if (json.success) {
                                    setSelected(json.data)
                                    setViewOpen(true)
                                  } else {
                                    toast({ title: 'Failed to load', description: json.error || 'Not found', variant: 'destructive' })
                                  }
                                } catch {}
                              }}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                            )}
                            {(() => {
                              // Show different options for deleted records
                              if (row.deleted_at) {
                                return (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setApplicationToRestore(row)
                                      setRestoreConfirmOpen(true)
                                    }} className="text-green-600 focus:text-green-700">
                                      <CheckCircle className="h-4 w-4 mr-2" /> Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setApplicationToPermanentDelete(row)
                                      setPermanentDeleteConfirmOpen(true)
                                    }} className="text-red-600 focus:text-red-700">
                                      <Trash2 className="h-4 w-4 mr-2" /> Permanently Delete
                                    </DropdownMenuItem>
                                  </>
                                )
                              }
                              
                              const s = (row.status || '').toString()
                              const isLocked = s === 'approved' || s === 'rejected'
                              if (isLocked) return null
                              return (
                                <>
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`)
                                      const json = await res.json()
                                      if (json.success) {
                                        const d = json.data
                                        setSelected(d)
                                        const initialEditData = {
                                          nameOfWorker: d.name_of_worker || '',
                                          sex: d.sex || '',
                                          employer: d.employer || '',
                                          destination: d.destination || '',
                                          position: d.position || '',
                                          salary: d.raw_salary != null ? String(d.raw_salary) : (d.salary != null ? String(d.salary) : ''),
                                          job_type: d.job_type || '',
                                          salaryCurrency: d.salary_currency || '',
                                        }
                                        setEditData(initialEditData)
                                        setOriginalEditData(initialEditData)
                                        // Store the original salary USD value from the database
                                        const originalUSD = d.salary !== undefined && d.salary !== null 
                                          ? Number(d.salary) 
                                          : null
                                        setOriginalSalaryUSD(originalUSD)
                                        setEditOpen(true)
                                      } else {
                                        toast({ title: 'Failed to load', description: json.error || 'Not found', variant: 'destructive' })
                                      }
                                    } catch {}
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { 
                                    const status = (row.status || '').toString()
                                    if (status === 'approved' || status === 'rejected') {
                                      toast({ title: 'Action not allowed', description: 'Approved/Rejected applications cannot be deleted', variant: 'destructive' })
                                      return
                                    }
                                    setSelected(row); 
                                    setDeleteConfirmOpen(true) 
                                  }} className="text-red-600 focus:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="w-full md:w-[360px]">
            {(() => {
              // Provide BM-specific totals mapping via fetchTotals
              const fetchBmTotals = async () => {
                const statuses = [
                  { key: 'pending', api: 'for_clearance' },
                  { key: 'forReview', api: 'for_approval' },
                  { key: 'approved', api: 'approved' },
                  { key: 'rejected', api: 'rejected' },
                ] as const
                const resps = await Promise.all(statuses.map(s => fetch(`/api/balik-manggagawa/clearance?status=${s.api}&page=1&limit=1`)))
                const jsons = await Promise.all(resps.map(r => r.json()))
                const result: any = { pending: 0, forReview: 0, approved: 0, rejected: 0 }
                jsons.forEach((j, idx) => {
                  const key = statuses[idx].key as 'pending'|'forReview'|'approved'|'rejected'
                  result[key] = j?.data?.pagination?.total ?? (j?.data?.data?.length ?? 0)
                })
                return result as { pending: number; forReview: number; approved: number; rejected: number }
              }
              return (
                <ProcessingStatusCard 
                  title="Overall Status"
                  verticalLayout={true}
                  chartHeight={240}
                  fetchTotals={fetchBmTotals}
                  labelOverrides={{ pending: 'For Compliance', forReview: 'For Approval', approved: 'Approved', rejected: 'Rejected' }}
                />
              )
            })()}
          </div>
        </div>
      </main>

      {/* Create BM Clearance Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(o)=> { 
        setIsCreateOpen(o); 
        if (!o) { 
          resetCreateForm();
        } 
      }}>
        <DialogContent onInteractOutside={(e)=> e.preventDefault()} className="p-0 overflow-hidden max-w-2xl w-[95vw]">
          <DialogTitle className="sr-only">Create BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create BM Application</h2>
            <DialogClose asChild>
              <button 
                aria-label="Close" 
                className="text-white text-2xl font-bold hover:opacity-80 transition-opacity"
                onClick={resetCreateForm}
              >
                ×
              </button>
            </DialogClose>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Control No. (Preview)</Label>
                <Input value={controlPreview || ''} disabled className="bg-gray-50 font-mono text-sm mt-1" />
                <p className="text-xs text-gray-500 mt-1">Prefix is BM. Actual number is generated on create.</p>
              </div>
              <div>
                <Label>Name of Worker</Label>
                <Input value={formData.nameOfWorker} onChange={(e)=> setFormData(f=>({ ...f, nameOfWorker: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Name (FIRST M.I LAST)" />
              </div>
              <div>
                <Label>Sex</Label>
                <div className="mt-1 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_create"
                      value="female"
                      checked={formData.sex === 'female'}
                      onChange={() => setFormData(f=>({ ...f, sex: 'female' }))}
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_create"
                      value="male"
                      checked={formData.sex === 'male'}
                      onChange={() => setFormData(f=>({ ...f, sex: 'male' }))}
                    />
                    Male
                  </label>
                </div>
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={formData.destination} onChange={(e)=> setFormData(f=>({ ...f, destination: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Country" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Position</Label>
                  </div>
                  <div className="w-40">
                    <Label>Job Type</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input value={formData.position} onChange={(e)=> setFormData(f=>({ ...f, position: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Position" />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={formData.job_type}
                      onChange={(e)=> setFormData(f=>({ ...f, job_type: e.target.value as 'household' | 'professional' }))}
                    >
                      <option value="">----</option>
                      <option value="professional">Professional</option>
                      <option value="household">Household</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <Label>Employer</Label>
                <Input value={formData.employer} onChange={(e)=> setFormData(f=>({ ...f, employer: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Employer Name" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Salary (per month)</Label>
                  </div>
                  <div className="w-40">
                    <Label>Currency</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      value={formData.salary} 
                      onChange={(e)=> setFormData(f=>({ ...f, salary: e.target.value }))} 
                      className="mt-1" 
                      placeholder="Enter Salary Amount" 
                    />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={formData.salaryCurrency}
                      onChange={(e)=> setFormData(f=>({ ...f, salaryCurrency: e.target.value as Currency }))}
                    >
                      <option value="">----</option>
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
                    <span className="text-sm text-blue-700">
                      USD Equivalent: {usdDisplay}
                    </span>
                  </div>
                )}
              </div>
              {/* Time Received and Time Released */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Received:</Label>
                  <Input
                    type="datetime-local"
                    value={formData.time_received}
                    onChange={(e) => setFormData({ ...formData, time_received: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Time Released:</Label>
                  <Input
                    type="datetime-local"
                    value={formData.time_released}
                    onChange={(e) => setFormData({ ...formData, time_released: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetCreateForm();
                  setIsCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button className="bg-[#1976D2] text-white" disabled={creating} onClick={()=> setCreateConfirmOpen(true)}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Create Dialog - BM */}
      <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Create</AlertDialogTitle>
            <AlertDialogDescription>
              Create this new BM application for <strong>{formData.nameOfWorker || 'this worker'}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreateConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async ()=>{
              if (!formData.nameOfWorker || !formData.sex || !formData.destination || !formData.position) {
                setCreateConfirmOpen(false)
                toast({ title: 'Missing fields', description: 'Please complete required fields.', variant: 'destructive' });
                return;
              }
              setCreateConfirmOpen(false)
              setCreating(true)
              const numericSalary = formData.salary !== '' ? Number(formData.salary) : 0
              const salaryUsd = formData.salaryCurrency && numericSalary
                ? (formData.salaryCurrency === 'USD' ? numericSalary : Number((await getUSDEquivalentAsync(numericSalary, formData.salaryCurrency)).replace(/[^0-9.]/g, '')))
                : numericSalary
              const payload = {
                nameOfWorker: formData.nameOfWorker,
                sex: formData.sex as 'male' | 'female',
                employer: formData.employer,
                destination: formData.destination,
                salary: salaryUsd,
                rawSalary: numericSalary,
                position: formData.position || undefined,
                jobType: formData.job_type || undefined,
                salaryCurrency: formData.salaryCurrency || undefined,
                time_received: formData.time_received || undefined,
                time_released: formData.time_released || undefined,
              }
              const res = await createClearance(payload)
              setCreating(false)
              if ((res as any)?.success) {
                toast({ title: 'Created', description: 'BM clearance created successfully.' })
                resetCreateForm()
                setIsCreateOpen(false)
                fetchClearances(getCurrentFilters())
              } else {
                toast({ title: 'Error', description: (res as any)?.error || 'Failed to create', variant: 'destructive' })
              }
            }} className="bg-blue-600 hover:bg-blue-700 text-white">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={(o)=> { setViewOpen(o); if (!o) setSelected(null) }}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogTitle className="sr-only">View BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected?.name_of_worker ? `${selected.name_of_worker}'s BM Application` : 'View BM Application'}</h2>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pt-3 pb-1">
              <h3 className="text-base font-semibold text-gray-700">Applicant Information</h3>
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="text-gray-500">Control No.:</div>
                <div className="font-medium">{selected?.control_number || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Name of Worker:</div>
                <div className="font-medium">{selected?.name_of_worker || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Sex:</div>
                <div className="font-medium capitalize">{selected?.sex || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Employer:</div>
                <div className="font-medium">{selected?.employer || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Destination:</div>
                <div className="font-medium">{selected?.destination || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Position:</div>
                <div className="font-medium">{selected?.position || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Salary (per month):</div>
                <div className="font-medium">
                  {selected?.salary != null && selected?.raw_salary != null && selected?.salary_currency ? 
                    `USD ${Number(selected.salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${selected.salary_currency} ${Number(selected.raw_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : selected?.salary != null ? 
                      `USD ${Number(selected.salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : '-'
                  }
                </div>
              </div>
            </div>
            {/* Documents Section */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-700">Documents</h3>
                {(() => {
                  const status = (selected?.status || '').toString()
                  const isLocked = status === 'approved' || status === 'rejected'
                  
                  if (isLocked) return null
                  
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        className="bg-[#1976D2] text-white text-xs"
                        onClick={() => setUploadModalOpen(true)}
                      >+ New</Button>
                    </div>
                  )
                })()}
              </div>
              <BMDocumentsSection 
                applicationId={selected?.id} 
                refreshTrigger={documentsRefreshTrigger}
                applicationStatus={selected?.status}
              />
              <div className="mt-6">
                <TransactionHistory
                  applicationType="balik-manggagawa"
                  recordId={selected?.id ?? null}
                  refreshKey={documentsRefreshTrigger}
                />
              </div>
            </div>
          </div>
          {/* Status Action Buttons - Sticky Footer */}
          {(() => {
            if (!selected) return null
            
            const status = (selected.status || '').toString()
            const isLocked = status === 'approved' || status === 'rejected'
            
            if (isLocked) {
              return (
                <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">
                    {status === 'approved' ? 'This application has been approved and cannot be modified.' : 'This application has been rejected and cannot be modified.'}
                  </span>
                </div>
              )
            }
            
            return (
              <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
                      <FileCheck className="h-4 w-4" />
                      For Compliance
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuItem onClick={() => openComplianceDialog('critical_skill')}>Critical Skills</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('for_assessment_country')
                    }}>For Assessment Country</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('non_compliant_country')
                    }}>Non Compliant Country</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('no_verified_contract')
                    }}>No Verified Contract</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('seafarer_position')
                    }}>Seaferer's Position</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('watchlisted_employer')
                    }}>Watchlisted Employer</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      openComplianceDialog('watchlisted_similar_name')
                    }}>Watchlisted OFW</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  onClick={() => setRejectReasonOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject/Deny
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  onClick={() => setApproveConfirmOpen(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={(o)=> { setEditOpen(o); if (!o) { setSelected(null); setEditSaving(false); setOriginalEditData(null); setOriginalSalaryUSD(null) } }}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl w-[95vw]">
          <DialogTitle className="sr-only">Edit BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4">
            <h2 className="text-lg font-semibold">{(editData.nameOfWorker || selected?.name_of_worker) ? `${(editData.nameOfWorker || selected?.name_of_worker)}'s BM Application` : 'Edit BM Application'}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Name of Worker</Label>
                <Input value={editData.nameOfWorker} onChange={(e)=> setEditData(d=>({ ...d, nameOfWorker: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Name (FIRST M.I LAST)" />
              </div>
              <div>
                <Label>Sex</Label>
                <div className="mt-1 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="bm_sex_edit" value="female" checked={editData.sex === 'female'} onChange={()=> setEditData(d=>({ ...d, sex: 'female' }))} /> Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="bm_sex_edit" value="male" checked={editData.sex === 'male'} onChange={()=> setEditData(d=>({ ...d, sex: 'male' }))} /> Male
                  </label>
                </div>
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={editData.destination} onChange={(e)=> setEditData(d=>({ ...d, destination: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Country" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Position</Label>
                  </div>
                  <div className="w-40">
                    <Label>Job Type</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input value={editData.position} onChange={(e)=> setEditData(d=>({ ...d, position: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Position" />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={editData.job_type}
                      onChange={(e)=> setEditData(d=>({ ...d, job_type: e.target.value as 'household' | 'professional' }))}
                    >
                      <option value="">----</option>
                      <option value="professional">Professional</option>
                      <option value="household">Household</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Salary (per month)</Label>
                  </div>
                  <div className="w-40">
                    <Label>Currency</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input type="number" value={editData.salary} onChange={(e)=> setEditData(d=>({ ...d, salary: e.target.value }))} className="mt-1" placeholder="Enter Salary" />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={editData.salaryCurrency}
                      onChange={(e)=> setEditData(d=>({ ...d, salaryCurrency: e.target.value as Currency }))}
                    >
                      <option value="">----</option>
                      {AVAILABLE_CURRENCIES.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {editData.salary && editData.salaryCurrency !== "USD" && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md">
                    <span className="text-sm text-blue-700">
                      USD Equivalent: {editUsdDisplay}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=> setEditOpen(false)}>Cancel</Button>
              <Button 
                disabled={editSaving}
                onClick={async () => {
                if (!selected?.id) return
                if (!editData.nameOfWorker || !editData.sex || !editData.destination || !editData.position || !editData.employer) {
                  toast({ title: 'Missing fields', description: 'Please complete required fields.', variant: 'destructive' });
                  return;
                }
                setEditSaving(true)
                try {
                  // Check if salary or currency has been manually changed
                  const salaryChanged = originalEditData 
                    ? (editData.salary !== originalEditData.salary || editData.salaryCurrency !== originalEditData.salaryCurrency)
                    : true // If no original data, assume it's a new value
                  
                  const numericSalary = editData.salary !== '' ? Number(editData.salary) : 0
                  
                  // Only recalculate USD if salary or currency was changed by the user
                  // Otherwise, preserve the original USD value to avoid recalculation based on current exchange rates
                  let salaryUsd: number
                  if (salaryChanged) {
                    // User manually changed salary or currency, recalculate USD with current rates
                    salaryUsd = editData.salaryCurrency && numericSalary
                      ? (editData.salaryCurrency === 'USD' ? numericSalary : Number((await getUSDEquivalentAsync(numericSalary, editData.salaryCurrency)).replace(/[^0-9.]/g, '')))
                      : numericSalary
                    // Round to nearest hundredths
                    salaryUsd = Math.round((salaryUsd + Number.EPSILON) * 100) / 100
                  } else {
                    // Salary/currency unchanged, preserve original USD value
                    salaryUsd = originalSalaryUSD !== null ? originalSalaryUSD : numericSalary
                  }

                  const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nameOfWorker: editData.nameOfWorker,
                      sex: editData.sex,
                      employer: editData.employer,
                      destination: editData.destination,
                      salary: salaryUsd,
                      rawSalary: numericSalary,
                      position: editData.position,
                      jobType: editData.job_type || undefined,
                      salaryCurrency: editData.salaryCurrency || undefined,
                    })
                  })
                  const json = await res.json()
                  if (json.success) {
                    toast({ title: 'Updated', description: 'BM application updated.' })
                    setEditOpen(false)
                    fetchClearances(getCurrentFilters())
                  } else {
                    toast({ title: 'Error', description: json.error || 'Update failed', variant: 'destructive' })
                  }
                } catch (err) {
                  toast({ title: 'Error', description: 'Update failed', variant: 'destructive' })
                } finally {
                  setEditSaving(false)
                }
              }} className="bg-[#1976D2] hover:bg-[#1565C0]">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(o)=> { setDeleteConfirmOpen(o); if (!o) setSelected(null) }}>
        <DialogContent>
          <DialogTitle>Delete Application</DialogTitle>
          <div className="text-sm text-gray-700">
            Are you sure you want to delete the application for <strong>{selected?.name_of_worker || selected?.nameOfWorker || 'this applicant'}</strong>? This will move the application to deleted items where it can be restored later.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=> setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async ()=>{
              if (!selected?.id) return
              try {
                const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, { method: 'DELETE' })
                const json = await res.json()
                if (json.success) {
                  toast({ title: 'Deleted', description: 'Clearance moved to trash.' })
                  setDeleteConfirmOpen(false)
                  fetchClearances(getCurrentFilters())
                } else {
                  toast({ title: 'Delete failed', description: json.error || 'Failed to delete', variant: 'destructive' })
                }
              } catch (e) {
                toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' })
              }
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteConfirmOpen} onOpenChange={(o)=> { setPermanentDeleteConfirmOpen(o); if (!o) { setApplicationToPermanentDelete(null); setPermanentDeleteConfirmText("") } }}>
        <DialogContent>
          <DialogTitle className="text-red-600">Permanently Delete Application</DialogTitle>
          <div className="text-sm text-gray-700">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                <Trash2 className="h-4 w-4" />
                Warning: This action cannot be undone
              </div>
              <p className="text-red-700">
                You are about to permanently delete the application for <strong>{applicationToPermanentDelete?.name_of_worker || applicationToPermanentDelete?.nameOfWorker || 'this applicant'}</strong>.
              </p>
              <p className="text-red-700 mt-2">
                This will permanently remove all data including documents, processing records, and cannot be recovered.
              </p>
            </div>
            <p className="font-semibold">Are you absolutely sure you want to proceed?</p>
            <br />
            To confirm, please type <strong>DELETE</strong> in the field below:
          </div>
          <div className="py-4">
            <input
              type="text"
              value={permanentDeleteConfirmText}
              onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && permanentDeleteConfirmText === "DELETE") {
                  // Trigger the delete action
                  const deleteButton = document.querySelector('[data-permanent-delete-button]') as HTMLButtonElement;
                  if (deleteButton && !deleteButton.disabled) {
                    deleteButton.click();
                  }
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=> setPermanentDeleteConfirmOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={permanentDeleteConfirmText !== "DELETE"}
              data-permanent-delete-button
              onClick={async ()=>{
              if (!applicationToPermanentDelete?.id) return
              try {
                const res = await fetch(`/api/balik-manggagawa/clearance/${applicationToPermanentDelete.id}/permanent-delete`, { method: 'DELETE' })
                const json = await res.json()
                if (json.success) {
                  toast({ title: 'Permanently Deleted', description: 'Clearance has been permanently deleted and cannot be recovered' })
                  setPermanentDeleteConfirmOpen(false)
                  setPermanentDeleteConfirmText("")
                  fetchClearances(getCurrentFilters())
                } else {
                  toast({ title: 'Permanent delete failed', description: json.error || 'Failed to permanently delete', variant: 'destructive' })
                }
              } catch (e) {
                toast({ title: 'Permanent delete failed', description: 'Network error', variant: 'destructive' })
              }
            }}>Permanently Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreConfirmOpen} onOpenChange={(o)=> { setRestoreConfirmOpen(o); if (!o) { setApplicationToRestore(null); setRestoreConfirmText("") } }}>
        <DialogContent>
          <DialogTitle className="text-green-600">Restore Application</DialogTitle>
          <div className="text-sm text-gray-700">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                <CheckCircle className="h-4 w-4" />
                Restore Application
              </div>
              <p className="text-green-700">
                You are about to restore the application for <strong>{applicationToRestore?.name_of_worker || applicationToRestore?.nameOfWorker || 'this applicant'}</strong>.
              </p>
              <p className="text-green-700 mt-2">
                This will move the application back to the active applications list and make it available for editing and processing.
              </p>
            </div>
            <p className="font-semibold">Are you sure you want to restore this application?</p>
            <br />
            To confirm, please type <strong>RESTORE</strong> in the field below:
          </div>
          <div className="py-4">
            <input
              type="text"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="Type RESTORE to confirm"
              className="w-full border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && restoreConfirmText === "RESTORE") {
                  // Trigger the restore action
                  const restoreButton = document.querySelector('[data-restore-button]') as HTMLButtonElement;
                  if (restoreButton && !restoreButton.disabled) {
                    restoreButton.click();
                  }
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=> setRestoreConfirmOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={restoreConfirmText !== "RESTORE"}
              data-restore-button
              onClick={async ()=>{
              if (!applicationToRestore?.id) return
              try {
                const res = await fetch(`/api/balik-manggagawa/clearance/${applicationToRestore.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'restore' })
                })
                const json = await res.json()
                if (json.success) {
                  toast({ title: 'Restored', description: 'Clearance has been restored successfully' })
                  setRestoreConfirmOpen(false)
                  setRestoreConfirmText("")
                  fetchClearances(getCurrentFilters())
                } else {
                  toast({ title: 'Restore failed', description: json.error || 'Failed to restore', variant: 'destructive' })
                }
              } catch (e) {
                toast({ title: 'Restore failed', description: 'Network error', variant: 'destructive' })
              }
            }}>Restore</Button>
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
            applicationType="balik_manggagawa"
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

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the application for <strong>{selected?.name_of_worker || 'this applicant'}</strong>? This action will mark the application as approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!selected?.id) return
                try {
                  const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'approved', clearanceType: null }) })
                  const json = await res.json()
                  if (json.success) {
                    toast({ title: 'Updated', description: 'Marked as Approved' })
                    setViewOpen(false)
                    setApproveConfirmOpen(false)
                    fetchClearances(getCurrentFilters())
                  } else {
                    toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectReasonOpen} onOpenChange={(open) => { setRejectReasonOpen(open); if (!open) setRejectReason("") }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for rejection</Label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="w-full border rounded px-3 py-2 mt-1 min-h-[100px] resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectReasonOpen(false)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!rejectReason.trim()}
                onClick={async () => {
                  if (!selected?.id || !rejectReason.trim()) return
                  try {
                    const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, { 
                      method: 'PATCH', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({ 
                        action: 'status_update', 
                        status: 'rejected', 
                        clearanceType: null,
                        rejectionReason: rejectReason.trim()
                      }) 
                    })
                    const json = await res.json()
                    if (json.success) {
                      toast({ title: 'Updated', description: 'Marked as Rejected/Denied' })
                      setViewOpen(false)
                      setRejectReasonOpen(false)
                      setRejectReason("")
                      fetchClearances(getCurrentFilters())
                    } else {
                      toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                  }
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compliance Fields Dialog */}
      <Dialog open={complianceDialogOpen} onOpenChange={(open) => { setComplianceDialogOpen(open); if (!open) { setSelectedComplianceType(""); setComplianceFields({}) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>For Compliance Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Please provide the required details for <strong>{
                selectedComplianceType === 'critical_skill' ? 'Critical Skills' :
                selectedComplianceType === 'for_assessment_country' ? 'For Assessment Country' :
                selectedComplianceType === 'non_compliant_country' ? 'Non Compliant Country' :
                selectedComplianceType === 'no_verified_contract' ? 'No Verified Contract' :
                selectedComplianceType === 'seafarer_position' ? 'Seaferer\'s Position' :
                selectedComplianceType === 'watchlisted_employer' ? 'Watchlisted Employer' :
                selectedComplianceType === 'watchlisted_similar_name' ? 'Watchlisted OFW' : 'this type'
              }</strong>.
            </div>
            {/* Special layout for For Assessment Country and Non Compliant Country months/years */}
            {(selectedComplianceType === 'for_assessment_country' || selectedComplianceType === 'non_compliant_country') && (
              <div>
                <Label>No. of Month(s)/Year(s) with the Principal</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    id={`compliance-monthsYearsYears`}
                    type="number"
                    min="0"
                    step="1"
                    value={complianceFields['monthsYearsYears'] || ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const sanitized = raw.replace(/[^0-9]/g, '')
                      setComplianceFields(f => ({ ...f, ['monthsYearsYears']: sanitized }))
                    }}
                    className="w-1/2 border rounded px-3 py-2"
                    placeholder="Year(s)"
                  />
                  <input
                    id={`compliance-monthsYearsMonths`}
                    type="number"
                    min="0"
                    step="1"
                    value={complianceFields['monthsYearsMonths'] || ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const sanitized = raw.replace(/[^0-9]/g, '')
                      setComplianceFields(f => ({ ...f, ['monthsYearsMonths']: sanitized }))
                    }}
                    className="w-1/2 border rounded px-3 py-2"
                    placeholder="Month(s)"
                  />
                </div>
              </div>
            )}

            {/* Special layout for Critical Skills employment duration and date fields */}
            {selectedComplianceType === 'critical_skill' && (
              <>
                <div>
                  <Label htmlFor="compliance-principalName">Name of the new principal *</Label>
                  <input
                    id="compliance-principalName"
                    type="text"
                    value={complianceFields['principalName'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['principalName']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateArrival">Date of Arrival *</Label>
                      <input
                        id="compliance-dateArrival"
                        type="date"
                        value={complianceFields['dateArrival'] || ''}
                        max={todayIso}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val && val > todayIso) {
                            setComplianceFields(f => ({ ...f, ['dateArrival']: todayIso }))
                            return
                          }
                          setComplianceFields(f => ({ ...f, ['dateArrival']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateDeparture">Date of Departure *</Label>
                      <input
                        id="compliance-dateDeparture"
                        type="date"
                        value={complianceFields['dateDeparture'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Label>Employment duration</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationFrom" className="text-xs font-normal">From *</label>
                      <input
                        id="compliance-employmentDurationFrom"
                        type="date"
                        value={complianceFields['employmentDurationFrom'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => {
                            const next = { ...f, ['employmentDurationFrom']: val }
                            const until = next['employmentDurationUntil']
                            if (val && until && val > until) {
                              next['employmentDurationUntil'] = val
                            }
                            return next
                          })
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationUntil" className="text-xs font-normal">Until *</label>
                      <input
                        id="compliance-employmentDurationUntil"
                        type="date"
                        value={complianceFields['employmentDurationUntil'] || ''}
                        min={complianceFields['employmentDurationFrom'] || undefined}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => {
                            const from = f['employmentDurationFrom'] || ''
                            const nextVal = from && val && val < from ? from : val
                            return { ...f, ['employmentDurationUntil']: nextVal }
                          })
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Special layout for Seaferer's Position employment duration and date fields */}
            {selectedComplianceType === 'seafarer_position' && (
              <>
                <div>
                  <Label htmlFor="compliance-principalName">Name of the new principal *</Label>
                  <input
                    id="compliance-principalName"
                    type="text"
                    value={complianceFields['principalName'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['principalName']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateArrival">Date of Arrival *</Label>
                      <input
                        id="compliance-dateArrival"
                        type="date"
                        value={complianceFields['dateArrival'] || ''}
                        max={todayIso}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val && val > todayIso) {
                            setComplianceFields(f => ({ ...f, ['dateArrival']: todayIso }))
                            return
                          }
                          setComplianceFields(f => ({ ...f, ['dateArrival']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateDeparture">Date of Departure *</Label>
                      <input
                        id="compliance-dateDeparture"
                        type="date"
                        value={complianceFields['dateDeparture'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Label>Employment duration</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationFrom" className="text-xs font-normal">From *</label>
                      <input
                        id="compliance-employmentDurationFrom"
                        type="date"
                        value={complianceFields['employmentDurationFrom'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => {
                            const next = { ...f, ['employmentDurationFrom']: val }
                            const until = next['employmentDurationUntil']
                            if (val && until && val > until) {
                              next['employmentDurationUntil'] = val
                            }
                            return next
                          })
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationUntil" className="text-xs font-normal">Until *</label>
                      <input
                        id="compliance-employmentDurationUntil"
                        type="date"
                        value={complianceFields['employmentDurationUntil'] || ''}
                        min={complianceFields['employmentDurationFrom'] || undefined}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => {
                            const from = f['employmentDurationFrom'] || ''
                            const nextVal = from && val && val < from ? from : val
                            return { ...f, ['employmentDurationUntil']: nextVal }
                          })
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Special layout for Watchlisted Employer fields */}
            {selectedComplianceType === 'watchlisted_employer' && (
              <>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="compliance-placeEmployment">Place of Employment *</Label>
                      <input
                        id="compliance-placeEmployment"
                        type="text"
                        value={complianceFields['placeEmployment'] || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase()
                          setComplianceFields(f => ({ ...f, ['placeEmployment']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                        placeholder="e.g., UNITED ARAB EMIRATES"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateEmployment">Year of Employment *</Label>
                      <select
                        id="compliance-dateEmployment"
                        value={complianceFields['dateEmployment'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['dateEmployment']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      >
                        <option value="">Select Year</option>
                        {Array.from({ length: 101 }, (_, i) => {
                          const currentYear = new Date().getFullYear()
                          const year = currentYear - i
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="compliance-totalDeployedOfws">Total Deployed OFWs *</Label>
                  <input
                    id="compliance-totalDeployedOfws"
                    type="number"
                    min="0"
                    value={complianceFields['totalDeployedOfws'] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setComplianceFields(f => ({ ...f, ['totalDeployedOfws']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-dateBlacklisting">Date of Blacklisting *</Label>
                  <input
                    id="compliance-dateBlacklisting"
                    type="date"
                    value={complianceFields['dateBlacklisting'] || ''}
                    max={todayIso}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val && val > todayIso) {
                        setComplianceFields(f => ({ ...f, ['dateBlacklisting']: todayIso }))
                        return
                      }
                      setComplianceFields(f => ({ ...f, ['dateBlacklisting']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-reasonBlacklisting">Reason for Blacklisting *</Label>
                  <input
                    id="compliance-reasonBlacklisting"
                    type="text"
                    value={complianceFields['reasonBlacklisting'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['reasonBlacklisting']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., CONTRACTUAL VIOLATION"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-yearsWithPrincipal">No. of Years with the Principal *</Label>
                  <input
                    id="compliance-yearsWithPrincipal"
                    type="number"
                    min="0"
                    value={complianceFields['yearsWithPrincipal'] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setComplianceFields(f => ({ ...f, ['yearsWithPrincipal']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateArrival">Date of Arrival *</Label>
                      <input
                        id="compliance-dateArrival"
                        type="date"
                        value={complianceFields['dateArrival'] || ''}
                        max={todayIso}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val && val > todayIso) {
                            setComplianceFields(f => ({ ...f, ['dateArrival']: todayIso }))
                            return
                          }
                          setComplianceFields(f => ({ ...f, ['dateArrival']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="compliance-dateDeparture">Date of Departure *</Label>
                      <input
                        id="compliance-dateDeparture"
                        type="date"
                        value={complianceFields['dateDeparture'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Special layout for Non Compliant Country date fields */}
            {selectedComplianceType === 'non_compliant_country' && (
              <div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="compliance-dateArrival">Date of Arrival *</Label>
                    <input
                      id="compliance-dateArrival"
                      type="date"
                      value={complianceFields['dateArrival'] || ''}
                      max={todayIso}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val && val > todayIso) {
                          setComplianceFields(f => ({ ...f, ['dateArrival']: todayIso }))
                          return
                        }
                        setComplianceFields(f => ({ ...f, ['dateArrival']: val }))
                      }}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="compliance-dateDeparture">Date of Departure *</Label>
                    <input
                      id="compliance-dateDeparture"
                      type="date"
                      value={complianceFields['dateDeparture'] || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                      }}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Special layout for Watchlisted OFW fields */}
            {selectedComplianceType === 'watchlisted_similar_name' && (
              <>
                <div>
                  <Label htmlFor="compliance-activeEmailAddress">Active E-Mail Address *</Label>
                  <input
                    id="compliance-activeEmailAddress"
                    type="email"
                    value={complianceFields['activeEmailAddress'] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setComplianceFields(f => ({ ...f, ['activeEmailAddress']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., john.doe@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-activePhMobileNumber">Active PH Mobile Number *</Label>
                  <input
                    id="compliance-activePhMobileNumber"
                    type="text"
                    value={complianceFields['activePhMobileNumber'] || '09'}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
                      setComplianceFields(f => ({ ...f, ['activePhMobileNumber']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., 09123456789"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-dateDeparture">Date of Departure (PH to Job Site) *</Label>
                  <input
                    id="compliance-dateDeparture"
                    type="date"
                    value={complianceFields['dateDeparture'] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="compliance-remarks">Remarks</Label>
                  <input
                    id="compliance-remarks"
                    type="text"
                    value={complianceFields['remarks'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['remarks']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="Optional remarks"
                  />
                </div>
              </>
            )}

            {/* Special layout for No Verified Contract fields */}
            {selectedComplianceType === 'no_verified_contract' && (
              <>
                <div>
                  <Label htmlFor="compliance-principalName">Name of the new principal *</Label>
                  <input
                    id="compliance-principalName"
                    type="text"
                    value={complianceFields['principalName'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['principalName']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., SAMSUNG"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="compliance-dateArrival">Date of arrival *</Label>
                    <input
                      id="compliance-dateArrival"
                      type="date"
                      value={complianceFields['dateArrival'] || ''}
                      max={todayIso}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val && val > todayIso) {
                          setComplianceFields(f => ({ ...f, ['dateArrival']: todayIso }))
                          return
                        }
                        setComplianceFields(f => ({ ...f, ['dateArrival']: val }))
                      }}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="compliance-dateDeparture">Date of departure *</Label>
                    <input
                      id="compliance-dateDeparture"
                      type="date"
                      value={complianceFields['dateDeparture'] || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setComplianceFields(f => ({ ...f, ['dateDeparture']: val }))
                      }}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </div>
                </div>
                <div className="mt-8">
                  <Label>Employment duration</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationFrom" className="text-xs font-normal">From *</label>
                      <input
                        id="compliance-employmentDurationFrom"
                        type="date"
                        value={complianceFields['employmentDurationFrom'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['employmentDurationFrom']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="compliance-employmentDurationUntil" className="text-xs font-normal">Until *</label>
                      <input
                        id="compliance-employmentDurationUntil"
                        type="date"
                        value={complianceFields['employmentDurationUntil'] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setComplianceFields(f => ({ ...f, ['employmentDurationUntil']: val }))
                        }}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="compliance-remarks">Remarks</Label>
                  <input
                    id="compliance-remarks"
                    type="text"
                    value={complianceFields['remarks'] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setComplianceFields(f => ({ ...f, ['remarks']: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="Optional remarks"
                  />
                </div>
              </>
            )}

            {getComplianceFieldDefs(selectedComplianceType)
              .filter(def => !((selectedComplianceType === 'for_assessment_country' || selectedComplianceType === 'non_compliant_country') && (def.key === 'monthsYearsYears' || def.key === 'monthsYearsMonths')) && !(selectedComplianceType === 'non_compliant_country' && (def.key === 'dateArrival' || def.key === 'dateDeparture')) && !(selectedComplianceType === 'critical_skill' && (def.key === 'principalName' || def.key === 'employmentDurationFrom' || def.key === 'employmentDurationUntil' || def.key === 'dateArrival' || def.key === 'dateDeparture')) && !(selectedComplianceType === 'seafarer_position' && (def.key === 'principalName' || def.key === 'employmentDurationFrom' || def.key === 'employmentDurationUntil' || def.key === 'dateArrival' || def.key === 'dateDeparture')) && !(selectedComplianceType === 'watchlisted_employer' && (def.key === 'placeEmployment' || def.key === 'dateEmployment' || def.key === 'totalDeployedOfws' || def.key === 'dateBlacklisting' || def.key === 'reasonBlacklisting' || def.key === 'yearsWithPrincipal' || def.key === 'dateArrival' || def.key === 'dateDeparture')) && !(selectedComplianceType === 'watchlisted_similar_name' && (def.key === 'activeEmailAddress' || def.key === 'activePhMobileNumber' || def.key === 'dateDeparture' || def.key === 'remarks')) && !(selectedComplianceType === 'no_verified_contract' && (def.key === 'principalName' || def.key === 'employmentDurationFrom' || def.key === 'employmentDurationUntil' || def.key === 'dateArrival' || def.key === 'dateDeparture' || def.key === 'remarks')))
              .map(def => (
              <div key={def.key}>
                <Label htmlFor={`compliance-${def.key}`}>{def.label}{def.required ? ' *' : ''}</Label>
                {def.inputType === 'date' ? (
                  <input
                    id={`compliance-${def.key}`}
                    type="date"
                    value={complianceFields[def.key] || ''}
                    max={(def.key === 'dateArrival' || def.key === 'employmentStartDate') ? todayIso : undefined}
                    onChange={(e) => {
                      const val = e.target.value
                      if ((def.key === 'dateArrival' || def.key === 'employmentStartDate') && val && val > todayIso) {
                        // Clamp arrival to today if future
                        setComplianceFields(f => ({ ...f, [def.key]: todayIso }))
                        return
                      }
                      setComplianceFields(f => ({ ...f, [def.key]: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                ) : def.inputType === 'number' ? (
                  <input
                    id={`compliance-${def.key}`}
                    type="number"
                    min="0"
                    step="1"
                    value={complianceFields[def.key] || ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const sanitized = raw.replace(/[^0-9]/g, '')
                      setComplianceFields(f => ({ ...f, [def.key]: sanitized }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder={def.label}
                  />
                ) : def.inputType === 'year' ? (
                  <input
                    id={`compliance-${def.key}`}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={complianceFields[def.key] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setComplianceFields(f => ({ ...f, [def.key]: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder="e.g., 2023"
                  />
                ) : (
                  <input
                    id={`compliance-${def.key}`}
                    type="text"
                    value={complianceFields[def.key] || ''}
                    onChange={(e) => {
                      const val = def.toUpper ? e.target.value.toUpperCase() : e.target.value
                      setComplianceFields(f => ({ ...f, [def.key]: val }))
                    }}
                    className="w-full border rounded px-3 py-2 mt-1"
                    placeholder={def.label}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComplianceDialogOpen(false)}>Cancel</Button>
              <Button 
                className="bg-[#1976D2] hover:bg-[#1565C0] text-white"
                disabled={(() => {
                  if (complianceSubmitting) return true
                  const missingRequired = getComplianceFieldDefs(selectedComplianceType).some(d => d.required && !String(complianceFields[d.key] || '').trim())
                  if (missingRequired) {
                    console.log('Missing required fields:', getComplianceFieldDefs(selectedComplianceType).filter(d => d.required && !String(complianceFields[d.key] || '').trim()))
                    return true
                  }
                  // Extra check: arrival must not be in the future
                  const arrival = complianceFields['dateArrival']
                  if (arrival && arrival > todayIso) return true
                  // For Assessment Country: employment start date not in the future
                  const empStart = complianceFields['employmentStartDate']
                  if (empStart && empStart > todayIso) return true
                  return false
                })()}
                onClick={async () => {
                  if (!selected?.id) return
                  setComplianceSubmitting(true)
                  try {
                    // Prepare metadata for generation
                    const toLongDate = (d: string) => {
                      try { 
                        const date = new Date(d)
                        const day = date.getDate()
                        const month = date.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase()
                        const year = date.getFullYear()
                        return `${day} ${month} ${year}`
                      } catch { return d }
                    }
                    let fieldsPayload: Record<string, string> = {}
                    if (selectedComplianceType === 'critical_skill') {
                      const fromDate = complianceFields['employmentDurationFrom'] || ''
                      const untilDate = complianceFields['employmentDurationUntil'] || ''
                      const formatLongDate = (dateStr: string) => {
                        try {
                          const date = new Date(dateStr)
                          return date.toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }).toUpperCase()
                        } catch {
                          return dateStr
                        }
                      }
                      const employmentDurationText = fromDate && untilDate ? 
                        `${formatLongDate(fromDate)} TO ${formatLongDate(untilDate)}` : ''
                      
                      fieldsPayload = {
                        new_principal_name: (complianceFields['principalName'] || '').toString().toUpperCase(),
                        employment_duration: employmentDurationText,
                        date_arrival: complianceFields['dateArrival'] || '',
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_arrival_long: complianceFields['dateArrival'] ? toLongDate(complianceFields['dateArrival']) : '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                        remarks: (complianceFields['remarks'] || '').toString().toUpperCase(),
                      }
                    } else if (selectedComplianceType === 'for_assessment_country') {
                      const years = parseInt(complianceFields['monthsYearsYears'] || '0', 10) || 0
                      const months = parseInt(complianceFields['monthsYearsMonths'] || '0', 10) || 0
                      const monthsYearsText = `${years} YEAR${years === 1 ? '' : 'S'} ${months} MONTH${months === 1 ? '' : 'S'}`.toUpperCase()
                      fieldsPayload = {
                        months_years: monthsYearsText,
                        employment_start_date: complianceFields['employmentStartDate'] || '',
                        employment_start_date_long: complianceFields['employmentStartDate'] ? toLongDate(complianceFields['employmentStartDate']) : '',
                        processing_date: complianceFields['dateProcessed'] || '',
                        processing_date_long: complianceFields['dateProcessed'] ? toLongDate(complianceFields['dateProcessed']) : '',
                      }
                    } else if (selectedComplianceType === 'seafarer_position') {
                      const fromDate = complianceFields['employmentDurationFrom'] || ''
                      const untilDate = complianceFields['employmentDurationUntil'] || ''
                      const formatLongDate = (dateStr: string) => {
                        try {
                          const date = new Date(dateStr)
                          return date.toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }).toUpperCase()
                        } catch {
                          return dateStr
                        }
                      }
                      const employmentDurationText = fromDate && untilDate ? 
                        `${formatLongDate(fromDate)} TO ${formatLongDate(untilDate)}` : ''
                      
                      fieldsPayload = {
                        new_principal_name: (complianceFields['principalName'] || '').toString().toUpperCase(),
                        employment_duration: employmentDurationText,
                        date_arrival: complianceFields['dateArrival'] || '',
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_arrival_long: complianceFields['dateArrival'] ? toLongDate(complianceFields['dateArrival']) : '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                        remarks: (complianceFields['remarks'] || '').toString().toUpperCase(),
                      }
                    } else if (selectedComplianceType === 'watchlisted_employer') {
                      const placeEmployment = (complianceFields['placeEmployment'] || '').toString().toUpperCase()
                      const dateEmployment = complianceFields['dateEmployment'] || ''
                      const placeDateEmployment = placeEmployment && dateEmployment ? `${placeEmployment} / ${dateEmployment}` : ''
                      
                      const totalDeployed = (complianceFields['totalDeployedOfws'] || '').toString()
                      
                      fieldsPayload = {
                        place_date_employment: placeDateEmployment,
                        total_deployed_ofws: totalDeployed, // Store only the number
                        date_blacklisting: complianceFields['dateBlacklisting'] || '',
                        date_blacklisting_long: complianceFields['dateBlacklisting'] ? toLongDate(complianceFields['dateBlacklisting']) : '',
                        reason_blacklisting: (complianceFields['reasonBlacklisting'] || '').toString().toUpperCase(),
                        years_with_principal: (complianceFields['yearsWithPrincipal'] || '').toString(),
                        date_of_arrival: complianceFields['dateArrival'] || '',
                        date_of_arrival_long: complianceFields['dateArrival'] ? toLongDate(complianceFields['dateArrival']) : '',
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                        remarks: (complianceFields['remarks'] || '').toString().toUpperCase(),
                      }
                    } else if (selectedComplianceType === 'watchlisted_similar_name') {
                      fieldsPayload = {
                        active_email_address: (complianceFields['activeEmailAddress'] || '').toString(),
                        active_ph_mobile_number: (complianceFields['activePhMobileNumber'] || '').toString(),
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                        remarks: (complianceFields['remarks'] || '').toString().toUpperCase(),
                      }
                    } else if (selectedComplianceType === 'no_verified_contract') {
                      const fromDate = complianceFields['employmentDurationFrom'] || ''
                      const untilDate = complianceFields['employmentDurationUntil'] || ''
                      const employmentDuration = fromDate && untilDate ? `${toLongDate(fromDate)} TO ${toLongDate(untilDate)}` : ''
                      
                      fieldsPayload = {
                        new_principal_name: (complianceFields['principalName'] || '').toString().toUpperCase(),
                        employment_duration: employmentDuration,
                        date_arrival: complianceFields['dateArrival'] || '',
                        date_arrival_long: complianceFields['dateArrival'] ? toLongDate(complianceFields['dateArrival']) : '',
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                        remarks: (complianceFields['remarks'] || '').toString().toUpperCase(),
                      }
                    } else if (selectedComplianceType === 'non_compliant_country') {
                      const years = parseInt(complianceFields['monthsYearsYears'] || '0', 10) || 0
                      const months = parseInt(complianceFields['monthsYearsMonths'] || '0', 10) || 0
                      const monthsYearsText = `${years} YEAR${years === 1 ? '' : 'S'} ${months} MONTH${months === 1 ? '' : 'S'}`.toUpperCase()
                      fieldsPayload = {
                        months_years: monthsYearsText,
                        employment_start_date: complianceFields['employmentStartDate'] || '',
                        employment_start_date_long: complianceFields['employmentStartDate'] ? toLongDate(complianceFields['employmentStartDate']) : '',
                        processing_date: complianceFields['dateProcessed'] || '',
                        processing_date_long: complianceFields['dateProcessed'] ? toLongDate(complianceFields['dateProcessed']) : '',
                        date_arrival: complianceFields['dateArrival'] || '',
                        date_arrival_long: complianceFields['dateArrival'] ? toLongDate(complianceFields['dateArrival']) : '',
                        date_departure: complianceFields['dateDeparture'] || '',
                        date_departure_long: complianceFields['dateDeparture'] ? toLongDate(complianceFields['dateDeparture']) : '',
                      }
                    } else {
                      // Default mapping for other types; extend as needed
                      fieldsPayload = {
                        remarks: (complianceFields['remarks'] || '').toString(),
                      }
                    }
                    const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, { 
                      method: 'PATCH', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({ 
                        action: 'status_update', 
                        status: 'for_clearance', 
                        clearanceType: selectedComplianceType,
                        metadata: fieldsPayload
                      }) 
                    })
                    const json = await res.json()
                    if (json.success) {
                      const gen = await fetch(`/api/balik-manggagawa/clearance/${selected.id}/generate`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clearanceType: selectedComplianceType,
                          fields: fieldsPayload,
                          fileName: getComplianceTitle(selectedComplianceType)
                        })
                      })
                      const gj = await gen.json()
                      if (gj.success) {
                        const clearanceTypeName = getComplianceTitle(selectedComplianceType)
                        toast({ title: 'Updated', description: `Set to For Compliance and ${clearanceTypeName} document generated` })
                        // Refresh documents in the view modal
                        setDocumentsRefreshTrigger(prev => prev + 1)
                      } else {
                        const clearanceTypeName = getComplianceTitle(selectedComplianceType)
                        toast({ title: 'Updated', description: `Set to For Compliance (${clearanceTypeName} document generation failed)`, variant: 'destructive' })
                      }
                      setComplianceDialogOpen(false)
                      fetchClearances(getCurrentFilters())
                    } else {
                      toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                  } finally {
                    setComplianceSubmitting(false)
                  }
                }}
              >
                {complianceSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 