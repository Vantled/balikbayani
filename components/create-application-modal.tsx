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
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { getUser } from "@/lib/auth"
import React from "react"


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
  const { toast } = useToast()
  const { createApplication, updateApplication, refreshApplications } = useDirectHireApplications()
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cellphone: "",
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
  })

  // Tile navigation state
  const [activeTile, setActiveTile] = useState<'form1' | 'form2' | 'form3'>('form1')

  // Get current user for evaluator
  const currentUser = getUser()

  // Date validation helpers
  const getMinDate = () => {
    const today = new Date()
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    return oneYearFromNow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getPassportMinDate = () => {
    const today = new Date()
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    return oneYearFromNow.toISOString().split('T')[0]
  }

  const getVisaValidityMinDate = () => {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    return tomorrow.toISOString().split('T')[0]
  }

  // Helper function to create document checklist item
  const createDocumentItem = (key: string, title: string, isRequired: boolean = true, children?: React.ReactNode) => {
    const file = docFiles[key as keyof typeof docFiles]
    const isDragOver = dragOver === key
    const isUploaded = file && (file as any).uploaded === true
    const fileName = file ? (file as any).name || file.name : ''
    
    return (
      <div 
        className={`bg-white p-4 rounded-lg border transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50 shadow-lg' 
            : 'border-gray-200 hover:shadow-md'
        }`}
        onDragOver={(e) => handleDragOver(e, key)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, key)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0">
              {file ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
              )}
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900">{title}</h5>
              {file && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 flex items-center">
                    <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                    {isUploaded ? `Previously uploaded: ${fileName}` : fileName}
                  </p>
                  {children}
                </div>
              )}
              {isDragOver && !file && (
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Drop file here
                </p>
              )}
            </div>
          </div>
          <label htmlFor={`${key}-upload`} className="cursor-pointer">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
              isDragOver 
                ? 'bg-blue-200 text-blue-800' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium">{isUploaded ? 'Replace' : 'Upload'}</span>
              <input
                id={`${key}-upload`}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => handleDocChange(key as keyof typeof docFiles, e.target.files?.[0] || null)}
              />
            </div>
          </label>
        </div>
      </div>
    )
  }



  // Confirmation dialog states
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  // Custom close handler for update confirmation modal
  const handleCloseUpdateModal = () => {
    setUpdateConfirmOpen(false);
    setPassword("");
    setPasswordError("");
  };
  


  // Generate control number preview
  const generateControlNumberPreview = async () => {
    try {
      const response = await fetch('/api/direct-hire/preview');
      const result = await response.json();
      
      if (result.success) {
        const { monthlyCount, yearlyCount } = result.data;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const monthDay = `${month}${day}`;
        
        const monthlyCountStr = String(monthlyCount).padStart(3, '0');
        const yearlyCountStr = String(yearlyCount).padStart(3, '0');
        
        return `DHPSW-ROIVA-${year}-${monthDay}-${monthlyCountStr}-${yearlyCountStr}`;
      } else {
        // Fallback to placeholder if API fails
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const monthDay = `${month}${day}`;
        
        return `DHPSW-ROIVA-${year}-${monthDay}-001-001`;
      }
    } catch (error) {
      console.error('Error fetching control number preview:', error);
      // Fallback to placeholder if API fails
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const monthDay = `${month}${day}`;
      
      return `DHPSW-ROIVA-${year}-${monthDay}-001-001`;
    }
  };

  // Get converted USD amount for display
  const getUSDEquivalentDisplay = (): string => {
    if (!formData.salary || isNaN(parseFloat(formData.salary)) || !formData.salaryCurrency) return "";
    return getUSDEquivalent(parseFloat(formData.salary), formData.salaryCurrency);
  };

  // Validation function
  const validateForm = (): string[] => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
    
    // Form 1 validation
    if (!formData.name.trim() || !formData.jobsite.trim() || !formData.position.trim() || 
        !formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0 ||
        !formData.sex || !formData.job_type || !formData.salaryCurrency) {
      errors.push("Form 1 is incomplete");
    }
    // Optional but must be valid if provided
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push("Email address is invalid")
    }
    if (formData.cellphone && formData.cellphone.replace(/\D/g, '').length !== 11) {
      errors.push("Cellphone number must be 11 digits")
    }
    
    return errors;
  };

  // Enhanced validation function that shows specific missing fields
  const validateFormWithMissingFields = (): string[] => {
    const missingFields = getMissingFields();
    if (missingFields.length > 0) {
      return [`Please complete the following required fields: ${missingFields.join(', ')}`];
    }
    return [];
  };

  // Validation function for drafts (only requires name)
  const validateDraftForm = (): string[] => {
    const errors: string[] = [];
    
    // Draft validation - only requires worker name
    if (!formData.name.trim()) {
      errors.push("Worker name is required");
    }
    
    return errors;
  };

  // Missing field validation function - identifies specific unfilled required fields
  const getMissingFields = (): string[] => {
    const missingFields: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    
    // Basic Information (Form 1) - Required fields
    if (!formData.name.trim()) missingFields.push("Worker Name");
    if (!formData.jobsite.trim()) missingFields.push("Jobsite");
    if (!formData.position.trim()) missingFields.push("Position");
    if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) {
      missingFields.push("Salary");
    }
    if (!formData.sex) missingFields.push("Sex");
    if (!formData.job_type) missingFields.push("Job Type");
    if (!formData.salaryCurrency) missingFields.push("Salary Currency");
    
    // Basic Information (Form 1) - Optional but must be valid if provided
    if (formData.email && !emailRegex.test(formData.email)) {
      missingFields.push("Valid Email Address");
    }
    if (formData.cellphone && formData.cellphone.replace(/\D/g, '').length !== 11) {
      missingFields.push("Valid Cellphone Number (11 digits)");
    }
    
    // Additional Details (Form 3) - Required fields
    if (!formData.processed_workers_principal || formData.processed_workers_principal.trim() === '') {
      missingFields.push("No. of Processed Workers in Principal");
    }
    if (!formData.processed_workers_las || formData.processed_workers_las.trim() === '') {
      missingFields.push("No. of Processed Workers in LAS");
    }
    if (!formData.verifier_type) missingFields.push("Employment Contract Verified by");
    if (!formData.verified_date) missingFields.push("Verification Date");
    
    // Conditional required fields based on verifier type
    if (formData.verifier_type === 'MWO' && (!formData.verifier_office || formData.verifier_office.trim() === '')) {
      missingFields.push("MWO Office");
    }
    if (formData.verifier_type === 'PEPCG' && (!formData.pe_pcg_city || formData.pe_pcg_city.trim() === '')) {
      missingFields.push("PE/PCG City/Office");
    }
    if (formData.verifier_type === 'OTHERS' && (!formData.others_text || formData.others_text.trim() === '')) {
      missingFields.push("Specify Other Verifier");
    }
    
    // Screenshot requirements - check both new uploads and previously uploaded
    const hasScreenshot1 = docMetadata.screenshot1_url || (docFiles.screenshot1 && (docFiles.screenshot1 as any).uploaded)
    const hasScreenshot2 = docMetadata.screenshot2_url || (docFiles.screenshot2 && (docFiles.screenshot2 as any).uploaded)
    
    if (!hasScreenshot1) {
      missingFields.push("Screenshot for No. of Processed Workers");
    }
    if (!hasScreenshot2) {
      missingFields.push("MWO/POLO/PE/PCG Validation Screenshot");
    }
    
    return missingFields;
  };

  // Save draft function
  const handleSaveDraft = async () => {
    // Validate form first
    const validationErrors = validateDraftForm();
    const fieldErrors = getFieldErrors(true);
    
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

  // Get field-specific validation errors
  const getFieldErrors = (isDraft: boolean = false): {[key: string]: string} => {
    const errors: {[key: string]: string} = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    // Only validate other fields if not saving as draft
    if (!isDraft) {
      if (!formData.sex) {
        errors.sex = "Sex is required";
      }
      if (!formData.job_type) {
        errors.job_type = "Job type is required";
      }
      if (!formData.jobsite.trim()) {
        errors.jobsite = "Jobsite is required";
      }
      if (!formData.position.trim()) {
        errors.position = "Position is required";
      }
      if (!formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0) {
        errors.salary = "Valid salary is required";
      }
      if (!formData.salaryCurrency) {
        errors.salaryCurrency = "Currency is required";
      }
      if (formData.email && !emailRegex.test(formData.email)) {
        errors.email = "Enter a valid email"
      }
      if (formData.cellphone && formData.cellphone.replace(/\D/g, '').length !== 11) {
        errors.cellphone = "Must be 11 digits"
      }
    }
    
    return errors;
  };

  // Clear error for a specific field when user starts typing
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
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
        salary: (initialData as any).raw_salary && (initialData as any).raw_salary > 0 ? String((initialData as any).raw_salary) : (initialData.salary && initialData.salary > 0 ? String(initialData.salary) : ''),
        salaryCurrency: (initialData as any).salary_currency ?? (initialData as any).salaryCurrency ?? 'USD',
        employer: (initialData as any).employer ?? '',
        raw_salary: (initialData as any).raw_salary ?? initialData.salary
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
              
              // Update form data with both basic information and additional details
              const updatedFormData = {
                ...formData,
                // Basic information
                name: application.name ?? '',
                email: application.email ?? '',
                cellphone: application.cellphone ?? '',
                sex: application.sex ?? 'male',
                job_type: application.job_type ?? 'professional',
                jobsite: application.jobsite && application.jobsite !== 'To be filled' ? application.jobsite : '',
                position: application.position && application.position !== 'To be filled' ? application.position : '',
                salary: application.raw_salary && application.raw_salary > 0 ? String(application.raw_salary) : (application.salary && application.salary > 0 ? String(application.salary) : ''),
                salaryCurrency: application.salary_currency ?? 'USD',
                employer: application.employer ?? '',
                raw_salary: application.raw_salary ?? application.salary,
                // Additional details
                processed_workers_principal: interviewMeta.processed_workers_principal !== undefined ? String(interviewMeta.processed_workers_principal) : '',
                processed_workers_las: interviewMeta.processed_workers_las !== undefined ? String(interviewMeta.processed_workers_las) : '',
                verifier_type: confirmationMeta.verifier_type || '',
                verifier_office: confirmationMeta.verifier_office || '',
                pe_pcg_city: confirmationMeta.pe_pcg_city || '',
                others_text: confirmationMeta.others_text || '',
                verified_date: confirmationMeta.verified_date || ''
              }
              setFormData(updatedFormData)
              setOriginalFormData(updatedFormData)
              
              // Fetch and populate documents
              const docsResponse = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
              if (docsResponse.ok) {
                const docsData = await docsResponse.json()
                const documents = docsData.data || []
                
                // Process documents and populate docMetadata
                const newDocMetadata: any = {}
                const newDocFiles: any = {}
                
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
                    newDocMetadata.screenshot1_url = doc.file_path || ''
                  } else if (docType === 'confirmation_verification_image') {
                    newDocMetadata.screenshot2_url = doc.file_path || ''
                  }
                  
                  // Mark document as uploaded
                  const formDocType = getFormDocumentType(docType)
                  if (formDocType) {
                    newDocFiles[formDocType] = { name: doc.file_name, uploaded: true }
                  }
                })
                
                setDocMetadata(prev => ({ ...prev, ...newDocMetadata }))
                setDocFiles(prev => ({ ...prev, ...newDocFiles }))
                
                // Store original data for comparison
                setOriginalDocMetadata({ ...docMetadata, ...newDocMetadata })
                setOriginalDocFiles({ ...docFiles, ...newDocFiles })
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

  // Helper function to map database document types to form document types
  const getFormDocumentType = (dbDocType: string): string | null => {
    const mapping: { [key: string]: string } = {
      'passport': 'passport',
      'work_visa': 'work_visa',
      'employment_contract': 'employment_contract',
      'tesda_license': 'tesda_license',
      'country_specific': 'country_specific',
      'compliance_form': 'compliance_form',
      'medical_certificate': 'medical_certificate',
      'peos_certificate': 'peos_certificate',
      'clearance': 'clearance',
      'insurance_coverage': 'insurance_coverage',
      'eregistration': 'eregistration',
      'pdos_certificate': 'pdos_certificate',
      'for_interview_screenshot': 'screenshot1',
      'confirmation_verification_image': 'screenshot2'
    }
    return mapping[dbDocType] || null
  }

  // Helper function to detect changes in form data
  const getChangedFormData = () => {
    if (!originalFormData) return formData
    
    const changes: any = {}
    const fieldsToCheck = [
      // Basic information fields
      'name', 'email', 'cellphone', 'sex', 'job_type', 'jobsite', 'position', 
      'salary', 'salaryCurrency', 'employer',
      // Additional details fields
      'processed_workers_principal', 'processed_workers_las', 'verifier_type', 
      'verifier_office', 'pe_pcg_city', 'others_text', 'verified_date'
    ]
    
    fieldsToCheck.forEach(field => {
      if ((formData as any)[field] !== (originalFormData as any)[field]) {
        changes[field] = (formData as any)[field]
      }
    })
    
    return Object.keys(changes).length > 0 ? changes : null
  }

  // Helper function to detect changes in document metadata
  const getChangedDocMetadata = () => {
    if (!originalDocMetadata) return docMetadata
    
    const changes: any = {}
    const fieldsToCheck = [
      'passport_number', 'passport_expiry', 'visa_category', 'visa_type', 
      'visa_number', 'visa_validity', 'ec_issued_date', 'ec_verification',
      'screenshot1_url', 'screenshot2_url'
    ]
    
    fieldsToCheck.forEach(field => {
      if (docMetadata[field] !== originalDocMetadata[field]) {
        changes[field] = docMetadata[field]
      }
    })
    
    return Object.keys(changes).length > 0 ? changes : null
  }

  // Helper function to detect new document uploads
  const getNewDocumentUploads = () => {
    if (!originalDocFiles) return docFiles
    
    const newUploads: any = {}
    Object.keys(docFiles).forEach(key => {
      const currentFile = docFiles[key]
      const originalFile = originalDocFiles[key]
      
      // Check if there's a new file upload (not previously uploaded and is an actual File object)
      if (currentFile && 
          !(currentFile as any).uploaded && 
          currentFile instanceof File &&
          (!originalFile || originalFile !== currentFile)) {
        newUploads[key] = currentFile
      }
    })
    
    return Object.keys(newUploads).length > 0 ? newUploads : null
  }

  // Handle password confirmation
  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser?.username || '',
          password: password
        })
      });

          const result = await response.json();
          
      if (result.success) {
        setPasswordError("");
        setPassword("");
        handleCloseUpdateModal();
        // Proceed with update after password confirmation
        handleUpdateApplication();
      } else {
        setPasswordError("Incorrect password");
        // Keep modal open for incorrect password
      }
    } catch (error) {
      setPasswordError("Failed to verify password");
      // Keep modal open for errors
    }
  };

  // Document checklist state (Evaluated)
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
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
  const [docMetadata, setDocMetadata] = useState<Record<string, any>>({
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
  const [originalFormData, setOriginalFormData] = useState<any>(null)
  const [originalDocMetadata, setOriginalDocMetadata] = useState<any>(null)
  const [originalDocFiles, setOriginalDocFiles] = useState<any>(null)

  const handleDocChange = (key: string, file: File | null) => {
    setDocFiles(prev => ({ ...prev, [key]: file }))
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    setDragOver(key)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    setDragOver(null)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      // Check if file type is allowed
      const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf'
      if (isAllowedType) {
        handleDocChange(key, file)
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload only PDF, PNG, or JPEG files',
          variant: 'destructive'
        })
      }
    }
  }

  // Clipboard paste handlers
  const handlePasteFromClipboard = async (screenshotKey: 'screenshot1' | 'screenshot2') => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
        toast({
          title: 'Clipboard Not Supported',
          description: 'Your browser does not support clipboard access. Please use the file upload instead.',
          variant: 'destructive'
        })
        return
      }

      const clipboardItems = await navigator.clipboard.read()
      let imageFound = false

      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type)
            const file = new File([blob], `screenshot-${Date.now()}.${type.split('/')[1]}`, { type })
            
            // Store the file in docFiles
            setDocFiles(prev => ({ ...prev, [screenshotKey]: file }))
            
            // Create a preview URL for the screenshot
            const url = URL.createObjectURL(file)
            setDocMetadata(prev => ({ ...prev, [`${screenshotKey}_url`]: url }))
            
            toast({
              title: 'Screenshot Pasted',
              description: 'Image has been pasted from clipboard successfully.',
            })
            imageFound = true
            break
          }
        }
        if (imageFound) break
      }

      if (!imageFound) {
        toast({
          title: 'No Image Found',
          description: 'No image found in clipboard. Please copy an image first.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error)
      toast({
        title: 'Paste Failed',
        description: 'Failed to paste image from clipboard. Please try using file upload instead.',
        variant: 'destructive'
      })
    }
  }

  // Check clipboard support on component mount
  React.useEffect(() => {
    if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
      setClipboardSupported(true)
    }
  }, [])

  const uploadSelectedDocuments = async (createdId: string) => {
    const entries = Object.entries(docFiles).filter(([_, f]) => !!f)
    
    // Upload regular documents
    for (const [documentType, file] of entries) {
      if (!file) continue
      
      // Prepare metadata for this document type
      const metadata: any = {}
      if (documentType === 'passport') {
        if (docMetadata.passport_number) metadata.passport_number = docMetadata.passport_number
        if (docMetadata.passport_expiry) metadata.passport_expiry = docMetadata.passport_expiry
      } else if (documentType === 'work_visa') {
        if (docMetadata.visa_category) metadata.visa_category = docMetadata.visa_category
        if (docMetadata.visa_type) metadata.visa_type = docMetadata.visa_type
        if (docMetadata.visa_validity) metadata.visa_validity = docMetadata.visa_validity
        if (docMetadata.visa_number) metadata.visa_number = docMetadata.visa_number
      } else if (documentType === 'employment_contract') {
        if (docMetadata.ec_issued_date) metadata.ec_issued_date = docMetadata.ec_issued_date
        if (docMetadata.ec_verification) metadata.ec_verification = docMetadata.ec_verification
      }
      
      // Map screenshot types to their document types for the database
      let dbDocumentType = documentType
      if (documentType === 'screenshot1') {
        dbDocumentType = 'for_interview_screenshot'
      } else if (documentType === 'screenshot2') {
        dbDocumentType = 'confirmation_verification_image'
      }
      
      const fd = new FormData()
      fd.append('file', file)
      fd.append('applicationId', createdId)
      fd.append('applicationType', 'direct_hire')
      fd.append('documentName', dbDocumentType)
      if (Object.keys(metadata).length > 0) {
        fd.append('meta', JSON.stringify(metadata))
      }
      
      try {
        const response = await fetch('/api/documents/upload', { method: 'POST', body: fd })
        const result = await response.json()
        if (result.success) {
          // Document uploaded successfully
        } else {
          console.error('Failed to upload document:', documentType, result.error)
        }
      } catch (error) {
        console.error('Error uploading document:', documentType, error)
      }
    }
    
    // Upload screenshots if they exist
    const screenshotFiles = document.querySelectorAll('input[type="file"][accept="image/*"]') as NodeListOf<HTMLInputElement>
    for (const input of screenshotFiles) {
      const file = input.files?.[0]
      if (!file) continue
      
      const isScreenshot1 = input.previousElementSibling?.textContent?.includes('Screenshot 1')
      const documentType = isScreenshot1 ? 'for_interview_screenshot' : 'confirmation_verification_image'
      
      const fd = new FormData()
      fd.append('file', file)
      fd.append('applicationId', createdId)
      fd.append('applicationType', 'direct_hire')
      fd.append('documentName', documentType)
      
      try {
        const response = await fetch('/api/documents/upload', { method: 'POST', body: fd })
        const result = await response.json()
        if (result.success) {
          // Screenshot uploaded successfully
        } else {
          console.error('Failed to upload screenshot:', documentType, result.error)
        }
      } catch (error) {
        console.error('Error uploading screenshot:', documentType, error)
      }
    }
  }

  // Handle application update
  const handleUpdateApplication = async () => {
    // Validate form first
    const validationErrors = validateFormWithMissingFields();
    const fieldErrors = getFieldErrors(false);
    
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
      // Preserve existing status and status_checklist when editing
      const existingStatus = initialData?.status || 'pending'
      const existingStatusChecklist = initialData?.status_checklist || {
        evaluated: { checked: false, timestamp: undefined },
        for_confirmation: { checked: false, timestamp: undefined },
        emailed_to_dhad: { checked: false, timestamp: undefined },
        received_from_dhad: { checked: false, timestamp: undefined },
        for_interview: { checked: false, timestamp: undefined }
      }

      // For editing, store USD equivalent in salary field for table display, original in raw_salary
      const newSalary = parseFloat(formData.salary)
      const salaryInUSD = formData.salaryCurrency === "USD" 
        ? newSalary 
        : convertToUSD(newSalary, formData.salaryCurrency as Currency)
      
      // Get only changed form data for optimization
      const changedFormData = getChangedFormData()
      
      // Build update payload - always include basic information, conditionally include metadata
      const updatePayload: any = {
        name: formData.name,
        email: formData.email,
        cellphone: formData.cellphone,
        sex: formData.sex,
        jobsite: formData.jobsite,
        position: formData.position,
        job_type: formData.job_type,
        salary: salaryInUSD,  // Store USD equivalent for table display
        raw_salary: newSalary,  // Store original value for editing
        salary_currency: formData.salaryCurrency,  // Store original currency
        employer: formData.employer,
        evaluator: currentUser?.full_name || 'Unknown',
        status: existingStatus,
        status_checklist: existingStatusChecklist,
      }

      // Only include metadata if there are changes in additional details
      const additionalDetailsChanged = changedFormData && (
        changedFormData.processed_workers_principal !== undefined ||
        changedFormData.processed_workers_las !== undefined ||
        changedFormData.verifier_type !== undefined ||
        changedFormData.verifier_office !== undefined ||
        changedFormData.pe_pcg_city !== undefined ||
        changedFormData.others_text !== undefined ||
        changedFormData.verified_date !== undefined
      )

      if (additionalDetailsChanged) {
        updatePayload.for_interview_meta = (function(){
          const p = Number(formData.processed_workers_principal)
          const l = Number(formData.processed_workers_las)
          return (isFinite(p) || isFinite(l)) ? {
            processed_workers_principal: isFinite(p) ? p : undefined,
            processed_workers_las: isFinite(l) ? l : undefined,
          } : undefined
        })()
        updatePayload.for_confirmation_meta = (function(){
          const vt = formData.verifier_type
          if (!vt) return undefined
          return {
            verifier_type: vt,
            verifier_office: formData.verifier_office || undefined,
            pe_pcg_city: formData.pe_pcg_city || undefined,
            others_text: formData.others_text || undefined,
            verified_date: formData.verified_date || undefined,
          }
        })()
      }
      
      // Use direct API call to ensure raw_salary and salary_currency are updated
      const response = await fetch(`/api/direct-hire/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update application')
      }

      // Upload only new documents (optimization)
      try { 
        if (applicationId) {
          const newUploads = getNewDocumentUploads()
          if (newUploads) {
            // Create a temporary docFiles object with only new uploads
            const tempDocFiles = { ...docFiles }
            Object.keys(docFiles).forEach(key => {
              if (!newUploads[key]) {
                delete tempDocFiles[key]
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
    const validationErrors = validateFormWithMissingFields();
    const fieldErrors = getFieldErrors(false);
    
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
      // Convert salary to USD for storage (only for new applications)
      const salaryInUSD = formData.salaryCurrency && formData.salary ? (
        formData.salaryCurrency === "USD" 
        ? parseFloat(formData.salary)
          : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency)
      ) : 0;

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.email) formDataToSend.append('email', formData.email);
      if (formData.cellphone) formDataToSend.append('cellphone', formData.cellphone);
      formDataToSend.append('sex', formData.sex);
      formDataToSend.append('salary', salaryInUSD.toString());
      formDataToSend.append('salaryCurrency', formData.salaryCurrency || 'USD');
      formDataToSend.append('jobsite', formData.jobsite);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('evaluator', currentUser?.full_name || 'Unknown');
      formDataToSend.append('status', 'pending');
      formDataToSend.append('documents_completed', 'false');
      formDataToSend.append('employer', formData.employer);

      // Attach metadata fields so backend persists into status_checklist
      if (formData.processed_workers_principal) formDataToSend.append('processed_workers_principal', formData.processed_workers_principal)
      if (formData.processed_workers_las) formDataToSend.append('processed_workers_las', formData.processed_workers_las)
      if (formData.verifier_type) formDataToSend.append('verifier_type', formData.verifier_type)
      if (formData.verifier_office) formDataToSend.append('verifier_office', formData.verifier_office)
      if (formData.pe_pcg_city) formDataToSend.append('pe_pcg_city', formData.pe_pcg_city)
      if (formData.others_text) formDataToSend.append('others_text', formData.others_text)
      if (formData.verified_date) formDataToSend.append('verified_date', formData.verified_date)

      const response = await fetch('/api/direct-hire', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        const createdId: string = result.data?.id || result.data?.application?.id || ''
        
        // Upload selected documents
        if (createdId) {
          try { 
            await uploadSelectedDocuments(createdId)
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
            const clearanceResponse = await fetch(`/api/direct-hire/${createdId}/comprehensive-clearance?override=true`, {
              method: 'POST'
            })
            if (clearanceResponse.ok) {
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
        throw new Error(result.error || 'Failed to create application');
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
      <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${mounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={onClose} />
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
                onClick={() => setActiveTile('form2')}
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
                onClick={() => setActiveTile('form3')}
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
                      const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11)
                      setFormData({ ...formData, cellphone: digits })
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
                <Label className="text-sm font-medium">Salary:</Label>
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

               {/* Navigation buttons for Form 1 */}
               <div className="flex justify-between pt-6">
                 <div></div>
                 <Button 
                   onClick={() => setActiveTile('form2')}
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
                     {createDocumentItem('passport', 'Passport with validity period of not less than one (1) year', true, (
                       <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
                         <div>
                           <Label className="text-xs text-gray-600">Passport Number</Label>
                           <Input 
                             type="text" 
                             className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-8" 
                             placeholder="e.g., P1234567"
                             value={docMetadata.passport_number}
                             onChange={(e) => setDocMetadata(prev => ({ ...prev, passport_number: e.target.value }))}
                           />
                         </div>
                         <div>
                           <Label className="text-xs text-gray-600">Expiry Date</Label>
                           <Input 
                             type="date" 
                             className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-8"
                             value={docMetadata.passport_expiry}
                             onChange={(e) => setDocMetadata(prev => ({ ...prev, passport_expiry: e.target.value }))}
                             min={getPassportMinDate()}
                           />
                         </div>
                       </div>
                     ))}
                     {/* Work Visa */}
                     {createDocumentItem('work_visa', 'Valid Work Visa, Entry/Work Permit (whichever is applicable per country)', true, (
                       <div className="mt-3 space-y-2 max-w-md">
                         <div className="grid grid-cols-2 gap-2">
                           <div>
                             <Label className="text-xs text-gray-600">Visa Category</Label>
                             <select 
                               className="w-full border border-gray-300 rounded px-2 py-2 text-xs h-9 focus:border-green-500 focus:ring-green-500"
                               value={docMetadata.visa_category}
                               onChange={(e) => {
                                 setDocMetadata(prev => ({ 
                                   ...prev, 
                                   visa_category: e.target.value,
                                   visa_type: '' // Reset visa type when category changes
                                 }))
                               }}
                             >
                               <option value="">----</option>
                               <option value="Temporary Work Visas (Non-Immigrant)">Temporary Work Visas (Non-Immigrant)</option>
                               <option value="Immigrant Work Visas (Employment-Based Green Cards)">Immigrant Work Visas (Employment-Based Green Cards)</option>
                               <option value="Family / Dependent Visas">Family / Dependent Visas</option>
                               <option value="Others">Others</option>
                             </select>
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600">Visa Type</Label>
                             {docMetadata.visa_category === 'Temporary Work Visas (Non-Immigrant)' ? (
                               <select 
                                 className="w-full border border-gray-300 rounded px-2 py-2 text-xs h-9 focus:border-green-500 focus:ring-green-500"
                                 value={docMetadata.visa_type}
                                 onChange={(e) => setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))}
                               >
                                 <option value="">----</option>
                                 <option value="H-1B – Skilled Workers / Professionals">H-1B – Skilled Workers / Professionals</option>
                                 <option value="H-2A – Temporary Agricultural Workers">H-2A – Temporary Agricultural Workers</option>
                                 <option value="H-2B – Temporary Non-Agricultural Workers">H-2B – Temporary Non-Agricultural Workers</option>
                                 <option value="H-3 – Trainees (non-medical, non-academic)">H-3 – Trainees (non-medical, non-academic)</option>
                                 <option value="L-1 – Intra-Company Transfers">L-1 – Intra-Company Transfers</option>
                                 <option value="O-1 – Individuals with Extraordinary Ability">O-1 – Individuals with Extraordinary Ability</option>
                                 <option value="P-1 – Athletes / Entertainers">P-1 – Athletes / Entertainers</option>
                                 <option value="TN – NAFTA/USMCA Professionals">TN – NAFTA/USMCA Professionals</option>
                               </select>
                             ) : docMetadata.visa_category === 'Immigrant Work Visas (Employment-Based Green Cards)' ? (
                               <select 
                                 className="w-full border border-gray-300 rounded px-2 py-2 text-xs h-9 focus:border-green-500 focus:ring-green-500"
                                 value={docMetadata.visa_type}
                                 onChange={(e) => setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))}
                               >
                                 <option value="">----</option>
                                 <option value="EB-1 – Priority Workers">EB-1 – Priority Workers</option>
                                 <option value="EB-2 – Professionals with Advanced Degrees">EB-2 – Professionals with Advanced Degrees</option>
                                 <option value="EB-3 – Skilled Workers, Professionals, and Other Workers">EB-3 – Skilled Workers, Professionals, and Other Workers</option>
                                 <option value="EB-4 – Special Immigrants">EB-4 – Special Immigrants</option>
                                 <option value="EB-5 – Immigrant Investors">EB-5 – Immigrant Investors</option>
                               </select>
                             ) : docMetadata.visa_category === 'Family / Dependent Visas' ? (
                               <select 
                                 className="w-full border border-gray-300 rounded px-2 py-2 text-xs h-9 focus:border-green-500 focus:ring-green-500"
                                 value={docMetadata.visa_type}
                                 onChange={(e) => setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))}
                               >
                                 <option value="">----</option>
                                 <option value="H-4 – Dependents of H Visa Holders">H-4 – Dependents of H Visa Holders</option>
                                 <option value="L-2 – Dependents of L-1 Holders">L-2 – Dependents of L-1 Holders</option>
                                 <option value="K-1 – Fiancé(e) of U.S. Citizen">K-1 – Fiancé(e) of U.S. Citizen</option>
                                 <option value="IR/CR Categories – Immediate Relative Immigrant Visas">IR/CR Categories – Immediate Relative Immigrant Visas</option>
                               </select>
                             ) : docMetadata.visa_category === 'Others' ? (
                                 <Input 
                                   type="text" 
                                   className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-9" 
                                   placeholder="Enter custom visa type"
                                   value={docMetadata.visa_type}
                                   onChange={(e) => setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))}
                                 />
                             ) : (
                               <Input 
                                 type="text" 
                                 className="text-xs border-gray-300 h-9" 
                                 placeholder="Select category first"
                                 disabled
                               />
                             )}
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>
                             <Label className="text-xs text-gray-600">Visa Number</Label>
                               <Input 
                                 type="text" 
                                 className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-9" 
                                 placeholder="e.g., V123456"
                                 value={docMetadata.visa_number}
                                 onChange={(e) => {
                                   const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                                   setDocMetadata(prev => ({ ...prev, visa_number: value }))
                                 }}
                               />
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600">Validity</Label>
                             <Input 
                               type="date" 
                               className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-9"
                               value={docMetadata.visa_validity}
                               onChange={(e) => setDocMetadata(prev => ({ ...prev, visa_validity: e.target.value }))}
                               min={getVisaValidityMinDate()}
                             />
                           </div>
                         </div>
                       </div>
                     ))}
                     {/* Employment Contract */}
                     {createDocumentItem('employment_contract', 'Employment Contract or Offer of Employment', true, (
                       <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
                         <div>
                           <Label className="text-xs text-gray-600">Issued Date</Label>
                           <Input 
                             type="date" 
                             className="text-xs border-gray-300 focus:border-green-500 focus:ring-green-500 h-8"
                             value={docMetadata.ec_issued_date}
                             onChange={(e) => setDocMetadata(prev => ({ ...prev, ec_issued_date: e.target.value }))}
                             max={getMaxDate()}
                           />
                         </div>
                         <div>
                           <Label className="text-xs text-gray-600">Verification Type</Label>
                           <select 
                             className="w-full border border-gray-300 rounded px-2 py-2 text-xs h-8 focus:border-green-500 focus:ring-green-500"
                             value={docMetadata.ec_verification}
                             onChange={(e) => setDocMetadata(prev => ({ ...prev, ec_verification: e.target.value }))}
                           >
                             <option value="">----</option>
                             <option value="POLO">POLO</option>
                             <option value="PE/Consulate for countries with no POLO">PE/Consulate for countries with no POLO</option>
                             <option value="Apostille with POLO Verification">Apostille with POLO Verification</option>
                             <option value="Apostille with PE Acknowledgement">Apostille with PE Acknowledgement</option>
                             <option value="Notarized Employment Contract for DFA">Notarized Employment Contract for DFA</option>
                             <option value="Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients">Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients</option>
                             <option value="Employment Contract with confirmation from SEM">Employment Contract with confirmation from SEM</option>
                           </select>
                         </div>
                       </div>
                     ))}

                     {/* TESDA/PRC License */}
                     {createDocumentItem('tesda_license', 'TESDA/PRC License', true)}
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
                         {createDocumentItem(key, label, false)}
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
                         {createDocumentItem(key, label, false)}
                       </div>
                     ))}
                   </div>
                 </div>
               </div>

               {/* Navigation buttons for Form 2 */}
               <div className="flex justify-end pt-6">
                 <Button 
                   onClick={() => setActiveTile('form3')}
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
                         onChange={(e) => setFormData({ ...formData, processed_workers_principal: e.target.value })}
                         className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                         placeholder="e.g., 10" 
                       />
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-gray-700">Processed Workers (LAS):</Label>
                       <Input 
                         type="number"
                         value={formData.processed_workers_las}
                         onChange={(e) => setFormData({ ...formData, processed_workers_las: e.target.value })}
                         className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                         placeholder="e.g., 8" 
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
                           onClick={() => handlePasteFromClipboard('screenshot1')}
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
                             onClick={() => handlePasteFromClipboard('screenshot2')}
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
                             />
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
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
                           // Direct create for new applications
                           handleCreateApplication()
                         }
                       }}
                       disabled={loading || getMissingFields().length > 0}
                   >
                     {loading ? (
                       <>
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           {applicationId ? 'Updating...' : 'Creating...'}
                       </>
                     ) : (
                         applicationId ? 'Update' : 
                         getMissingFields().length > 0 ? 
                           `Complete ${getMissingFields().length} more field${getMissingFields().length > 1 ? 's' : ''}` : 
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
        {getMissingFields().length > 0 && (
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
                    {getMissingFields().map((field, index) => (
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
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Enter your password to confirm:
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Enter your password"
                className={passwordError ? "border-red-500" : ""}
              />
              {passwordError && (
                <p className="text-xs text-red-500 mt-1">{passwordError}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseUpdateModal}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePasswordConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!password.trim()}
            >
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
