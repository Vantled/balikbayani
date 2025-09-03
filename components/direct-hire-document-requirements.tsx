// components/direct-hire-document-requirements.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Circle, Upload, FileText, Eye, AlertCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import DocumentViewerModal from "@/components/pdf-viewer-modal"

interface DirectHireDocumentRequirementsProps {
  applicationId: string
  currentStatus: string
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (newStatus: string) => void
}

interface DocumentRequirement {
  key: string
  label: string
  description?: string
  required: boolean
  checked: boolean
  file: File | null
  fileName?: string
  fileId?: string
  // Optional metadata fields for specific documents
  meta?: Record<string, string>
}

const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'Validity period of not less than 1 year (POEA Advisory 42, series of 2019)',
    required: true,
    checked: false,
    file: null
  },
  {
    key: 'work_visa',
    label: 'Valid Work Visa, Entry/Work Permit',
    description: 'Whichever is applicable per country',
    required: true,
    checked: false,
    file: null
  },
  {
    key: 'employment_contract',
    label: 'Employment Contract or Offer of Employment',
    description: 'Original copy and verified by POLO/PE/Consulate/Apostille/Notarized/Notice of Appointment.',
    required: true,
    checked: false,
    file: null
  },
  {
    key: 'country_specific',
    label: 'Additional country-specific requirements',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'tesda_license',
    label: 'TESDA NC II/PRC License',
    required: true,
    checked: false,
    file: null
  },
  {
    key: 'compliance_form',
    label: 'Compliance Form',
    description: 'Print from MWPS-Direct if necessary',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'medical_certificate',
    label: 'Valid Medical Certificate',
    description: 'DOH-accredited medical clinic authorized to conduct medical exam for OFWs.',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'peos_certificate',
    label: 'Pre-Employment Orientation Seminar Certificate (PEOS)',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'clearance',
    label: 'Clearance',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'insurance_coverage',
    label: 'Proof of certificate of insurance coverage',
    description: 'Covering at least the benefits provided under Section 37-A of R.A. 8042 as amended.',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'eregistration',
    label: 'E-Registration Account',
    description: 'Print from MWPS-Direct Registration Form',
    required: false,
    checked: false,
    file: null
  },
  {
    key: 'pdos_certificate',
    label: 'Pre-Departure Orientation Seminar',
    description: 'Issued by OWWA.',
    required: false,
    checked: false,
    file: null
  }
]

