"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, FileText, Loader2, Calculator, Upload, Eye, Trash2, File } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { getUser } from "@/lib/auth"
import React from "react"
import PDFViewerModal from "@/components/pdf-viewer-modal"

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
  } | null
  applicationId?: string | null
  onSuccess?: () => void
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  file: File | null
  preview?: string
}

export default function CreateApplicationModal({ onClose, initialData = null, applicationId = null, onSuccess }: CreateApplicationModalProps) {
  const [activeTab, setActiveTab] = useState("form1")
  const [loading, setLoading] = useState(false)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const { toast } = useToast()
  const { createApplication, updateApplication, refreshApplications } = useDirectHireApplications()
  
  const [formData, setFormData] = useState({
    name: "",
    sex: "" as 'male' | 'female' | '',
    jobsite: "",
    position: "",
    job_type: "" as 'household' | 'professional' | '',
    salary: "",
    employer: "",
    salaryCurrency: "" as Currency | ''
  })

  // Get current user for evaluator
  const currentUser = getUser()

  const [uploadedFiles, setUploadedFiles] = useState<{
    passport: UploadedFile | null
    visa: UploadedFile | null
    tesda: UploadedFile | null
  }>({
    passport: null,
    visa: null,
    tesda: null
  })

  // Confirmation dialog states
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false)
  
  // PDF Viewer Modal state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{id?: string, name: string, fileBlob?: File | null} | null>(null)

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
    
    // Form 1 validation
    if (!formData.name.trim() || !formData.jobsite.trim() || !formData.position.trim() || 
        !formData.salary.trim() || isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) <= 0 ||
        !formData.sex || !formData.job_type || !formData.salaryCurrency) {
      errors.push("Form 1 is incomplete");
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
      formDataToSend.append('sex', formData.sex);
      formDataToSend.append('salary', rawSalary);
      formDataToSend.append('salaryCurrency', salaryCurrency);
      formDataToSend.append('jobsite', formData.jobsite.toUpperCase());
      formDataToSend.append('position', formData.position.toUpperCase());
      formDataToSend.append('evaluator', (currentUser?.full_name || 'Unknown').toUpperCase());
      formDataToSend.append('status', 'draft');
      formDataToSend.append('employer', (formData.employer || '').toUpperCase());

      if (uploadedFiles.passport && uploadedFiles.passport.file) formDataToSend.append('passport', uploadedFiles.passport.file);
      if (uploadedFiles.visa && uploadedFiles.visa.file) formDataToSend.append('visa', uploadedFiles.visa.file);
      if (uploadedFiles.tesda && uploadedFiles.tesda.file) formDataToSend.append('tesda', uploadedFiles.tesda.file);

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

  // Handle file upload
  const handleFileUpload = (fileType: 'passport' | 'visa' | 'tesda', file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload only JPEG, PNG, or PDF files.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload files smaller than 5MB.',
        variant: 'destructive'
      });
      return;
    }

    const uploadedFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    };

    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: uploadedFile
    }));

    toast({
      title: 'File uploaded successfully',
      description: `${file.name} has been uploaded.`,
    });
  };

  // Remove uploaded file
  const removeFile = (fileType: 'passport' | 'visa' | 'tesda') => {
    const file = uploadedFiles[fileType];
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    
    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: null
    }));

    toast({
      title: 'File removed',
      description: 'File has been removed from the application.',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  // Handle opening PDF viewer
  const handleViewDocument = (fileType: 'passport' | 'visa' | 'tesda') => {
    const file = uploadedFiles[fileType];
    if (file) {
      setSelectedDocument({
        id: file.id,
        name: file.name,
        fileBlob: file.file
      });
      setPdfViewerOpen(true);
    }
  };

  useEffect(() => {
    const fetchPreview = async () => {
      const preview = await generateControlNumberPreview();
      setControlNumberPreview(preview);
    };
    fetchPreview();
  }, []);

  // Prefill form when editing a draft (only once per application id)
  const prefillKey = applicationId || (initialData as any)?.id || null
  const prefilledRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (initialData && prefillKey && prefilledRef.current !== prefillKey) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name ?? '',
        sex: initialData.sex ?? 'male',
        job_type: initialData.job_type ?? 'professional',
        jobsite: initialData.jobsite && initialData.jobsite !== 'To be filled' ? initialData.jobsite : '',
        position: initialData.position && initialData.position !== 'To be filled' ? initialData.position : '',
        salary: initialData.salary && initialData.salary > 0 ? String(initialData.salary) : '',
        salaryCurrency: (initialData as any).salaryCurrency ?? 'USD',
        employer: (initialData as any).employer ?? '',
        raw_salary: (initialData as any).raw_salary ?? initialData.salary
      }))
      prefilledRef.current = prefillKey
    }
  }, [initialData, prefillKey])

  // Load existing documents when editing a draft
  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (applicationId) {
        try {
          const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`);
          const result = await response.json();
          
          if (result.success && result.data) {
            // Set the existing documents in the uploadedFiles state
            const existingFiles = { ...uploadedFiles };
            
            result.data.forEach((doc: any) => {
              if (doc.document_type === 'passport') {
                existingFiles.passport = {
                  id: doc.id,
                  name: doc.file_name,
                  type: doc.mime_type,
                  size: doc.file_size,
                  file: null as any, // We'll handle this differently
                  preview: `/api/documents/${doc.id}/download`
                };
              } else if (doc.document_type === 'visa') {
                existingFiles.visa = {
                  id: doc.id,
                  name: doc.file_name,
                  type: doc.mime_type,
                  size: doc.file_size,
                  file: null as any, // We'll handle this differently
                  preview: `/api/documents/${doc.id}/download`
                };
              } else if (doc.document_type === 'tesda') {
                existingFiles.tesda = {
                  id: doc.id,
                  name: doc.file_name,
                  type: doc.mime_type,
                  size: doc.file_size,
                  file: null as any, // We'll handle this differently
                  preview: `/api/documents/${doc.id}/download`
                };
              }
            });
            
            setUploadedFiles(existingFiles);
          }
        } catch (error) {
          console.error('Error loading existing documents:', error);
        }
      }
    };
    
    loadExistingDocuments();
  }, [applicationId]);

  // Cleanup file previews on unmount
  useEffect(() => {
    return () => {
      Object.values(uploadedFiles).forEach(file => {
        if (file?.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">Fill Out Form</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="form1">Form 1</TabsTrigger>
              <TabsTrigger value="form2">Form 2</TabsTrigger>
            </TabsList>

            <TabsContent value="form1" className="space-y-4">
              {/* Control No - Preview */}
              <div>
                <Label className="text-sm font-medium">Control No. (Preview)</Label>
                <Input 
                  value={controlNumberPreview} 
                  disabled
                  className="mt-1 bg-gray-50 font-mono text-sm" 
                  placeholder="Generating preview..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is a preview. The actual control number will be generated upon creation.
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


              <div className="flex justify-end pt-4 gap-2">
                <Button 
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#1976D2] hover:bg-[#1565C0]" 
                  onClick={() => setActiveTab("form2")}
                  disabled={!formData.name || !formData.jobsite || !formData.position || !formData.salary}
                >
                  Next
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="form2" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Please upload the required documents. Supported formats: JPEG, PNG, PDF (Max 5MB each)
                  </p>
                </div>

                {/* Passport Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Passport:</Label>
                  {!uploadedFiles.passport ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="passport-upload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('passport', file);
                        }}
                      />
                      <label htmlFor="passport-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload passport</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, or PDF (Max 5MB)</p>
                      </label>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(uploadedFiles.passport.type)}
                          <div>
                            <p className="text-sm font-medium">{uploadedFiles.passport.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(uploadedFiles.passport.size)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {uploadedFiles.passport && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument('passport')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile('passport')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visa/Work Permit Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Visa/Work Permit:</Label>
                  {!uploadedFiles.visa ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="visa-upload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('visa', file);
                        }}
                      />
                      <label htmlFor="visa-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload visa/work permit</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, or PDF (Max 5MB)</p>
                      </label>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(uploadedFiles.visa.type)}
                          <div>
                            <p className="text-sm font-medium">{uploadedFiles.visa.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(uploadedFiles.visa.size)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {uploadedFiles.visa && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument('visa')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile('visa')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TESDA NC/PRC License Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">TESDA NC/PRC License:</Label>
                  {!uploadedFiles.tesda ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="tesda-upload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('tesda', file);
                        }}
                      />
                      <label htmlFor="tesda-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload TESDA NC/PRC license</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, or PDF (Max 5MB)</p>
                      </label>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(uploadedFiles.tesda.type)}
                          <div>
                            <p className="text-sm font-medium">{uploadedFiles.tesda.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(uploadedFiles.tesda.size)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {uploadedFiles.tesda && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument('tesda')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile('tesda')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDraftConfirmOpen(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    applicationId ? 'Save Draft Changes' : 'Save as Draft'
                  )}
                </Button>
                <Button 
                  className="bg-[#1976D2] hover:bg-[#1565C0]" 
                  onClick={async () => {
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
                      // Convert salary to USD for storage
                      const salaryInUSD = formData.salaryCurrency && formData.salary ? (
                        formData.salaryCurrency === "USD" 
                        ? parseFloat(formData.salary)
                          : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency)
                      ) : 0;

                      // If continuing a draft, update instead of creating
                      if (applicationId) {
                        const statusChecklist = {
                          evaluated: { checked: true, timestamp: new Date().toISOString() },
                          for_confirmation: { checked: false, timestamp: undefined },
                          emailed_to_dhad: { checked: false, timestamp: undefined },
                          received_from_dhad: { checked: false, timestamp: undefined },
                          for_interview: { checked: false, timestamp: undefined }
                        }

                        const updated = await updateApplication(applicationId, {
                          name: formData.name,
                          sex: formData.sex,
                          jobsite: formData.jobsite,
                          position: formData.position,
                          job_type: formData.job_type,
                          salary: salaryInUSD,
                          employer: formData.employer,
                          evaluator: currentUser?.full_name || 'Unknown',
                          status: 'evaluated',
                          status_checklist: statusChecklist
                        })

                        if (!updated) throw new Error('Failed to update draft')

                        // Try to generate and attach the clearance document
                        try {
                          await fetch(`/api/direct-hire/${applicationId}/generate`, { method: 'POST' })
                        } catch {}

                        // Ensure parent refresh completes before toast
                        await onSuccess?.()
                        onClose();
                        toast({
                          title: 'Application submitted',
                          description: `${formData.name} has been updated and submitted.`,
                        });
                        return;
                      }

                      // Create FormData for file upload
                      const formDataToSend = new FormData();
                      formDataToSend.append('name', formData.name);
                      formDataToSend.append('sex', formData.sex);
                      formDataToSend.append('salary', salaryInUSD.toString());
                      formDataToSend.append('salaryCurrency', formData.salaryCurrency || 'USD');
                      formDataToSend.append('jobsite', formData.jobsite);
                      formDataToSend.append('position', formData.position);
                      formDataToSend.append('evaluator', currentUser?.full_name || 'Unknown');
                      formDataToSend.append('status', 'pending');
                      formDataToSend.append('employer', formData.employer);

                      // Add files if they exist
                      if (uploadedFiles.passport && uploadedFiles.passport.file) {
                        formDataToSend.append('passport', uploadedFiles.passport.file);
                      }
                      if (uploadedFiles.visa && uploadedFiles.visa.file) {
                        formDataToSend.append('visa', uploadedFiles.visa.file);
                      }
                      if (uploadedFiles.tesda && uploadedFiles.tesda.file) {
                        formDataToSend.append('tesda', uploadedFiles.tesda.file);
                      }

                      const response = await fetch('/api/direct-hire', {
                        method: 'POST',
                        body: formDataToSend,
                      });

                      const result = await response.json();

                      if (result.success) {
                        // Ensure parent refresh completes before toast
                        await onSuccess?.()
                        onClose();
                        toast({
                          title: 'Application created successfully!',
                          description: `${formData.name} has been added to the system`,
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
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* PDF Viewer Modal */}
      {selectedDocument && (
        <PDFViewerModal
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
    </div>
  )
}
