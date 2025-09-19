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
  const [activeTile, setActiveTile] = useState<'form1' | 'form2'>('form1')

  // Get current user for evaluator
  const currentUser = getUser()



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

  // Validation function for drafts (only requires name)
  const validateDraftForm = (): string[] => {
    const errors: string[] = [];
    
    // Draft validation - only requires worker name
    if (!formData.name.trim()) {
      errors.push("Worker name is required");
    }
    
    return errors;
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
  })

  const handleDocChange = (key: string, file: File | null) => {
    setDocFiles(prev => ({ ...prev, [key]: file }))
  }

  const uploadSelectedDocuments = async (createdId: string) => {
    const entries = Object.entries(docFiles).filter(([_, f]) => !!f)
    for (const [documentType, file] of entries) {
      if (!file) continue
      const fd = new FormData()
      fd.append('file', file)
      fd.append('applicationId', createdId)
      fd.append('applicationType', 'direct_hire')
      fd.append('documentType', documentType)
      try {
        await fetch('/api/documents/upload', { method: 'POST', body: fd })
      } catch {}
    }
  }

  // Handle application update
  const handleUpdateApplication = async () => {
    // Validate form first
    const validationErrors = validateForm();
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
        : convertToUSD(newSalary, formData.salaryCurrency)
      
      // Use direct API call to ensure raw_salary and salary_currency are updated
      const response = await fetch(`/api/direct-hire/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          // pass-through meta also supported by backend
          for_interview_meta: (function(){
            const p = Number(formData.processed_workers_principal)
            const l = Number(formData.processed_workers_las)
            return (isFinite(p) || isFinite(l)) ? {
              processed_workers_principal: isFinite(p) ? p : undefined,
              processed_workers_las: isFinite(l) ? l : undefined,
            } : undefined
          })(),
          for_confirmation_meta: (function(){
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
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update application')
      }

      // Upload selected documents
      try { if (applicationId) await uploadSelectedDocuments(applicationId) } catch {}

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
    const validationErrors = validateForm();
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
          try { await uploadSelectedDocuments(createdId) } catch (error) {
            console.error('Error uploading documents:', error)
          }
        }

        // Generate comprehensive clearance document
        if (createdId) {
          try {
            const clearanceResponse = await fetch(`/api/direct-hire/${createdId}/comprehensive-clearance?override=true`, {
              method: 'POST'
            })
            if (clearanceResponse.ok) {
              toast({
                title: 'Comprehensive Clearance Generated',
                description: 'The comprehensive clearance document has been created and attached.',
              })
            }
          } catch (error) {
            console.error('Error generating comprehensive clearance:', error)
            // Don't fail the entire operation if clearance generation fails
          }
        }

        // Ensure parent refresh completes before toast
        await onSuccess?.()
        onClose();
        toast({
          title: 'Application created successfully!',
          description: `${formData.name} has been added to the system with comprehensive clearance generated`,
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
      <div className={`relative bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-150 ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Tile Navigation */}
          <div className="flex mb-6">
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
                <Calculator className="h-4 w-4" />
                Additional Details & Documents
              </div>
            </button>
          </div>

          {/* Tile Content */}
          {activeTile === 'form1' && (
            <div className="space-y-4">
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
                      className="w-full border rounded px-3 py-2 text-sm"
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
                      className="w-full border rounded px-3 py-2 text-sm"
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
             <div className="space-y-6">
               {/* Additional Details for Comprehensive Clearance */}
               <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                   <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                   Additional Details for Comprehensive Clearance
                 </h3>
                 <p className="text-sm text-gray-600 mb-4">These fields are used to generate the comprehensive clearance document.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label className="text-sm font-medium">Processed Workers (Principal):</Label>
                     <Input 
                       type="number"
                       value={formData.processed_workers_principal}
                       onChange={(e) => setFormData({ ...formData, processed_workers_principal: e.target.value })}
                       className="mt-1"
                       placeholder="e.g., 10" 
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium">Processed Workers (LAS):</Label>
                     <Input 
                       type="number"
                       value={formData.processed_workers_las}
                       onChange={(e) => setFormData({ ...formData, processed_workers_las: e.target.value })}
                       className="mt-1"
                       placeholder="e.g., 8" 
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium">Verifier Type:</Label>
                     <select 
                       className="w-full border rounded px-3 py-2 text-sm mt-1"
                       value={formData.verifier_type}
                       onChange={(e) => setFormData({ ...formData, verifier_type: e.target.value as any })}
                     >
                       <option value="">----</option>
                       <option value="MWO">MWO</option>
                       <option value="PEPCG">PE/PCG</option>
                       <option value="OTHERS">Others</option>
                     </select>
                   </div>
                   {formData.verifier_type === 'MWO' && (
                     <div>
                       <Label className="text-sm font-medium">MWO Office:</Label>
                       <Input 
                         value={formData.verifier_office}
                         onChange={(e) => setFormData({ ...formData, verifier_office: e.target.value.toUpperCase() })}
                         className="mt-1"
                         placeholder="Office"
                       />
                     </div>
                   )}
                   {formData.verifier_type === 'PEPCG' && (
                     <div>
                       <Label className="text-sm font-medium">PE/PCG City/Office:</Label>
                       <Input 
                         value={formData.pe_pcg_city}
                         onChange={(e) => setFormData({ ...formData, pe_pcg_city: e.target.value })}
                         className="mt-1"
                         placeholder="City/Office"
                       />
                     </div>
                   )}
                   {formData.verifier_type === 'OTHERS' && (
                     <div>
                       <Label className="text-sm font-medium">Specify:</Label>
                       <Input 
                         value={formData.others_text}
                         onChange={(e) => setFormData({ ...formData, others_text: e.target.value })}
                         className="mt-1"
                         placeholder="Details"
                       />
                     </div>
                   )}
                   <div>
                     <Label className="text-sm font-medium">Verification Date:</Label>
                     <Input 
                       type="date"
                       value={formData.verified_date}
                       onChange={(e) => setFormData({ ...formData, verified_date: e.target.value })}
                       className="mt-1"
                     />
                   </div>
                 </div>
               </div>

               {/* Document Checklist (Evaluated) */}
               <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                   <FileText className="h-5 w-5 mr-2 text-green-600" />
                   Document Checklist for Evaluated
                 </h3>
                 <p className="text-sm text-gray-600 mb-4">Upload required and optional documents for the evaluated status.</p>
                 
                 {/* Required Documents */}
                 <div className="mb-6">
                   <h4 className="text-sm font-medium text-red-600 mb-3">Required Documents</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-medium">Passport</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('passport', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Work Visa / Entry Permit</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('work_visa', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Employment Contract / Offer</Label>
                       <Input type="file" accept=".pdf,image/*,.doc,.docx" className="mt-1" onChange={(e)=>handleDocChange('employment_contract', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">TESDA/PRC License</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('tesda_license', e.target.files?.[0]||null)} />
                     </div>
                   </div>
                 </div>

                 {/* Optional Documents */}
                 <div>
                   <h4 className="text-sm font-medium text-blue-600 mb-3">Optional Documents</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-medium">Country-specific Requirement</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('country_specific', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Compliance Form</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('compliance_form', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Medical Certificate</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('medical_certificate', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">PEOS Certificate</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('peos_certificate', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Clearance</Label>
                       <Input type="file" accept=".pdf,image/*,.doc,.docx" className="mt-1" onChange={(e)=>handleDocChange('clearance', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Insurance Coverage</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('insurance_coverage', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">e-Registration</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('eregistration', e.target.files?.[0]||null)} />
                     </div>
                     <div>
                       <Label className="text-sm font-medium">PDOS Certificate</Label>
                       <Input type="file" accept=".pdf,image/*" className="mt-1" onChange={(e)=>handleDocChange('pdos_certificate', e.target.files?.[0]||null)} />
                     </div>
                   </div>
                 </div>
               </div>

               {/* Navigation buttons for Form 2 */}
               <div className="flex justify-between pt-6">
                 <Button 
                   variant="outline"
                   onClick={() => setActiveTile('form1')}
                 >
                   Back: Basic Information
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
                     disabled={loading || !formData.name || !formData.jobsite || !formData.position || !formData.salary}
                   >
                     {loading ? (
                       <>
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                         {applicationId ? 'Updating...' : 'Creating...'}
                       </>
                     ) : (
                       applicationId ? 'Update' : 'Create'
                     )}
                   </Button>
                 </div>
               </div>
             </div>
           )}



        </div>
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