export default function DirectHireDocumentRequirements({
  applicationId,
  currentStatus,
  isOpen,
  onClose,
  onStatusUpdate
}: DirectHireDocumentRequirementsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [localRequirements, setLocalRequirements] = useState<DocumentRequirement[]>(DOCUMENT_REQUIREMENTS)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [verificationDialog, setVerificationDialog] = useState({
    open: false,
    documentType: '',
    file: null as File | null
  })
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean, documentType: string, file: File | null, meta: Record<string,string> }>({ open: false, documentType: '', file: null, meta: {} })
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{id?: string, name: string, fileBlob?: File | null} | null>(null)

  const shortenFileName = (name?: string, max: number = 16) => {
    if (!name) return ''
    const dot = name.lastIndexOf('.')
    const ext = dot > 0 ? name.slice(dot) : ''
    const base = dot > 0 ? name.slice(0, dot) : name
    if (base.length <= max) return name
    const keep = Math.max(4, max - 3)
    return `${base.slice(0, keep)}…${ext}`
  }

  // Load existing document data when component opens
  useEffect(() => {
    if (isOpen && applicationId) {
      loadExistingDocuments()
    }
  }, [isOpen, applicationId])

  const loadExistingDocuments = async () => {
    try {
      // Use unified documents API so they show up in Applicant Details
      const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const updatedRequirements = localRequirements.map(req => {
            const existingDoc = (result.data as any[]).find((doc: any) => doc.document_type === req.key)
            if (existingDoc) {
              return {
                ...req,
                checked: true,
                fileName: existingDoc.file_name,
                fileId: existingDoc.id
              }
            }
            return req
          })
          setLocalRequirements(updatedRequirements)
        }
      }
    } catch (error) {
      console.error('Failed to load existing documents:', error)
    }
  }

  const handleFileSelect = (documentType: string, file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid file format', 
        description: 'Please upload only JPEG, PNG, or PDF files.',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({ 
        title: 'File too large', 
        description: 'Please upload files smaller than 5MB.',
        variant: 'destructive'
      })
      return
    }

    setVerificationDialog({ open: true, documentType, file })
  }

  const handleFileUpload = async (documentType: string, file: File, metaOverride?: Record<string, any>) => {
    try {
      // Use unified documents upload API that supports metadata so storage is centralized
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicationId', applicationId)
      formData.append('applicationType', 'direct_hire')
      // API expects documentName
      formData.append('documentName', documentType)
      // include optional metadata
      const req = localRequirements.find(r => r.key === documentType)
      const meta = metaOverride ?? req?.meta
      if (meta) {
        formData.append('meta', JSON.stringify(meta))
      }

      const response = await fetch(`/api/documents/upload`, { method: 'POST', body: formData })

      const result = await response.json()

      if (result.success && result.data) {
        setLocalRequirements(prev => 
          prev.map(req => 
            req.key === documentType 
              ? { ...req, file, checked: true, fileName: result.data.file_name || file.name, fileId: result.data.id, meta: metaOverride ? { ...(req.meta||{}), ...metaOverride } : req.meta }
              : req
          )
        )
        toast({ 
          title: 'Document uploaded successfully', 
          description: `${file.name} has been uploaded and attached.` 
        })
        // Refresh existing documents to ensure consistency
        await loadExistingDocuments()
      } else {
        toast({ 
          title: 'Upload failed', 
          description: result.error || 'Failed to upload document',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({ 
        title: 'Upload failed', 
        description: 'Failed to upload document',
        variant: 'destructive'
      })
    }
  }

  // Helper: determine if a document has extra fields
  const documentHasFields = (key: string) => ['passport', 'work_visa', 'employment_contract'].includes(key)

  const validateAndPrepareFile = (file: File | null): string | null => {
    if (!file) return 'Please choose a file'
    const allowed = ['image/jpeg','image/jpg','image/png','application/pdf']
    if (!allowed.includes(file.type)) return 'Invalid file format (use JPG, PNG, or PDF)'
    if (file.size > 5 * 1024 * 1024) return 'File too large (max 5MB)'
    return null
  }

  const openUploadModal = (documentType: string) => {
    setUploadDialog({ open: true, documentType, file: null, meta: {} })
  }

  const submitUploadModal = async () => {
    const err = validateAndPrepareFile(uploadDialog.file)
    if (err) {
      toast({ title: 'Upload error', description: err, variant: 'destructive' })
      return
    }
    // Pass meta directly to upload to avoid race with state updates
    await handleFileUpload(uploadDialog.documentType, uploadDialog.file as File, uploadDialog.meta)
    setUploadDialog({ open: false, documentType: '', file: null, meta: {} })
  }

  const handleCheckboxChange = (documentType: string, checked: boolean) => {
    const requirement = localRequirements.find(req => req.key === documentType)
    if (!requirement) return

    if (checked && !requirement.file && !requirement.fileName) {
      toast({ 
        title: 'Document required', 
        description: 'Please attach a document before checking this item.',
        variant: 'destructive'
      })
      return
    }
    
    setLocalRequirements(prev => 
      prev.map(req => 
        req.key === documentType 
          ? { ...req, checked }
          : req
      )
    )
    
    if (checked) {
      toast({ title: 'Document verified', description: 'Document has been marked as submitted.' })
    }
  }

  const confirmVerification = () => {
    if (verificationDialog.file && verificationDialog.documentType) {
      handleFileUpload(verificationDialog.documentType, verificationDialog.file)
    }
    setVerificationDialog({ open: false, documentType: '', file: null })
  }

  const cancelVerification = () => {
    setVerificationDialog({ open: false, documentType: '', file: null })
  }

  const handleViewDocument = (documentType: string) => {
    const requirement = localRequirements.find(req => req.key === documentType)
    if (requirement && (requirement.file || requirement.fileName)) {
      setSelectedDocument({
        id: requirement.fileId,
        name: requirement.fileName || requirement.file?.name || 'Document',
        fileBlob: requirement.file
      })
      setPdfViewerOpen(true)
    }
  }

  const checkRequirementsCompletion = () => {
    const requiredRequirements = localRequirements.filter(req => req.required)
    const completedRequired = requiredRequirements.filter(req => req.checked).length
    const totalRequired = requiredRequirements.length
    
    return {
      completed: completedRequired,
      total: totalRequired,
      isComplete: completedRequired === totalRequired
    }
  }

  const handleSave = async () => {
    const completion = checkRequirementsCompletion()
    
    if (!completion.isComplete) {
      toast({
        title: "Requirements incomplete",
        description: `Please complete all required documents (${completion.completed}/${completion.total}) before proceeding.`,
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Update application to mark documents as completed
      const response = await fetch(`/api/direct-hire/${applicationId}/documents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentsCompleted: true,
          completedAt: new Date().toISOString()
        })
      })

      const result = await response.json()

      if (result.success) {
        // Generate and attach the evaluation requirements checklist
        try {
          await fetch(`/api/direct-hire/${applicationId}/evaluation-checklist`, { method: 'POST' })
        } catch {}
        toast({
          title: "Document Requirements Complete",
          description: "All required documents have been uploaded and verified. You can now mark the application as evaluated."
        })
        onStatusUpdate('evaluated')
        onClose()
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update documents",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update documents",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const completion = checkRequirementsCompletion()
  const totalOptional = localRequirements.filter(r=>!r.required).length
  const completedOptional = localRequirements.filter(r=>!r.required && r.checked).length
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
 
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span>Document Checklist</span>
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                {completion.completed}/{completion.total} Required
              </span>
            </DialogTitle>
          </div>

          <div className="px-8 py-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="text-sm text-gray-600 mb-4">
              Please upload and verify all required documents. Supported formats: JPEG, PNG, PDF (Max 5MB each)
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                Evaluated {completion.completed}/{completion.total} required documents | {completedOptional}/{totalOptional} optional documents
              </div>
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 bg-[#1976D2] rounded" style={{ width: `${Math.round(((completion.completed + completedOptional) / (completion.total + totalOptional)) * 100)}%` }} />
              </div>
            </div>

            {localRequirements.map((requirement) => {
              const inputId = `upload-${requirement.key}`
              return (
              <div key={requirement.key} className="relative flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <Checkbox 
                    checked={requirement.checked}
                    onCheckedChange={(checked) => handleCheckboxChange(requirement.key, checked as boolean)}
                    disabled={!requirement.file && !requirement.fileName}
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {requirement.label}
                      {requirement.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {!requirement.required && (
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      )}
                    </div>
                    {requirement.description && (
                      <div className="text-sm text-gray-500 mt-1">{requirement.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-4 w-64">
                  <div className="flex items-center space-x-2">
                  {(requirement.file || requirement.fileName) && (
                    <div className="flex items-center space-x-1 text-green-600" title={requirement.fileName || requirement.file?.name}>
                      <FileText className="h-4 w-4" />
                      <span className="text-xs truncate max-w-[120px]">
                        {shortenFileName(requirement.fileName || requirement.file?.name)}
                      </span>
                    </div>
                  )}
                  
                  <input
                    id={inputId}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(requirement.key, file)
                      // Reset value to allow re-uploading the same filename
                      ;(e.target as HTMLInputElement).value = ''
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      if (documentHasFields(requirement.key)) {
                        openUploadModal(requirement.key)
                      } else {
                        const el = document.getElementById(inputId) as HTMLInputElement | null
                        el?.click()
                      }
                    }}
                    aria-label={`Upload ${requirement.label}`}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>

                  {(requirement.file || requirement.fileName) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(requirement.key)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  </div>
                  {/* For docs with fields, inputs will appear in a separate modal */}
                </div>
              </div>
            )})}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
               <Button 
                onClick={() => setConfirmCompleteOpen(true)}
                disabled={loading}
                className="bg-[#1976D2] hover:bg-[#1565C0]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {completion.isComplete ? 'Finish' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Complete Requirements */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm completion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            {completion.isComplete
              ? 'All required documents are present. Proceed to finalize and generate the checklist?'
              : 'Save current progress on documents? You can come back to complete the remaining requirements.'}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=>setConfirmCompleteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmCompleteOpen(false); handleSave(); }}>{completion.isComplete ? 'Finish' : 'Update'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Verification Dialog */}
      <AlertDialog open={verificationDialog.open} onOpenChange={() => setVerificationDialog({ open: false, documentType: '', file: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upload "{verificationDialog.file?.name}" for this document requirement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelVerification}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification}>Upload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload With Fields Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => setUploadDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload {uploadDialog.documentType.replace('_',' ')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setUploadDialog(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
            />
            {uploadDialog.documentType === 'passport' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Passport Number *
                  </label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2" 
                    placeholder="Enter passport number"
                    value={uploadDialog.meta.passport_number || ''}
                    onChange={(e) => setUploadDialog(p => ({
                      ...p, 
                      meta: { ...p.meta, passport_number: e.target.value.toUpperCase() }
                    }))}
                    pattern="[A-Z0-9]*"
                    title="Only alphanumeric characters allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiry Date *
                  </label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={uploadDialog.meta.passport_expiry || ''}
                    onChange={(e) => setUploadDialog(p => ({
                      ...p, 
                      meta: { ...p.meta, passport_expiry: e.target.value }
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
            {uploadDialog.documentType === 'work_visa' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Visa Type *
                  </label>
                  <div className="space-y-2">
                    <select 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={uploadDialog.meta.visa_category || ''}
                      onChange={(e) => {
                        setUploadDialog(p => ({
                          ...p, 
                          meta: { 
                            ...p.meta, 
                            visa_category: e.target.value,
                            visa_type: '' // Reset visa type when category changes
                          }
                        }))
                      }}
                    >
                      <option value="">Select visa category</option>
                      <option value="temporary">Category 1: Temporary Work Visas (Non-Immigrant)</option>
                      <option value="immigrant">Category 2: Immigrant Work Visas (Employment-Based Green Cards)</option>
                      <option value="family">Category 3: Family / Dependent Visas</option>
                    </select>
                    
                    {uploadDialog.meta.visa_category && (
                      <select 
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={uploadDialog.meta.visa_type || ''}
                        onChange={(e) => setUploadDialog(p => ({
                          ...p, 
                          meta: { ...p.meta, visa_type: e.target.value }
                        }))}
                      >
                        <option value="">Select specific visa type</option>
                        
                        {uploadDialog.meta.visa_category === 'temporary' && (
                          <>
                            <option value="H-1B">H-1B – Skilled Workers / Professionals</option>
                            <option value="H-2A">H-2A – Temporary Agricultural Workers</option>
                            <option value="H-2B">H-2B – Temporary Non-Agricultural Workers</option>
                            <option value="H-3">H-3 – Trainees (non-medical, non-academic)</option>
                            <option value="L-1">L-1 – Intra-Company Transfers</option>
                            <option value="O-1">O-1 – Individuals with Extraordinary Ability</option>
                            <option value="P-1">P-1 – Athletes / Entertainers</option>
                            <option value="TN">TN – NAFTA/USMCA Professionals</option>
                          </>
                        )}
                        
                        {uploadDialog.meta.visa_category === 'immigrant' && (
                          <>
                            <option value="EB-1">EB-1 – Priority Workers (extraordinary ability, execs, researchers)</option>
                            <option value="EB-2">EB-2 – Professionals with Advanced Degrees / Exceptional Ability</option>
                            <option value="EB-3">EB-3 – Skilled Workers, Professionals, and Other Workers</option>
                            <option value="EB-4">EB-4 – Special Immigrants (religious, translators, etc.)</option>
                            <option value="EB-5">EB-5 – Immigrant Investors</option>
                          </>
                        )}
                        
                        {uploadDialog.meta.visa_category === 'family' && (
                          <>
                            <option value="H-4">H-4 – Dependents of H Visa Holders</option>
                            <option value="L-2">L-2 – Dependents of L-1 Holders</option>
                            <option value="K-1">K-1 – Fiancé(e) of U.S. Citizen</option>
                            <option value="IR/CR">IR/CR Categories – Immediate Relative Immigrant Visas</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Validity (Years) *
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="___ Year"
                    value={uploadDialog.meta.visa_validity || ''}
                    onChange={(e) => setUploadDialog(p => ({
                      ...p, 
                      meta: { ...p.meta, visa_validity: e.target.value }
                    }))}
                    min="1"
                    max="50"
                  />
                </div>
              </div>
            )}
            {uploadDialog.documentType === 'employment_contract' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Verification Method *
                  </label>
                  <select 
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={uploadDialog.meta.ec_verified_polo_check || ''}
                    onChange={(e) => setUploadDialog(p => ({
                      ...p, 
                      meta: { ...p.meta, ec_verified_polo_check: e.target.value }
                    }))}
                  >
                    <option value="">Select verification method</option>
                    <option value="POLO">POLO</option>
                    <option value="PE/Consulate for countries with no POLO">PE/Consulate for countries with no POLO</option>
                    <option value="Apostille with POLO Verification">Apostille with POLO Verification</option>
                    <option value="Apostille with PE Acknowledgement">Apostille with PE Acknowledgement</option>
                    <option value="Notarized Employment Contract for DFA">Notarized Employment Contract for DFA</option>
                    <option value="Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients">Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients</option>
                    <option value="Employment Contract with confirmation from SEM">Employment Contract with confirmation from SEM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Issued Date *
                  </label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={uploadDialog.meta.ec_issued_date || ''}
                    onChange={(e) => setUploadDialog(p => ({
                      ...p, 
                      meta: { ...p.meta, ec_issued_date: e.target.value }
                    }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setUploadDialog({ open:false, documentType:'', file:null, meta:{} })}>Cancel</Button>
              <Button onClick={submitUploadModal}>Upload</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      <DocumentViewerModal
        isOpen={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documentId={selectedDocument?.id}
        documentName={selectedDocument?.name || 'Document'}
        fileBlob={selectedDocument?.fileBlob}
      />
    </>
  )
}
