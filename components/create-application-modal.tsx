"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, FileText, Loader2, Calculator, Upload, Eye, Trash2, File } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import { getUser } from "@/lib/auth"

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
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  file: File
  preview?: string
}

export default function CreateApplicationModal({ onClose, initialData = null, applicationId = null }: CreateApplicationModalProps) {
  const [activeTab, setActiveTab] = useState("form1")
  const [loading, setLoading] = useState(false)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const { toast } = useToast()
  const { createApplication } = useDirectHireApplications()
  
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

  useEffect(() => {
    const fetchPreview = async () => {
      const preview = await generateControlNumberPreview();
      setControlNumberPreview(preview);
    };
    fetchPreview();
  }, []);

  // Prefill form when editing a draft
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name ?? '',
        sex: initialData.sex ?? 'male',
        job_type: initialData.job_type ?? 'professional',
        jobsite: initialData.jobsite && initialData.jobsite !== 'To be filled' ? initialData.jobsite : '',
        position: initialData.position && initialData.position !== 'To be filled' ? initialData.position : '',
        salary: initialData.salary && initialData.salary > 0 ? String(initialData.salary) : '',
        employer: initialData.employer || '' // Prefill employer if available
      }))
    }
  }, [initialData])

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
                    setFormData({ ...formData, name: e.target.value });
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
                    setFormData({ ...formData, jobsite: e.target.value });
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
                        setFormData({ ...formData, position: e.target.value });
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
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  className="mt-1"
                  placeholder="Enter employer name" 
                />
              </div>


              <div className="flex justify-end pt-4">
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
                          {uploadedFiles.passport.preview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(uploadedFiles.passport!.preview, '_blank')}
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
                      {uploadedFiles.passport.preview && (
                        <div className="mt-3">
                          <img 
                            src={uploadedFiles.passport.preview} 
                            alt="Passport preview" 
                            className="max-w-full h-32 object-contain rounded border"
                          />
                        </div>
                      )}
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
                          {uploadedFiles.visa.preview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(uploadedFiles.visa!.preview, '_blank')}
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
                      {uploadedFiles.visa.preview && (
                        <div className="mt-3">
                          <img 
                            src={uploadedFiles.visa.preview} 
                            alt="Visa preview" 
                            className="max-w-full h-32 object-contain rounded border"
                          />
                        </div>
                      )}
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
                          {uploadedFiles.tesda.preview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(uploadedFiles.tesda!.preview, '_blank')}
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
                      {uploadedFiles.tesda.preview && (
                        <div className="mt-3">
                          <img 
                            src={uploadedFiles.tesda.preview} 
                            alt="TESDA license preview" 
                            className="max-w-full h-32 object-contain rounded border"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={async () => {
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
                      // Convert salary to USD for storage
                      const salaryInUSD = formData.salaryCurrency && formData.salary ? (
                        formData.salaryCurrency === "USD" 
                          ? parseFloat(formData.salary)
                          : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency)
                      ) : 0;

                      if (applicationId) {
                        // Update existing draft via PUT (no file uploads here)
                        const response = await fetch(`/api/direct-hire/${applicationId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: formData.name,
                            sex: formData.sex,
                            job_type: formData.job_type,
                            jobsite: formData.jobsite || 'To be filled',
                            position: formData.position || 'To be filled',
                            salary: String(salaryInUSD),
                            status: 'draft',
                            employer: formData.employer || 'To be filled'
                          })
                        })
                        const result = await response.json();
                        if (!result.success) throw new Error(result.error || 'Failed to update draft')
                        onClose();
                        toast({ title: 'Draft updated', description: `${formData.name} has been updated` })
                        return;
                      }

                      // Create FormData for new draft (with files)
                      const formDataToSend = new FormData();
                      formDataToSend.append('name', formData.name);
                      formDataToSend.append('sex', formData.sex);
                      formDataToSend.append('job_type', formData.job_type);
                      formDataToSend.append('salary', salaryInUSD.toString());
                      formDataToSend.append('jobsite', formData.jobsite);
                      formDataToSend.append('position', formData.position);
                      formDataToSend.append('evaluator', currentUser?.full_name || 'Unknown');
                      formDataToSend.append('status', 'draft');
                      formDataToSend.append('employer', formData.employer);

                      if (uploadedFiles.passport) formDataToSend.append('passport', uploadedFiles.passport.file);
                      if (uploadedFiles.visa) formDataToSend.append('visa', uploadedFiles.visa.file);
                      if (uploadedFiles.tesda) formDataToSend.append('tesda', uploadedFiles.tesda.file);

                      const response = await fetch('/api/direct-hire', { method: 'POST', body: formDataToSend });
                      const result = await response.json();

                      if (result.success) {
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
                    }
                  }}
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

                      // Create FormData for file upload
                      const formDataToSend = new FormData();
                      formDataToSend.append('name', formData.name);
                      formDataToSend.append('sex', formData.sex);
                      formDataToSend.append('job_type', formData.job_type);
                      formDataToSend.append('salary', salaryInUSD.toString());
                      formDataToSend.append('jobsite', formData.jobsite);
                      formDataToSend.append('position', formData.position);
                      formDataToSend.append('evaluator', currentUser?.full_name || 'Unknown');
                      formDataToSend.append('status', 'pending');
                      formDataToSend.append('employer', formData.employer);

                      // Add files if they exist
                      if (uploadedFiles.passport) {
                        formDataToSend.append('passport', uploadedFiles.passport.file);
                      }
                      if (uploadedFiles.visa) {
                        formDataToSend.append('visa', uploadedFiles.visa.file);
                      }
                      if (uploadedFiles.tesda) {
                        formDataToSend.append('tesda', uploadedFiles.tesda.file);
                      }

                      const response = await fetch('/api/direct-hire', {
                        method: 'POST',
                        body: formDataToSend,
                      });

                      const result = await response.json();

                      if (result.success) {
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
    </div>
  )
}
