"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, FileText, Loader2, Calculator } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { convertToUSD, getUSDEquivalent, getUSDEquivalentAsync, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { getUser } from "@/lib/auth"
import React from "react"

// Import extracted utilities
import { 
  FormData as FormDataType, 
  DocMetadata, 
  DocFiles, 
  getMinDate, 
  getMaxDate, 
  getPassportMinDate, 
  getVisaValidityMinDate,
  validateForm,
  validateDraftForm,
  getMissingFields,
  getFieldErrors,
  getDocumentMetadataErrors,
  validateFormWithMissingFields
} from "@/utils/formValidation"
import { 
  handleDragOver, 
  handleDragLeave, 
  handleDrop, 
  handlePasteFromClipboard, 
  checkClipboardSupport,
  validateVisaNumber
} from "@/utils/fileHandling"
import { 
  generateControlNumberPreview,
  uploadSelectedDocuments,
  generateDirectHireClearance
} from "@/utils/apiHelpers"
import { 
  getChangedFormData, 
  getChangedDocMetadata, 
  getNewDocumentUploads, 
  getFormDocumentType 
} from "@/utils/changeDetection"
import { 
  DocumentUploadItem, 
  PassportUploadItem, 
  WorkVisaUploadItem, 
  EmploymentContractUploadItem 
} from "@/components/forms/DocumentUploadItem"


interface CreateApplicationModalProps {
  onClose: () => void
  initialData?: {
    id?: string
    name?: string
    sex?: 'male' | 'female'
    job_type?: 'household' | 'professional'
    jobsite?: string
    position?: string
    salary?: number
    control_number?: string
    status?: string
    status_checklist?: any
  } | null
  applicationId?: string | null
  onSuccess?: () => void
}



