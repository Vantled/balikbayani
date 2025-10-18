// app/balik-manggagawa/page.tsx
"use client"

import Header from "@/components/shared/header"
import { useBalikManggagawaClearance } from "@/hooks/use-balik-manggagawa-clearance"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, Search, Plus, MoreHorizontal, Eye, Edit, Trash2, FileText, Settings, Download, Loader2 } from "lucide-react"
import DocumentViewerModal from "@/components/pdf-viewer-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { AVAILABLE_CURRENCIES, getUSDEquivalentAsync, type Currency } from "@/lib/currency-converter"
import { useCallback, useRef } from "react"

function BMDocumentsSection({ 
  applicationId, 
  refreshTrigger
}: { 
  applicationId?: string
  refreshTrigger?: number
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
          <DropdownMenuItem onClick={() => handleEdit(doc)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Name
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
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
  const [filters, setFilters] = useState({
    clearanceType: "",
    sex: "",
    dateFrom: "",
    dateTo: "",
    jobsite: "",
    position: "",
    showDeletedOnly: false,
  })

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
  })
  const [controlPreview, setControlPreview] = useState("")
  const [creating, setCreating] = useState(false)
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
  const [editUsdDisplay, setEditUsdDisplay] = useState<string>("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)

  useEffect(() => {
    fetchClearances({ page: 1, limit: 10 })
  }, [fetchClearances])

  const applyFilters = () => {
    fetchClearances({
      page: 1,
      limit: pagination.limit,
      search,
      clearanceType: filters.clearanceType,
      sex: filters.sex,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      jobsite: filters.jobsite,
      position: filters.position,
      showDeletedOnly: filters.showDeletedOnly,
    })
    setShowFilter(false)
  }
  
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

  const resetFilters = () => {
    setFilters({ clearanceType: "", sex: "", dateFrom: "", dateTo: "", jobsite: "", position: "", showDeletedOnly: false })
    fetchClearances({ page: 1, limit: pagination.limit, search: "" })
    setSearch("")
    setShowFilter(false)
  }

  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa</h2>
            <p className="text-sm text-gray-600 mt-1">Manage BM clearances</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e)=> { if (e.key === 'Enter') applyFilters() }}
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

            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-1">Type of Clearance</div>
                <Select value={filters.clearanceType || 'all'} onValueChange={(v)=> setFilters(f=>({ ...f, clearanceType: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="for_assessment_country">For Assessment Country</SelectItem>
                    <SelectItem value="non_compliant_country">Non Compliant Country</SelectItem>
                    <SelectItem value="watchlisted_similar_name">Watchlisted OFW</SelectItem>
                  </SelectContent>
                </Select>

                <div className="font-semibold mb-1">Sex</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_filter"
                      value="female"
                      checked={filters.sex === 'female'}
                      onChange={() => setFilters(f=>({ ...f, sex: 'female' }))}
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_filter"
                      value="male"
                      checked={filters.sex === 'male'}
                      onChange={() => setFilters(f=>({ ...f, sex: 'male' }))}
                    />
                    Male
                  </label>
                  <Button variant="ghost" size="sm" onClick={()=> setFilters(f=>({ ...f, sex: '' }))}>Clear</Button>
                </div>

                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" value={filters.dateFrom} onChange={(e)=> setFilters(f=>({ ...f, dateFrom: e.target.value }))} />
                <Input type="date" className="mb-2" value={filters.dateTo} onChange={(e)=> setFilters(f=>({ ...f, dateTo: e.target.value }))} />
                <div className="font-semibold mb-1">Destination</div>
                <Input type="text" className="mb-2" value={filters.jobsite} onChange={(e)=> setFilters(f=>({ ...f, jobsite: e.target.value }))} />
                <div className="font-semibold mb-1">Position</div>
                <Input type="text" className="mb-2" value={filters.position} onChange={(e)=> setFilters(f=>({ ...f, position: e.target.value }))} />

              <div className="flex items-center gap-2 mt-1">
                <input
                  id="bm_show_deleted_only"
                  type="checkbox"
                  checked={filters.showDeletedOnly}
                  onChange={(e)=> setFilters(f=>({ ...f, showDeletedOnly: e.target.checked }))}
                />
                <label htmlFor="bm_show_deleted_only" className="text-xs">Show deleted only</label>
              </div>

                <div className="flex justify-between gap-2 mt-2">
                  <Button variant="outline" className="w-1/2" onClick={resetFilters}>Clear</Button>
                  <Button className="w-1/2 bg-[#1976D2] text-white" onClick={applyFilters}>Apply</Button>
                </div>
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
                const go = (p: number) => fetchClearances({
                  page: p,
                  limit: pagination.limit,
                  search,
                  clearanceType: filters.clearanceType,
                  sex: filters.sex,
                  dateFrom: filters.dateFrom,
                  dateTo: filters.dateTo,
                  jobsite: filters.jobsite,
                  position: filters.position,
                  showDeletedOnly: filters.showDeletedOnly,
                })

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
                  <tr key={row.id ?? i} className="hover:bg-gray-150 transition-colors duration-75">
                    <td className="py-3 px-4 text-center">{row.control_number || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-center">{row.name_of_worker}</td>
                    <td className="py-3 px-4 text-center">{(row.sex || '').toUpperCase()}</td>
                    <td className="py-3 px-4 text-center">{row.destination}</td>
                    <td className="py-3 px-4 text-center">{row.employer || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        {(() => {
                          const s = (row.status || '').toString()
                          const label = s === 'for_clearance' ? 'For Compliance' : s === 'for_approval' ? 'For Approval' : s === 'approved' ? 'Approved' : (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending')
                          const color = s === 'finished' ? 'bg-green-50 text-green-700 ring-green-200' : s === 'approved' ? 'bg-green-100 text-green-800 ring-green-200' : (s === 'for_clearance' ? 'bg-blue-50 text-blue-700 ring-blue-200' : (s === 'for_approval' ? 'bg-blue-100 text-blue-800 ring-blue-200' : (s === 'rejected' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-[#FFF3E0] text-[#F57C00] ring-[#FFE0B2]')))
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ${color} font-medium`}>
                                  <span className="font-medium">{label}</span>
                                  <Settings className="h-3.5 w-3.5 text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-fit min-w-48 max-w-64">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>For Compliance</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'critical_skill' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Critical Skills and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Critical Skills (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>Critical Skills</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'for_assessment_country' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - For Assessment Country and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - For Assessment Country (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>For Assessment Country</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'non_compliant_country' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Non Compliant Country and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Non Compliant Country (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>Non Compliant Country</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'seafarer_position' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Seafarer Position and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Seafarer Position (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>Seafarer Position</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'watchlisted_employer' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Watchlisted Employer and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Watchlisted Employer (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>Watchlisted Employer</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'for_clearance', clearanceType: 'watchlisted_similar_name' }) })
                                        const json = await res.json()
                                        if (json.success) {
                                          // Generate document
                                          const gen = await fetch(`/api/balik-manggagawa/clearance/${row.id}/generate`, { method: 'POST' })
                                          const gj = await gen.json()
                                          if (gj.success) {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Watchlisted OFW and document generated' })
                                          } else {
                                            toast({ title: 'Updated', description: 'Set to For Compliance - Watchlisted OFW (document generation failed)', variant: 'destructive' })
                                          }
                                          fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                        } else {
                                          toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                        }
                                      } catch {
                                        toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                      }
                                    }}>Watchlisted OFW</DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem className="text-green-600" onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'approved', clearanceType: null }) })
                                    const json = await res.json()
                                    if (json.success) {
                                      toast({ title: 'Updated', description: 'Marked as Approved' })
                                      fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                    } else {
                                      toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                    }
                                  } catch {
                                    toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                  }
                                }}>Approved</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status_update', status: 'rejected', clearanceType: null }) })
                                    const json = await res.json()
                                    if (json.success) {
                                      toast({ title: 'Updated', description: 'Marked as Rejected/Denied' })
                                      fetchClearances({ page: pagination.page, limit: pagination.limit, search, clearanceType: filters.clearanceType, sex: filters.sex, dateFrom: filters.dateFrom, dateTo: filters.dateTo, jobsite: filters.jobsite, position: filters.position, showDeletedOnly: filters.showDeletedOnly })
                                    } else {
                                      toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                                    }
                                  } catch {
                                    toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
                                  }
                                }}>Reject / Deny</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
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
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`)
                              const json = await res.json()
                              if (json.success) {
                                const d = json.data
                                setSelected(d)
                                setEditData({
                                  nameOfWorker: d.name_of_worker || '',
                                  sex: d.sex || '',
                                  employer: d.employer || '',
                                  destination: d.destination || '',
                                  position: d.position || '',
                                  salary: d.raw_salary != null ? String(d.raw_salary) : (d.salary != null ? String(d.salary) : ''),
                                  job_type: d.job_type || '',
                                  salaryCurrency: d.salary_currency || '',
                                })
                                setEditOpen(true)
                              } else {
                                toast({ title: 'Failed to load', description: json.error || 'Not found', variant: 'destructive' })
                              }
                            } catch {}
                          }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelected(row); setDeleteConfirmOpen(true) }} className="text-red-600 focus:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
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
      </main>

      {/* Create BM Clearance Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(o)=> { setIsCreateOpen(o); if (!o) { setFormData({ nameOfWorker: "", sex: "", employer: "", destination: "", salary: "", position: "", job_type: "", salaryCurrency: "" }); setControlPreview("") } }}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl w-[95vw]">
          <DialogTitle className="sr-only">Create BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Create BM Application</h2>
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
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=> setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-[#1976D2] text-white" disabled={creating} onClick={async ()=>{
                if (!formData.nameOfWorker || !formData.sex || !formData.destination || !formData.position) {
                  toast({ title: 'Missing fields', description: 'Please complete required fields.', variant: 'destructive' });
                  return;
                }
                setCreating(true)
                // Persist salary in USD; backend currently expects a number
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
                  // Optionally send additional context for future support
                  jobType: formData.job_type || undefined,
                  salaryCurrency: formData.salaryCurrency || undefined,
                }
                const res = await createClearance(payload)
                setCreating(false)
                if ((res as any)?.success) {
                  toast({ title: 'Created', description: 'BM clearance created successfully.' })
                  setIsCreateOpen(false)
                } else {
                  toast({ title: 'Error', description: (res as any)?.error || 'Failed to create', variant: 'destructive' })
                }
              }}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={(o)=> { setViewOpen(o); if (!o) setSelected(null) }}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden">
          <DialogTitle className="sr-only">View BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected?.name_of_worker ? `${selected.name_of_worker}'s BM Application` : 'View BM Application'}</h2>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="px-6 pt-3 pb-1">
            <h3 className="text-base font-semibold text-gray-700">Personal Information</h3>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={async () => {
                    if (!selected?.id) return
                    try {
                      const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}/generate`, { method: 'POST' })
                      const json = await res.json()
                      if (json.success) {
                        toast({ title: 'Generated', description: 'BM clearance document created' })
                      } else {
                        toast({ title: 'Generation failed', description: json.error || 'Failed to generate', variant: 'destructive' })
                      }
                    } catch {
                      toast({ title: 'Generation failed', description: 'Network error', variant: 'destructive' })
                    }
                  }}
                >Generate Clearance</Button>
                <Button
                  className="bg-[#1976D2] text-white text-xs"
                  onClick={() => setUploadModalOpen(true)}
                >+ New</Button>
              </div>
            </div>
            <BMDocumentsSection 
              applicationId={selected?.id} 
              refreshTrigger={documentsRefreshTrigger}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={(o)=> { setEditOpen(o); if (!o) { setSelected(null); setEditSaving(false) } }}>
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
                  // Calculate USD equivalent for salary
                  const numericSalary = editData.salary !== '' ? Number(editData.salary) : 0
                  const salaryUsd = editData.salaryCurrency && numericSalary
                    ? (editData.salaryCurrency === 'USD' ? numericSalary : Number((await getUSDEquivalentAsync(numericSalary, editData.salaryCurrency)).replace(/[^0-9.]/g, '')))
                    : numericSalary

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
                    fetchClearances({ page: pagination.page, limit: pagination.limit, search })
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
                  toast({ title: 'Deleted', description: 'Clearance moved to trash (soft delete).' })
                  setDeleteConfirmOpen(false)
                  fetchClearances({ page: pagination.page, limit: pagination.limit })
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
    </div>
  )
} 