export default function CreateApplicationModal({ onClose, initialData = null, applicationId = null, onSuccess }: CreateApplicationModalProps) {

  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [documentMetadataErrors, setDocumentMetadataErrors] = useState<{[key: string]: string}>({})
  const { toast } = useToast()
  const { createApplication, updateApplication, refreshApplications } = useDirectHireApplications()
  
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    email: "",
    cellphone: "09",
    sex: "" as 'male' | 'female' | '',
    jobsite: "",
    position: "",
    job_type: "" as 'household' | 'professional' | '',
    salary: "",
    employer: "",
    salaryCurrency: "" as Currency | '',
    // New metadata fields
    processed_workers_principal: "",
    processed_workers_las: "",
    verifier_type: "" as 'MWO' | 'PEPCG' | 'OTHERS' | '',
    verifier_office: "",
    pe_pcg_city: "",
    others_text: "",
    verified_date: "",
    time_received: "",
    time_released: "",
  })

  // Tile navigation state
  const [activeTile, setActiveTile] = useState<'form1' | 'form2' | 'form3'>('form1')

  // Get current user for evaluator
  const currentUser = getUser()





  // Confirmation dialog states
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)

  // Custom close handler for update confirmation modal
  const handleCloseUpdateModal = () => {
    setUpdateConfirmOpen(false);
  };
  



  // Get converted USD amount for display
  const [usdDisplay, setUsdDisplay] = useState<string>("")
  const getUSDEquivalentDisplay = (): string => usdDisplay

  useEffect(() => {
    const compute = async () => {
      if (!formData.salary || isNaN(parseFloat(formData.salary)) || !formData.salaryCurrency) {
        setUsdDisplay("");
        return
      }
      const val = await getUSDEquivalentAsync(parseFloat(formData.salary), formData.salaryCurrency)
      setUsdDisplay(val)
    }
    compute()
  }, [formData.salary, formData.salaryCurrency])


  // Save draft function
  const handleSaveDraft = async () => {
    // Validate form first
    const validationErrors = validateDraftForm(formData);
    const fieldErrors = getFieldErrors(formData, true);
    
    if (validationErrors.length > 0) {
      // Set field-specific errors for visual indicators
      setValidationErrors(fieldErrors);
      
      // Show first error message
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // For drafts, save the raw salary and currency
      const rawSalary = formData.salary || '0';
      const salaryCurrency = formData.salaryCurrency || 'USD';

      if (applicationId) {
        // Save changes but keep as draft
        const updated = await updateApplication(applicationId, {
          name: formData.name.toUpperCase(),
          sex: formData.sex,
          jobsite: formData.jobsite.toUpperCase(),
          position: formData.position.toUpperCase(),
          job_type: formData.job_type,
          salary: parseFloat(rawSalary),
          raw_salary: parseFloat(rawSalary),
          salary_currency: salaryCurrency,
          employer: (formData.employer || '').toUpperCase(),
          evaluator: (currentUser?.full_name || 'Unknown').toUpperCase(),
          status: 'draft'
        })

        if (!updated) throw new Error('Failed to update draft')

        // Refresh list before showing toast
        await onSuccess?.()
        onClose();
        toast({
          title: 'Draft saved',
          description: `${formData.name} has been saved as a draft.`,
        });
        return;
      }

      // Create FormData for new draft (with files)
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.toUpperCase());
      if (formData.email) formDataToSend.append('email', formData.email);
      if (formData.cellphone) formDataToSend.append('cellphone', formData.cellphone);
      formDataToSend.append('sex', formData.sex);
      formDataToSend.append('salary', rawSalary);
      formDataToSend.append('salaryCurrency', salaryCurrency);
      formDataToSend.append('jobsite', formData.jobsite.toUpperCase());
      formDataToSend.append('position', formData.position.toUpperCase());
      formDataToSend.append('evaluator', (currentUser?.full_name || 'Unknown').toUpperCase());
      formDataToSend.append('status', 'draft');
      formDataToSend.append('employer', (formData.employer || '').toUpperCase());



      const response = await fetch('/api/direct-hire', { method: 'POST', body: formDataToSend });
      const result = await response.json();

      if (result.success) {
        // Refresh list before showing toast
        await onSuccess?.()
        onClose();
        toast({ title: 'Draft saved successfully!', description: `${formData.name} has been saved as a draft` });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ title: 'Error saving draft', description: 'Failed to save the draft. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setDraftConfirmOpen(false);
    }
  };


  // Clear error for a specific field when user starts typing
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Clear document metadata error for a specific field when user starts typing
  const clearDocumentMetadataError = (fieldName: string) => {
    setDocumentMetadataErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };











  useEffect(() => {
    const fetchPreview = async () => {
      const preview = await generateControlNumberPreview();
      setControlNumberPreview(preview);
    };
    fetchPreview();
    // Trigger enter animation
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, []);

  // Prefill time_received and time_released when form opens (for new applications only)
  useEffect(() => {
    if (mounted && !applicationId && !initialData) {
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
  }, [mounted, applicationId, initialData]);

  // Prefill form when editing a draft (only once per application id)
  const prefillKey = applicationId || (initialData as any)?.id || null
  const prefilledRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (initialData && prefillKey && prefilledRef.current !== prefillKey) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name ?? '',
        email: (initialData as any).email ?? '',
        cellphone: (initialData as any).cellphone ?? '',
        sex: initialData.sex ?? 'male',
        job_type: initialData.job_type ?? 'professional',
        jobsite: initialData.jobsite && initialData.jobsite !== 'To be filled' ? initialData.jobsite : '',
        position: initialData.position && initialData.position !== 'To be filled' ? initialData.position : '',
        salary: (initialData as any).raw_salary !== undefined && (initialData as any).raw_salary !== null
          ? String((initialData as any).raw_salary)
          : (initialData.salary !== undefined && initialData.salary !== null ? String(initialData.salary) : ''),
        salaryCurrency: (initialData as any).salary_currency ?? (initialData as any).salaryCurrency ?? '',
        employer: (initialData as any).employer ?? '',
        // raw salary is tracked server-side; do not mix converted values here
      }))
      prefilledRef.current = prefillKey
    }
  }, [initialData, prefillKey])

  // Fetch additional details and documents when editing
  useEffect(() => {
    const fetchEditData = async () => {
      if (applicationId) {
        try {
          // Fetch application details including status_checklist
          const response = await fetch(`/api/direct-hire/${applicationId}`)
          if (response.ok) {
            const appData = await response.json()
            const application = appData.data
            
            if (application) {
              // Parse status_checklist for additional details
              const statusChecklist = application.status_checklist || {}
              const interviewMeta = statusChecklist.for_interview_meta || {}
              const confirmationMeta = statusChecklist.for_confirmation_meta || {}
              
              
              // Build fresh form data to avoid mixing with previous state
              const hasRawSalary = application.raw_salary !== undefined && application.raw_salary !== null
              const rawSalaryNumber = hasRawSalary ? Number(application.raw_salary) : Number(application.salary ?? '')
              const salaryCurrencyCode = (application.salary_currency ?? '') as Currency

              const updatedFormData: typeof formData = {
                // Basic information
                name: application.name ?? '',
                email: application.email ?? '',
                cellphone: application.cellphone ?? '',
                sex: (application.sex ?? 'male') as 'male' | 'female',
                job_type: (application.job_type ?? 'professional') as 'household' | 'professional',
                jobsite: application.jobsite && application.jobsite !== 'To be filled' ? application.jobsite : '',
                position: application.position && application.position !== 'To be filled' ? application.position : '',
                salary: (rawSalaryNumber !== undefined && rawSalaryNumber !== null && !Number.isNaN(rawSalaryNumber)) ? String(rawSalaryNumber) : '',
                salaryCurrency: salaryCurrencyCode,
                employer: application.employer ?? '',
                // New metadata fields
                processed_workers_principal: (interviewMeta.processed_workers_principal !== null && interviewMeta.processed_workers_principal !== undefined) ? String(interviewMeta.processed_workers_principal) : '',
                processed_workers_las: (interviewMeta.processed_workers_las !== null && interviewMeta.processed_workers_las !== undefined) ? String(interviewMeta.processed_workers_las) : '',
                verifier_type: (confirmationMeta.verifier_type || '') as 'MWO' | 'PEPCG' | 'OTHERS' | '',
                verifier_office: confirmationMeta.verifier_office || '',
                pe_pcg_city: confirmationMeta.pe_pcg_city || '',
                others_text: confirmationMeta.others_text || '',
                verified_date: confirmationMeta.verified_date || '',
                time_received: application.time_received ? (() => {
                  const date = new Date(application.time_received);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })() : '',
                time_released: application.time_released ? (() => {
                  const date = new Date(application.time_released);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })() : '',
                // @ts-expect-error track raw_salary internally for comparison when present
                raw_salary: rawSalaryNumber || undefined
              }
              setFormData(updatedFormData)
              setOriginalFormData(updatedFormData)
              
              // Set evaluator for display
              setEvaluator(application.evaluator || 'Not assigned')
              
              // Fetch and populate documents
              const docsResponse = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
              if (docsResponse.ok) {
                const docsData = await docsResponse.json()
                const documents = docsData.data || []
                
                // Process documents and populate docMetadata
                const newDocMetadata: any = {
                  // Initialize all fields with empty values
                  passport_number: '',
                  passport_expiry: '',
                  visa_category: '',
                  visa_type: '',
                  visa_validity: '',
                  visa_number: '',
                  ec_issued_date: '',
                  ec_verification: '',
                  screenshot1_url: '',
                  screenshot2_url: '',
                }
                const newDocFiles: any = {}
                const screenshotDocIds: any = {}
                
                documents.forEach((doc: any) => {
                  const docType = doc.document_type
                  const meta = doc.meta ? (typeof doc.meta === 'string' ? JSON.parse(doc.meta) : doc.meta) : {}
                  
                  // Map document types to our form fields
                  if (docType === 'passport') {
                    newDocMetadata.passport_number = meta.passport_number || ''
                    newDocMetadata.passport_expiry = meta.passport_expiry || ''
                  } else if (docType === 'work_visa') {
                    newDocMetadata.visa_category = meta.visa_category || ''
                    newDocMetadata.visa_type = meta.visa_type || ''
                    newDocMetadata.visa_number = meta.visa_number || ''
                    newDocMetadata.visa_validity = meta.visa_validity || ''
                  } else if (docType === 'employment_contract') {
                    newDocMetadata.ec_issued_date = meta.ec_issued_date || ''
                    newDocMetadata.ec_verification = meta.ec_verification || ''
                  } else if (docType === 'for_interview_screenshot') {
                    // Store the document ID for proper URL construction
                    screenshotDocIds.screenshot1 = doc.id
                    newDocMetadata.screenshot1_url = `/api/documents/${doc.id}/download`
                  } else if (docType === 'confirmation_verification_image') {
                    // Store the document ID for proper URL construction
                    screenshotDocIds.screenshot2 = doc.id
                    newDocMetadata.screenshot2_url = `/api/documents/${doc.id}/download`
                  }
                  
                  // Mark document as uploaded
                  const formDocType = getFormDocumentType(docType)
                  if (formDocType) {
                    newDocFiles[formDocType] = { name: doc.file_name, uploaded: true }
                  }
                })
                
                setDocMetadata(prev => ({ ...prev, ...newDocMetadata }))
                setDocFiles(prev => ({ ...prev, ...newDocFiles }))
                setScreenshotDocIds(screenshotDocIds)
                
                // Store original data for comparison - use the complete newDocMetadata
                setOriginalDocMetadata(newDocMetadata)
                setOriginalDocFiles(newDocFiles)
              }
            }
      }
    } catch (error) {
          console.error('Error fetching edit data:', error)
        }
      }
    }
    
    fetchEditData()
  }, [applicationId])





  // Document checklist state (Evaluated)
  const [docFiles, setDocFiles] = useState<DocFiles>({
    passport: null,
    work_visa: null,
    employment_contract: null,
    tesda_license: null,
    country_specific: null,
    compliance_form: null,
    medical_certificate: null,
    peos_certificate: null,
    clearance: null,
    insurance_coverage: null,
    eregistration: null,
    pdos_certificate: null,
    screenshot1: null,
    screenshot2: null,
  })

  const [dragOver, setDragOver] = useState<string | null>(null)
  const [clipboardSupported, setClipboardSupported] = useState(false)

  // Document metadata state for template tags
  const [docMetadata, setDocMetadata] = useState<DocMetadata>({
    // Passport metadata
    passport_number: '',
    passport_expiry: '',
    // Visa metadata
    visa_category: '',
    visa_type: '',
    visa_validity: '',
    visa_number: '',
    // Employment contract metadata
    ec_issued_date: '',
    ec_verification: '',
    // Screenshot metadata
    screenshot1_url: '',
    screenshot2_url: '',
  })

  // State to track original data for edit optimization
  const [originalFormData, setOriginalFormData] = useState<FormDataType | null>(null)
  const [originalDocMetadata, setOriginalDocMetadata] = useState<DocMetadata | null>(null)
  const [originalDocFiles, setOriginalDocFiles] = useState<DocFiles | null>(null)
  
  // State to track screenshot document IDs for proper URL construction
  const [screenshotDocIds, setScreenshotDocIds] = useState<{screenshot1?: string, screenshot2?: string}>({})
  
  // State to track evaluator for display during edit
  const [evaluator, setEvaluator] = useState<string>('Loading...')

  const handleDocChange = (key: keyof DocFiles, file: File | null) => {
    setDocFiles(prev => ({ ...prev, [key]: file }))
  }

  // Drag and drop handlers
  const handleDragOverWrapper = (e: React.DragEvent, key: keyof DocFiles) => {
    handleDragOver(e, key, setDragOver)
  }

  const handleDragLeaveWrapper = (e: React.DragEvent) => {
    handleDragLeave(e, setDragOver)
  }

  const handleDropWrapper = (e: React.DragEvent, key: keyof DocFiles) => {
    handleDrop(e, key, setDragOver, handleDocChange, toast)
  }

  // Clipboard paste handlers
  const handlePasteFromClipboardWrapper = async (screenshotKey: 'screenshot1' | 'screenshot2') => {
    await handlePasteFromClipboard(screenshotKey, setDocFiles, setDocMetadata, toast)
  }

  // Check clipboard support on component mount
  React.useEffect(() => {
    setClipboardSupported(checkClipboardSupport())
  }, [])


  // Handle application update
  const handleUpdateApplication = async () => {
    // Validate form first
    const validationErrors = validateFormWithMissingFields(formData, docMetadata, docFiles);
    const fieldErrors = getFieldErrors(formData, false);
    const docMetadataErrors = getDocumentMetadataErrors(docFiles, docMetadata);
    
    if (validationErrors.length > 0) {
      // Set field-specific errors for visual indicators
      setValidationErrors(fieldErrors);
      setDocumentMetadataErrors(docMetadataErrors);
      
      // Show first error message
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare update data with additional details
      // Note: evaluator field is intentionally excluded to preserve original value
      const salaryNumber = formData.salary !== '' ? Number(formData.salary) : 0
      let salaryUsd = formData.salaryCurrency && salaryNumber
        ? (formData.salaryCurrency === 'USD' ? salaryNumber : convertToUSD(salaryNumber, formData.salaryCurrency))
        : salaryNumber
      // Round to nearest hundredths
      salaryUsd = Math.round((salaryUsd + Number.EPSILON) * 100) / 100

      const updateData = {
        ...formData,
        // Persist raw salary and currency explicitly
        raw_salary: salaryNumber,
        salary_currency: formData.salaryCurrency || '',
        // Persist the static converted salary in USD
        salary: salaryUsd,
        for_interview_meta: {
          processed_workers_principal: formData.processed_workers_principal ? Number(formData.processed_workers_principal) : 0,
          processed_workers_las: formData.processed_workers_las ? Number(formData.processed_workers_las) : 0,
        },
        for_confirmation_meta: {
          verifier_type: formData.verifier_type || '',
          verifier_office: formData.verifier_office || '',
          pe_pcg_city: formData.pe_pcg_city || '',
          others_text: formData.others_text || '',
          verified_date: formData.verified_date || ''
        }
      };
      
      const result = await updateApplication(applicationId!, updateData)
      if (!result) {
        throw new Error('Failed to update application')
      }

      // Check for document metadata changes and update them
      try {
        if (applicationId) {
          const changedMetadata = getChangedDocMetadata(docMetadata, originalDocMetadata)
          if (changedMetadata) {
            // Get all documents first
            const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
            if (response.ok) {
              const docsData = await response.json()
              const documents = docsData.data || []
              
              // Group fields by document type
              const fieldsByDocType: { [key: string]: { [key: string]: any } } = {}
              
              for (const [field, value] of Object.entries(changedMetadata)) {
                // Determine which document type this field belongs to
                let documentType = ''
                if (['passport_number', 'passport_expiry'].includes(field)) {
                  documentType = 'passport'
                } else if (['visa_category', 'visa_type', 'visa_number', 'visa_validity'].includes(field)) {
                  documentType = 'work_visa'
                } else if (['ec_issued_date', 'ec_verification'].includes(field)) {
                  documentType = 'employment_contract'
                } else if (['screenshot1_url'].includes(field)) {
                  documentType = 'for_interview_screenshot'
                } else if (['screenshot2_url'].includes(field)) {
                  documentType = 'confirmation_verification_image'
                }
                
                if (documentType) {
                  if (!fieldsByDocType[documentType]) {
                    fieldsByDocType[documentType] = {}
                  }
                  fieldsByDocType[documentType][field] = value
                }
              }
              
              // Update each document type
              for (const [documentType, fields] of Object.entries(fieldsByDocType)) {
                const doc = documents.find((d: any) => d.document_type === documentType)
                if (doc) {
                  const currentMeta = doc.meta ? (typeof doc.meta === 'string' ? JSON.parse(doc.meta) : doc.meta) : {}
                  const updatedMeta = { ...currentMeta, ...fields }
                  
                  // Update the document metadata
                  const updateResponse = await fetch(`/api/documents/${doc.id}`, {
                    method: 'PATCH',
        headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ meta: updatedMeta }),
                  })
                  
                  if (!updateResponse.ok) {
                    console.error(`Failed to update metadata for ${documentType}:`, fields)
                  }
                } else {
                  // Document doesn't exist yet, but we have metadata to store
                  // This can happen if user fills metadata before uploading the file
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error updating document metadata:', error)
      }

      // Upload only new documents (optimization)
      try { 
        if (applicationId) {
          const newUploads = getNewDocumentUploads(docFiles, originalDocFiles)
          if (newUploads) {
            // Create a temporary docFiles object with only new uploads
            const tempDocFiles = { ...docFiles }
            Object.keys(docFiles).forEach(key => {
              if (!newUploads[key as keyof DocFiles]) {
                delete tempDocFiles[key as keyof DocFiles]
              }
            })
            
            // Upload only new documents
            const entries = Object.entries(tempDocFiles).filter(([_, f]) => !!f)
            if (entries.length > 0) {
              for (const [documentType, file] of entries) {
                if (!file) continue
                
                // Validate file type before upload
                const allowedTypes = [
                  'application/pdf',
                  'image/jpeg',
                  'image/png',
                  'image/gif',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ]
                
                if (!allowedTypes.includes(file.type)) {
                  console.error('Invalid file type for', documentType, ':', file.type)
                  toast({
                    title: 'Invalid File Type',
                    description: `File ${file.name} has an invalid type (${file.type}). Please upload a PDF, image, Word, or Excel document.`,
                    variant: 'destructive'
                  })
                  continue
                }
                
                // Prepare metadata for this document type
                const meta: any = {}
                if (documentType === 'passport') {
                  meta.passport_number = docMetadata.passport_number
                  meta.passport_expiry = docMetadata.passport_expiry
                } else if (documentType === 'work_visa') {
                  meta.visa_category = docMetadata.visa_category
                  meta.visa_type = docMetadata.visa_type
                  meta.visa_number = docMetadata.visa_number
                  meta.visa_validity = docMetadata.visa_validity
                } else if (documentType === 'employment_contract') {
                  meta.ec_issued_date = docMetadata.ec_issued_date
                  meta.ec_verification = docMetadata.ec_verification
                }
                
                const formData = new FormData()
                formData.append('file', file)
                formData.append('applicationId', applicationId)
                formData.append('applicationType', 'direct_hire')
                formData.append('documentName', documentType)
                formData.append('meta', JSON.stringify(meta))
                
                const uploadResponse = await fetch('/api/documents/upload', {
                  method: 'POST',
                  body: formData
                })
                
                if (!uploadResponse.ok) {
                  const errorData = await uploadResponse.json()
                  console.error('Upload failed for', documentType, ':', errorData.error)
                  toast({
                    title: 'Upload Failed',
                    description: `Failed to upload ${file.name}: ${errorData.error}`,
                    variant: 'destructive'
                  })
                }
              }
              
              toast({
                title: 'New Documents Uploaded',
                description: `${entries.length} new document(s) have been uploaded successfully.`,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error uploading documents:', error)
        toast({
          title: 'Document Upload Warning',
          description: 'Some documents may not have been uploaded. Please check the Documents section.',
          variant: 'destructive'
        })
      }

      // Ensure parent refresh completes before toast
      await onSuccess?.()
      onClose();
      toast({
        title: 'Application updated',
        description: `${formData.name} has been updated successfully.`,
      });
        } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: 'Error updating application',
        description: 'Failed to update the application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setUpdateConfirmOpen(false);
    }
  }

  // Handle application creation
  const handleCreateApplication = async () => {
    // Validate form first
    const validationErrors = validateFormWithMissingFields(formData, docMetadata, docFiles);
    const fieldErrors = getFieldErrors(formData, false);
    const docMetadataErrors = getDocumentMetadataErrors(docFiles, docMetadata);
    
    if (validationErrors.length > 0) {
      // Set field-specific errors for visual indicators
      setValidationErrors(fieldErrors);
      setDocumentMetadataErrors(docMetadataErrors);
      
      // Show first error message
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare create data with additional details
      const salaryNumber = formData.salary !== '' ? Number(formData.salary) : 0
      let salaryUsd = formData.salaryCurrency && salaryNumber
        ? (formData.salaryCurrency === 'USD' ? salaryNumber : convertToUSD(salaryNumber, formData.salaryCurrency))
        : salaryNumber
      // Round to nearest hundredths
      salaryUsd = Math.round((salaryUsd + Number.EPSILON) * 100) / 100

      const createData = {
        ...formData,
        // Persist both raw and converted amounts on create
        raw_salary: salaryNumber,
        salary_currency: formData.salaryCurrency || '',
        salary: salaryUsd,
        evaluator: (currentUser?.full_name || 'Unknown').toUpperCase(),
        for_interview_meta: {
          processed_workers_principal: formData.processed_workers_principal ? Number(formData.processed_workers_principal) : 0,
          processed_workers_las: formData.processed_workers_las ? Number(formData.processed_workers_las) : 0,
        },
        for_confirmation_meta: {
          verifier_type: formData.verifier_type || '',
          verifier_office: formData.verifier_office || '',
          pe_pcg_city: formData.pe_pcg_city || '',
          others_text: formData.others_text || '',
          verified_date: formData.verified_date || ''
        }
      };
      
      console.log('Creating application with data:', createData);
      console.log('Evaluator field:', createData.evaluator);
      console.log('Email field:', createData.email);
      console.log('Cellphone field:', createData.cellphone);
      
      const result = await createApplication(createData);

      if (result) {
        const createdId: string = result.id || ''
        
        // Upload selected documents
        if (createdId) {
          try { 
            await uploadSelectedDocuments(createdId, docFiles, docMetadata)
            toast({
              title: 'Documents Uploaded',
              description: 'All selected documents have been uploaded successfully.',
            })
          } catch (error) {
            console.error('Error uploading documents:', error)
            toast({
              title: 'Document Upload Warning',
              description: 'Some documents may not have been uploaded. Please check the Documents section.',
              variant: 'destructive'
            })
          }
        }

        // Generate Direct Hire Clearance document
        if (createdId) {
          try {
            const clearanceGenerated = await generateDirectHireClearance(createdId)
            if (clearanceGenerated) {
              toast({
                title: 'Direct Hire Clearance Generated',
                description: 'The Direct Hire Clearance document has been created and attached.',
              })
            }
          } catch (error) {
            console.error('Error generating Direct Hire Clearance:', error)
            // Don't fail the entire operation if clearance generation fails
          }
        }

        // Ensure parent refresh completes before toast
        await onSuccess?.()
        onClose();
        toast({
          title: 'Application created successfully!',
          description: `${formData.name} has been added to the system with Direct Hire Clearance generated`,
        });
      } else {
        throw new Error('Failed to create application');
      }
    } catch (error) {
      console.error('Error creating application:', error);
      toast({
        title: 'Error creating application',
        description: 'Failed to create the application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }







  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${mounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} />
      <div className={`relative bg-white rounded-lg w-full ${activeTile === 'form2' ? 'max-w-6xl' : 'max-w-2xl'} mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-150 ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">
              {applicationId ? `Edit ${formData.name}'s Application` : 'Fill Out Form'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Sticky Tile Navigation */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex px-6 pt-4">
              <button
                onClick={() => setActiveTile('form1')}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTile === 'form1'
                    ? 'text-[#1976D2] border-[#1976D2]'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </div>
              </button>
              <button
                onClick={() => {
                  // Gate to Form 2: require Form 1 completeness
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
                  const missing: string[] = []
                  const fieldErrors: {[key: string]: string} = {}
                  if (!formData.name.trim()) { missing.push('Worker Name'); fieldErrors.name = 'Name is required' }
                  if (!formData.jobsite.trim()) { missing.push('Jobsite'); fieldErrors.jobsite = 'Jobsite is required' }
                  if (!formData.position.trim()) { missing.push('Position'); fieldErrors.position = 'Position is required' }
                  if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) { missing.push('Salary'); fieldErrors.salary = 'Valid salary is required' }
                  if (!formData.sex) { missing.push('Sex') }
                  if (!formData.job_type) { missing.push('Job Type') }
                  if (!formData.salaryCurrency) { missing.push('Salary Currency') }
                  if (formData.email && !emailRegex.test(formData.email)) { missing.push('Valid Email Address'); fieldErrors.email = 'Enter a valid email' }
                  if (formData.cellphone) {
                    const digits = formData.cellphone.replace(/\D/g, '')
                    if (!/^09\d{9}$/.test(digits)) { missing.push('Valid Cellphone Number (starts with 09, 11 digits)'); fieldErrors.cellphone = 'Must start with 09 and be 11 digits' }
                  }
                  if (missing.length > 0) {
                    setValidationErrors(prev => ({ ...prev, ...fieldErrors }))
                    toast({
                      title: 'Complete Basic Information',
                      description: `Please complete: ${missing.join(', ')}`,
                      variant: 'destructive'
                    })
                    return
                  }
                  setActiveTile('form2')
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTile === 'form2'
                    ? 'text-[#1976D2] border-[#1976D2]'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </div>
              </button>
              <button
                onClick={() => {
                  // Gate to Form 3: require Form 1 and required documents (Form 2)
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
                  const missingForm1: string[] = []
                  const fieldErrors: {[key: string]: string} = {}
                  if (!formData.name.trim()) { missingForm1.push('Worker Name'); fieldErrors.name = 'Name is required' }
                  if (!formData.jobsite.trim()) { missingForm1.push('Jobsite'); fieldErrors.jobsite = 'Jobsite is required' }
                  if (!formData.position.trim()) { missingForm1.push('Position'); fieldErrors.position = 'Position is required' }
                  if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) { missingForm1.push('Salary'); fieldErrors.salary = 'Valid salary is required' }
                  if (!formData.sex) { missingForm1.push('Sex') }
                  if (!formData.job_type) { missingForm1.push('Job Type') }
                  if (!formData.salaryCurrency) { missingForm1.push('Salary Currency') }
                  if (formData.email && !emailRegex.test(formData.email)) { missingForm1.push('Valid Email Address'); fieldErrors.email = 'Enter a valid email' }
                  if (formData.cellphone) {
                    const digits = formData.cellphone.replace(/\D/g, '')
                    if (!/^09\d{9}$/.test(digits)) { missingForm1.push('Valid Cellphone Number (starts with 09, 11 digits)'); fieldErrors.cellphone = 'Must start with 09 and be 11 digits' }
                  }
                  if (missingForm1.length > 0) {
                    setValidationErrors(prev => ({ ...prev, ...fieldErrors }))
                    toast({
                      title: 'Complete Basic Information',
                      description: `Please complete: ${missingForm1.join(', ')}`,
                      variant: 'destructive'
                    })
                    return
                  }
                  const requiredDocs: Array<{ key: keyof DocFiles, label: string }> = [
                    { key: 'passport', label: 'Passport' },
                    { key: 'work_visa', label: 'Work Visa' },
                    { key: 'employment_contract', label: 'Employment Contract' },
                    { key: 'tesda_license', label: 'TESDA/PRC License' },
                  ]
                  const missingDocs: string[] = []
                  requiredDocs.forEach(({ key, label }) => {
                    if (!docFiles[key]) missingDocs.push(label)
                  })
                  const metadataMissing: string[] = []
                  // Metadata checks only for required docs present
                  if (docFiles.passport) {
                    if (!docMetadata.passport_number?.trim()) metadataMissing.push('Passport Number')
                    if (!docMetadata.passport_expiry?.trim()) metadataMissing.push('Passport Expiry Date')
                  }
                  if (docFiles.work_visa) {
                    if (!docMetadata.visa_category?.trim()) metadataMissing.push('Visa Category')
                    if (!docMetadata.visa_type?.trim()) metadataMissing.push('Visa Type')
                    if (!docMetadata.visa_number?.trim()) metadataMissing.push('Visa Number')
                    if (!docMetadata.visa_validity?.trim()) metadataMissing.push('Visa Validity Date')
                  }
                  if (docFiles.employment_contract) {
                    if (!docMetadata.ec_issued_date?.trim()) metadataMissing.push('Employment Contract Issued Date')
                    if (!docMetadata.ec_verification?.trim()) metadataMissing.push('Employment Contract Verification Type')
                  }
                  if (missingDocs.length > 0 || metadataMissing.length > 0) {
                    // surface document metadata field errors
                    const dmErrors: {[key: string]: string} = {}
                    if (docFiles.passport) {
                      if (!docMetadata.passport_number?.trim()) dmErrors.passport_number = 'Passport number is required'
                      if (!docMetadata.passport_expiry?.trim()) dmErrors.passport_expiry = 'Passport expiry date is required'
                    }
                    if (docFiles.work_visa) {
                      if (!docMetadata.visa_category?.trim()) dmErrors.visa_category = 'Visa category is required'
                      if (!docMetadata.visa_type?.trim()) dmErrors.visa_type = 'Visa type is required'
                      if (!docMetadata.visa_number?.trim()) dmErrors.visa_number = 'Visa number is required'
                      if (!docMetadata.visa_validity?.trim()) dmErrors.visa_validity = 'Visa validity date is required'
                    }
                    if (docFiles.employment_contract) {
                      if (!docMetadata.ec_issued_date?.trim()) dmErrors.ec_issued_date = 'Issued date is required'
                      if (!docMetadata.ec_verification?.trim()) dmErrors.ec_verification = 'Verification type is required'
                    }
                    setDocumentMetadataErrors(prev => ({ ...prev, ...dmErrors }))
                    const parts: string[] = []
                    if (missingDocs.length > 0) parts.push(`Required documents: ${missingDocs.join(', ')}`)
                    if (metadataMissing.length > 0) parts.push(`Document details: ${metadataMissing.join(', ')}`)
                    toast({
                      title: 'Complete Documents',
                      description: parts.join(' | '),
                      variant: 'destructive'
                    })
                    return
                  }
                  setActiveTile('form3')
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTile === 'form3'
                    ? 'text-[#1976D2] border-[#1976D2]'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Additional Details
                </div>
              </button>
            </div>
          </div>

          {/* Content with padding */}
          <div className="p-6">

          {/* Tile Content */}
          {activeTile === 'form1' && (
            <div className={`space-y-4 transition-all duration-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
              {/* Control No - Show actual number when editing, preview when creating */}
              <div>
                <Label className="text-sm font-medium">
                  {applicationId ? 'Control No.' : 'Control No. (Preview)'}
                </Label>
                <Input 
                  value={applicationId ? (initialData?.control_number || 'Loading...') : controlNumberPreview} 
                  disabled
                  className="mt-1 bg-gray-50 font-mono text-sm" 
                  placeholder={applicationId ? 'Loading...' : "Generating preview..."}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {applicationId 
                    ? 'Control number is fixed and cannot be changed.'
                    : 'This is a preview. The actual control number will be generated upon creation.'
                  }
                </p>
              </div>

              {/* Name of Worker */}
              <div>
                <Label className="text-sm font-medium">Name of Worker:</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value.toUpperCase() });
                    clearFieldError('name');
                  }}
                  className={`mt-1 ${validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter worker name" 
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email Address:</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email') }}
                    className="mt-1"
                    placeholder="name@example.com"
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Cellphone No.:</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.cellphone}
                    onChange={(e) => {
                      const raw = (e.target.value || '').replace(/\D/g, '')
                      let next = raw
                      // Ensure it always starts with 09
                      if (!next.startsWith('09')) {
                        if (next.startsWith('9')) {
                          next = `0${next}`
                        } else if (next.startsWith('0')) {
                          next = `09${next.slice(1)}`
                        } else {
                          next = `09${next}`
                        }
                      }
                      next = next.slice(0, 11)
                      setFormData({ ...formData, cellphone: next })
                      clearFieldError('cellphone')
                    }}
                    className="mt-1"
                    placeholder="09XXXXXXXXX"
                  />
                  {validationErrors.cellphone && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.cellphone}</p>
                  )}
                </div>
              </div>

              {/* Sex */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Sex:</Label>
                <RadioGroup 
                  value={formData.sex} 
                  onValueChange={(value) => setFormData({ ...formData, sex: value as 'male' | 'female' })}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Jobsite */}
              <div>
                <Label className="text-sm font-medium">Jobsite:</Label>
                <Input 
                  value={formData.jobsite}
                  onChange={(e) => {
                    setFormData({ ...formData, jobsite: e.target.value.toUpperCase() });
                    clearFieldError('jobsite');
                  }}
                  className={`mt-1 ${validationErrors.jobsite ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter jobsite"
                />
                {validationErrors.jobsite && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.jobsite}</p>
                )}
              </div>

              {/* Position with Job Type */}
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                <Label className="text-sm font-medium">Position:</Label>
                  </div>
                  <div className="w-32">
                    <Label className="text-sm font-medium">Job Type:</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                <Input 
                  value={formData.position}
                      onChange={(e) => {
                        setFormData({ ...formData, position: e.target.value.toUpperCase() });
                        clearFieldError('position');
                      }}
                      className={`${validationErrors.position ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter position"
                />
                  </div>
                  <div className="w-32">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10"
                      value={formData.job_type} 
                      onChange={(e) => setFormData({ ...formData, job_type: e.target.value as 'household' | 'professional' })}
                    >
                      <option value="">----</option>
                      <option value="professional">Professional</option>
                      <option value="household">Household</option>
                    </select>
                  </div>
                </div>
                {validationErrors.position && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.position}</p>
                )}
              </div>

              {/* Salary with Currency */}
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                <Label className="text-sm font-medium">Salary (per month):</Label>
                  </div>
                  <div className="w-32">
                    <Label className="text-sm font-medium">Currency:</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      value={formData.salary}
                      onChange={(e) => {
                        setFormData({ ...formData, salary: e.target.value });
                        clearFieldError('salary');
                      }}
                      type="number"
                      step="0.01"
                      className={validationErrors.salary ? 'border-red-500 focus:border-red-500' : ''}
                      placeholder="Enter salary amount" 
                    />
                  </div>
                  <div className="w-32">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10"
                      value={formData.salaryCurrency} 
                      onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value as Currency })}
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
                {validationErrors.salary && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.salary}</p>
                )}
                {formData.salary && formData.salaryCurrency !== "USD" && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      USD Equivalent: {getUSDEquivalentDisplay()}
                    </span>
                  </div>
                )}
              </div>

              {/* Employer */}
              <div>
                <Label className="text-sm font-medium">Employer:</Label>
                <Input 
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value.toUpperCase() })}
                  className="mt-1"
                  placeholder="Enter employer name" 
                />
              </div>

              {/* Evaluator (Read-only, only shown when editing) */}
              {applicationId && (
                <div>
                  <Label className="text-sm font-medium">Evaluator:</Label>
                  <Input 
                    value={evaluator}
                    disabled
                    className="mt-1 bg-gray-50 font-mono text-sm" 
                    placeholder="Loading..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Evaluator is assigned when the application is first created and cannot be changed.
                  </p>
                </div>
              )}

               {/* Navigation buttons for Form 1 */}
               <div className="flex justify-between pt-6">
                 <div></div>
                 <Button 
                   onClick={() => {
                     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
                     const missing: string[] = []
                     const fieldErrors: {[key: string]: string} = {}
                     if (!formData.name.trim()) { missing.push('Worker Name'); fieldErrors.name = 'Name is required' }
                     if (!formData.jobsite.trim()) { missing.push('Jobsite'); fieldErrors.jobsite = 'Jobsite is required' }
                     if (!formData.position.trim()) { missing.push('Position'); fieldErrors.position = 'Position is required' }
                     if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) { missing.push('Salary'); fieldErrors.salary = 'Valid salary is required' }
                     if (!formData.sex) { missing.push('Sex') }
                     if (!formData.job_type) { missing.push('Job Type') }
                     if (!formData.salaryCurrency) { missing.push('Salary Currency') }
                     if (formData.email && !emailRegex.test(formData.email)) { missing.push('Valid Email Address'); fieldErrors.email = 'Enter a valid email' }
                     if (formData.cellphone) {
                       const digits = formData.cellphone.replace(/\D/g, '')
                       if (!/^09\d{9}$/.test(digits)) { missing.push('Valid Cellphone Number (starts with 09, 11 digits)'); fieldErrors.cellphone = 'Must start with 09 and be 11 digits' }
                     }
                     if (missing.length > 0) {
                       setValidationErrors(prev => ({ ...prev, ...fieldErrors }))
                       toast({
                         title: 'Complete Basic Information',
                         description: `Please complete: ${missing.join(', ')}`,
                         variant: 'destructive'
                       })
                       return
                     }
                     setActiveTile('form2')
                   }}
                   className="bg-[#1976D2] hover:bg-[#1565C0]"
                 >
                   Next
                 </Button>
               </div>
             </div>
           )}

           {activeTile === 'form2' && (
             <div className={`space-y-6 transition-all duration-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
               {/* Document Checklist */}
               <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-600" />
                    Documents
                  </h3>
                  <p className="text-xs text-gray-500 mb-6">Upload applicant's documents. PDF, PNG, JPEG files only (Max 10 MB).</p>
                 
                 {/* Required Documents */}
                 <div className="mb-8">
                   <h4 className="text-sm font-medium text-red-600 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                     Required Documents
                   </h4>
                   <div className="space-y-4">
                     {/* Passport */}
                     <PassportUploadItem
                       key="passport"
                       documentKey="passport"
                       title="Passport with validity period of not less than one (1) year"
                       isRequired={true}
                       docFiles={docFiles}
                       docMetadata={docMetadata}
                       setDocFiles={setDocFiles}
                       setDocMetadata={setDocMetadata}
                       dragOver={dragOver}
                       handleDragOver={handleDragOverWrapper}
                       handleDragLeave={handleDragLeaveWrapper}
                       handleDrop={handleDropWrapper}
                       handleDocChange={handleDocChange}
                       documentMetadataErrors={documentMetadataErrors}
                       clearDocumentMetadataError={clearDocumentMetadataError}
                     />
                     {/* Work Visa */}
                     <WorkVisaUploadItem
                       key="work_visa"
                       documentKey="work_visa"
                       title="Valid Work Visa, Entry/Work Permit (whichever is applicable per country)"
                       isRequired={true}
                       docFiles={docFiles}
                       docMetadata={docMetadata}
                       setDocFiles={setDocFiles}
                       setDocMetadata={setDocMetadata}
                       dragOver={dragOver}
                       handleDragOver={handleDragOverWrapper}
                       handleDragLeave={handleDragLeaveWrapper}
                       handleDrop={handleDropWrapper}
                       handleDocChange={handleDocChange}
                       documentMetadataErrors={documentMetadataErrors}
                       clearDocumentMetadataError={clearDocumentMetadataError}
                     />
                     {/* Employment Contract */}
                     <EmploymentContractUploadItem
                       key="employment_contract"
                       documentKey="employment_contract"
                       title="Employment Contract or Offer of Employment"
                       isRequired={true}
                       docFiles={docFiles}
                       docMetadata={docMetadata}
                       setDocFiles={setDocFiles}
                       setDocMetadata={setDocMetadata}
                       dragOver={dragOver}
                       handleDragOver={handleDragOverWrapper}
                       handleDragLeave={handleDragLeaveWrapper}
                       handleDrop={handleDropWrapper}
                       handleDocChange={handleDocChange}
                       documentMetadataErrors={documentMetadataErrors}
                       clearDocumentMetadataError={clearDocumentMetadataError}
                     />

                     {/* TESDA/PRC License */}
                     <DocumentUploadItem
                       key="tesda_license"
                       documentKey="tesda_license"
                       title="TESDA/PRC License"
                       isRequired={true}
                       docFiles={docFiles}
                       docMetadata={docMetadata}
                       setDocFiles={setDocFiles}
                       setDocMetadata={setDocMetadata}
                       dragOver={dragOver}
                       handleDragOver={handleDragOverWrapper}
                       handleDragLeave={handleDragLeaveWrapper}
                       handleDrop={handleDropWrapper}
                       handleDocChange={handleDocChange}
                       documentMetadataErrors={documentMetadataErrors}
                       clearDocumentMetadataError={clearDocumentMetadataError}
                     />
                   </div>
                 </div>

                 {/* Optional Documents */}
                 <div>
                   <h4 className="text-sm font-medium text-blue-600 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                     Optional Documents
                   </h4>
                   <div className="space-y-4">
                     {[
                       { key: 'country_specific', label: 'Additional country-specific requirements' },
                       { key: 'compliance_form', label: 'Compliance Form (Print from MWPS-Direct if necessary)' },
                       { key: 'medical_certificate', label: 'Valid Medical Certificate from DOH-accredited medical clinic authorized to conduct medical exam for OFWs' },
                       { key: 'peos_certificate', label: 'Pre-Employment Orientation Seminar Certificate (PEOS)' },
                       { key: 'clearance', label: 'Clearance' },
                       { key: 'insurance_coverage', label: 'Proof of certificate of insurance coverage covering at least the benefits provided under Section 37-A of RA 8042' }
                     ].map(({ key, label }) => (
                       <div key={key}>
                         <DocumentUploadItem
                           key={key as keyof DocFiles}
                           documentKey={key as keyof DocFiles}
                           title={label}
                           isRequired={false}
                           docFiles={docFiles}
                           docMetadata={docMetadata}
                           setDocFiles={setDocFiles}
                           setDocMetadata={setDocMetadata}
                           dragOver={dragOver}
                           handleDragOver={handleDragOverWrapper}
                           handleDragLeave={handleDragLeaveWrapper}
                           handleDrop={handleDropWrapper}
                           handleDocChange={handleDocChange}
                           documentMetadataErrors={documentMetadataErrors}
                           clearDocumentMetadataError={clearDocumentMetadataError}
                         />
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* OEC Issuance Requirements */}
                 <div className="mt-8">
                   <h4 className="text-sm font-medium text-purple-600 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                     OEC Issuance Requirements (Approved Status in MWPS-Direct)
                   </h4>
                   <div className="space-y-4">
                     {[
                       { key: 'eregistration', label: 'E-Registration Account (Print from MWPS-Direct Registration Form)' },
                       { key: 'pdos_certificate', label: 'Pre-Departure Orientation Seminar (PDOS) Certificate issued by OWWA' }
                     ].map(({ key, label }) => (
                       <div key={key}>
                         <DocumentUploadItem
                           key={key as keyof DocFiles}
                           documentKey={key as keyof DocFiles}
                           title={label}
                           isRequired={false}
                           docFiles={docFiles}
                           docMetadata={docMetadata}
                           setDocFiles={setDocFiles}
                           setDocMetadata={setDocMetadata}
                           dragOver={dragOver}
                           handleDragOver={handleDragOverWrapper}
                           handleDragLeave={handleDragLeaveWrapper}
                           handleDrop={handleDropWrapper}
                           handleDocChange={handleDocChange}
                           documentMetadataErrors={documentMetadataErrors}
                           clearDocumentMetadataError={clearDocumentMetadataError}
                         />
                       </div>
                     ))}
                   </div>
                 </div>
               </div>

               {/* Navigation buttons for Form 2 */}
               <div className="flex justify-end pt-6">
                 <Button 
                   onClick={() => {
                     // Gate to Form 3 from Next
                     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
                     const missingForm1: string[] = []
                     const fieldErrors: {[key: string]: string} = {}
                     if (!formData.name.trim()) { missingForm1.push('Worker Name'); fieldErrors.name = 'Name is required' }
                     if (!formData.jobsite.trim()) { missingForm1.push('Jobsite'); fieldErrors.jobsite = 'Jobsite is required' }
                     if (!formData.position.trim()) { missingForm1.push('Position'); fieldErrors.position = 'Position is required' }
                     if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) { missingForm1.push('Salary'); fieldErrors.salary = 'Valid salary is required' }
                     if (!formData.sex) { missingForm1.push('Sex') }
                     if (!formData.job_type) { missingForm1.push('Job Type') }
                     if (!formData.salaryCurrency) { missingForm1.push('Salary Currency') }
                     if (formData.email && !emailRegex.test(formData.email)) { missingForm1.push('Valid Email Address'); fieldErrors.email = 'Enter a valid email' }
                     if (formData.cellphone) {
                       const digits = formData.cellphone.replace(/\D/g, '')
                       if (!/^09\d{9}$/.test(digits)) { missingForm1.push('Valid Cellphone Number (starts with 09, 11 digits)'); fieldErrors.cellphone = 'Must start with 09 and be 11 digits' }
                     }
                     if (missingForm1.length > 0) {
                       setValidationErrors(prev => ({ ...prev, ...fieldErrors }))
                       toast({
                         title: 'Complete Basic Information',
                         description: `Please complete: ${missingForm1.join(', ')}`,
                         variant: 'destructive'
                       })
                       return
                     }
                     const requiredDocs: Array<{ key: keyof DocFiles, label: string }> = [
                       { key: 'passport', label: 'Passport' },
                       { key: 'work_visa', label: 'Work Visa' },
                       { key: 'employment_contract', label: 'Employment Contract' },
                       { key: 'tesda_license', label: 'TESDA/PRC License' },
                     ]
                     const missingDocs: string[] = []
                     requiredDocs.forEach(({ key, label }) => {
                       if (!docFiles[key]) missingDocs.push(label)
                     })
                     const metadataMissing: string[] = []
                     if (docFiles.passport) {
                       if (!docMetadata.passport_number?.trim()) metadataMissing.push('Passport Number')
                       if (!docMetadata.passport_expiry?.trim()) metadataMissing.push('Passport Expiry Date')
                     }
                     if (docFiles.work_visa) {
                       if (!docMetadata.visa_category?.trim()) metadataMissing.push('Visa Category')
                       if (!docMetadata.visa_type?.trim()) metadataMissing.push('Visa Type')
                       if (!docMetadata.visa_number?.trim()) metadataMissing.push('Visa Number')
                       if (!docMetadata.visa_validity?.trim()) metadataMissing.push('Visa Validity Date')
                     }
                     if (docFiles.employment_contract) {
                       if (!docMetadata.ec_issued_date?.trim()) metadataMissing.push('Employment Contract Issued Date')
                       if (!docMetadata.ec_verification?.trim()) metadataMissing.push('Employment Contract Verification Type')
                     }
                     if (missingDocs.length > 0 || metadataMissing.length > 0) {
                       const dmErrors: {[key: string]: string} = {}
                       if (docFiles.passport) {
                         if (!docMetadata.passport_number?.trim()) dmErrors.passport_number = 'Passport number is required'
                         if (!docMetadata.passport_expiry?.trim()) dmErrors.passport_expiry = 'Passport expiry date is required'
                       }
                       if (docFiles.work_visa) {
                         if (!docMetadata.visa_category?.trim()) dmErrors.visa_category = 'Visa category is required'
                         if (!docMetadata.visa_type?.trim()) dmErrors.visa_type = 'Visa type is required'
                         if (!docMetadata.visa_number?.trim()) dmErrors.visa_number = 'Visa number is required'
                         if (!docMetadata.visa_validity?.trim()) dmErrors.visa_validity = 'Visa validity date is required'
                       }
                       if (docFiles.employment_contract) {
                         if (!docMetadata.ec_issued_date?.trim()) dmErrors.ec_issued_date = 'Issued date is required'
                         if (!docMetadata.ec_verification?.trim()) dmErrors.ec_verification = 'Verification type is required'
                       }
                       setDocumentMetadataErrors(prev => ({ ...prev, ...dmErrors }))
                       const parts: string[] = []
                       if (missingDocs.length > 0) parts.push(`Required documents: ${missingDocs.join(', ')}`)
                       if (metadataMissing.length > 0) parts.push(`Document details: ${metadataMissing.join(', ')}`)
                       toast({
                         title: 'Complete Documents',
                         description: parts.join(' | '),
                         variant: 'destructive'
                       })
                       return
                     }
                     setActiveTile('form3')
                   }}
                   className="bg-[#1976D2] hover:bg-[#1565C0]"
                 >
                   Next
                 </Button>
               </div>


            </div>
           )}

           {activeTile === 'form3' && (
             <div className={`space-y-6 transition-all duration-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
               {/* Additional Details */}
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                    Additional Details
                  </h3>
                  <p className="text-xs text-gray-500 mb-6">These fields are used to generate the Direct Hire Clearance document.</p>
                 
                 {/* Worker Statistics Section */}
                 <div className="mb-6">
                   <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                     <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                     Worker Statistics
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-medium text-gray-700">Processed Workers (Principal):</Label>
                       <Input 
                         type="number"
                         value={formData.processed_workers_principal}
                         onChange={(e) => {
                           const value = e.target.value
                           // Only allow digits and empty string
                           if (value === '' || /^\d+$/.test(value)) {
                             setFormData({ ...formData, processed_workers_principal: value })
                           }
                         }}
                         className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                         placeholder="e.g., 10"
                         min="0"
                       />
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-gray-700">Processed Workers (LAS):</Label>
                       <Input 
                         type="number"
                         value={formData.processed_workers_las}
                         onChange={(e) => {
                           const value = e.target.value
                           // Only allow digits and empty string
                           if (value === '' || /^\d+$/.test(value)) {
                             setFormData({ ...formData, processed_workers_las: value })
                           }
                         }}
                         className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                         placeholder="e.g., 8"
                         min="0"
                       />
                     </div>
                   </div>
                   
                   {/* Screenshot 1 - Below Processed Workers */}
                   <div className="mt-4">
                     <Label className="text-sm font-medium text-gray-700">Screenshot for No. of Processed Workers in Principal and Landbased Accreditation System</Label>
                     <div className="mt-2 flex gap-2">
                       <Input 
                         type="file" 
                         accept="image/*" 
                         className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                         onChange={(e) => {
                           const file = e.target.files?.[0] || null
                           if (file) {
                             setDocFiles(prev => ({ ...prev, screenshot1: file }))
                             // Create a preview URL for the screenshot
                             const url = URL.createObjectURL(file)
                             setDocMetadata(prev => ({ ...prev, screenshot1_url: url }))
                           }
                         }}
                       />
                       {clipboardSupported && (
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => handlePasteFromClipboardWrapper('screenshot1')}
                           className="flex items-center gap-2"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                           </svg>
                           Paste
                         </Button>
                       )}
                     </div>
                     {(docMetadata.screenshot1_url || (docFiles.screenshot1 && (docFiles.screenshot1 as any).uploaded)) && (
                       <div className="mt-3">
                         <p className="text-xs text-green-600 mb-2 flex items-center">
                           <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                           {docFiles.screenshot1 && (docFiles.screenshot1 as any).uploaded ? 'Previously uploaded' : 'Screenshot selected'}
                         </p>
                         <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                           <img 
                             src={docMetadata.screenshot1_url || '/api/documents/placeholder'} 
                             alt="Screenshot preview" 
                             className="max-w-full max-h-full object-contain rounded"
                             onError={(e) => {
                               // Fallback if image fails to load
                               e.currentTarget.src = '/api/documents/placeholder'
                             }}
                           />
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Verification Details Section */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                     <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                     Verification Details
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-medium text-gray-700">Employment Contract Verified by:</Label>
                       <select 
                         className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm mt-1 h-10 focus:border-blue-500 focus:ring-blue-500"
                         value={formData.verifier_type}
                         onChange={(e) => setFormData({ ...formData, verifier_type: e.target.value as any })}
                       >
                         <option value="">----</option>
                         <option value="MWO">MWO</option>
                         <option value="PEPCG">PE/PCG</option>
                         <option value="OTHERS">Others</option>
                       </select>
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-gray-700">Verification Date:</Label>
                       <Input 
                         type="date"
                         value={formData.verified_date}
                         onChange={(e) => setFormData({ ...formData, verified_date: e.target.value })}
                         className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                         max={new Date().toISOString().split('T')[0]}
                       />
                       
                     </div>
                     
                     {/* Conditional fields based on verifier type */}
                     {formData.verifier_type === 'MWO' && (
                       <div className="md:col-span-2">
                         <Label className="text-sm font-medium text-gray-700">MWO Office:</Label>
                         <Input 
                           value={formData.verifier_office}
                           onChange={(e) => setFormData({ ...formData, verifier_office: e.target.value.toUpperCase() })}
                           className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                           placeholder="Enter MWO office name"
                         />
                       </div>
                     )}
                     {formData.verifier_type === 'PEPCG' && (
                       <div className="md:col-span-2">
                         <Label className="text-sm font-medium text-gray-700">PE/PCG City/Office:</Label>
                         <Input 
                           value={formData.pe_pcg_city}
                           onChange={(e) => setFormData({ ...formData, pe_pcg_city: e.target.value })}
                           className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                           placeholder="Enter city or office name"
                         />
                       </div>
                     )}
                     {formData.verifier_type === 'OTHERS' && (
                       <div className="md:col-span-2">
                         <Label className="text-sm font-medium text-gray-700">Specify Other Verifier:</Label>
                         <Input 
                           value={formData.others_text}
                           onChange={(e) => setFormData({ ...formData, others_text: e.target.value })}
                           className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                           placeholder="Enter verifier details"
                         />
                       </div>
                     )}
                     
                     {/* Screenshot 2 - MWO/POLO/PE/PCG Validation Screenshot */}
                     <div>
                       <Label className="text-sm font-medium text-gray-700">MWO/POLO/PE/PCG Validation Screenshot</Label>
                       <div className="mt-2 flex gap-2">
                         <Input 
                           type="file" 
                           accept="image/*" 
                           className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                           onChange={(e) => {
                             const file = e.target.files?.[0] || null
                             if (file) {
                               setDocFiles(prev => ({ ...prev, screenshot2: file }))
                               // Create a preview URL for the screenshot
                               const url = URL.createObjectURL(file)
                               setDocMetadata(prev => ({ ...prev, screenshot2_url: url }))
                             }
                           }}
                         />
                         {clipboardSupported && (
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => handlePasteFromClipboardWrapper('screenshot2')}
                             className="flex items-center gap-2"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                             </svg>
                             Paste
                           </Button>
                         )}
                       </div>
                       {(docMetadata.screenshot2_url || (docFiles.screenshot2 && (docFiles.screenshot2 as any).uploaded)) && (
                         <div className="mt-3">
                           <p className="text-xs text-green-600 mb-2 flex items-center">
                             <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                             {docFiles.screenshot2 && (docFiles.screenshot2 as any).uploaded ? 'Previously uploaded' : 'Screenshot selected'}
                           </p>
                           <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                             <img 
                               src={docMetadata.screenshot2_url || '/api/documents/placeholder'} 
                               alt="Screenshot preview" 
                               className="max-w-full max-h-full object-contain rounded"
                               onError={(e) => {
                                 // Fallback if image fails to load
                                 e.currentTarget.src = '/api/documents/placeholder'
                               }}
                             />
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               </div>

              {/* Time Received and Time Released */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Time Received:</Label>
                  <Input
                    type="datetime-local"
                    value={formData.time_received}
                    onChange={(e) => setFormData({ ...formData, time_received: e.target.value })}
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Time Released:</Label>
                  <Input
                    type="datetime-local"
                    value={formData.time_released}
                    onChange={(e) => setFormData({ ...formData, time_released: e.target.value })}
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

               {/* Navigation buttons for Form 3 */}
               <div className="flex justify-between pt-6">
                 <Button 
                   onClick={() => setActiveTile('form2')}
                   variant="outline"
                 >
                   Previous
                 </Button>
                <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#1976D2] hover:bg-[#1565C0]" 
                    onClick={() => {
                      if (applicationId) {
                        // Show confirmation modal for editing
                        setUpdateConfirmOpen(true)
                      } else {
                        // Confirm before creating new applications
                        setCreateConfirmOpen(true)
                      }
                    }}
                       disabled={loading || getMissingFields(formData, docMetadata, docFiles).length > 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {applicationId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                         applicationId ? 'Update' : 
                         getMissingFields(formData, docMetadata, docFiles).length > 0 ? 
                           `Complete ${getMissingFields(formData, docMetadata, docFiles).length} more field${getMissingFields(formData, docMetadata, docFiles).length > 1 ? 's' : ''}` : 
                           'Create'
                  )}
                </Button>
              </div>
              </div>
            </div>
           )}

          </div>
        </div>
        
        {/* Missing Fields Indicator */}
        {getMissingFields(formData, docMetadata, docFiles).length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
        </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Missing Required Fields
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p className="mb-2">Please complete the following fields before submitting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {getMissingFields(formData, docMetadata, docFiles).map((field, index) => (
                      <li key={index} className="font-medium">{field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draft Confirmation Dialog */}
      <AlertDialog open={draftConfirmOpen} onOpenChange={setDraftConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {applicationId ? 'Save Draft Changes' : 'Save as Draft'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {applicationId ? 'save changes to' : 'save'} the draft for <strong>{formData.name}</strong>?
              <br /><br />
              This will {applicationId ? 'update the existing draft' : 'create a new draft'} that you can continue editing later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDraftConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {applicationId ? 'Save Changes' : 'Save Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Confirmation Dialog */}
      <AlertDialog open={updateConfirmOpen} onOpenChange={() => {
        // Prevent automatic closing - only allow explicit closing
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Application Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the application for <strong>{formData.name}</strong>?<br />
              This will modify the application information and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseUpdateModal}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUpdateApplication}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Confirmation Dialog */}
      <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Application Creation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a new Direct Hire application for <strong>{formData.name || 'this worker'}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreateConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setCreateConfirmOpen(false); await handleCreateApplication() }} className="bg-blue-600 hover:bg-blue-700 text-white">Confirm Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
