// utils/formValidation.ts
import { Currency } from "@/lib/currency-converter"

export interface FormData {
  name: string
  email: string
  cellphone: string
  sex: 'male' | 'female' | ''
  jobsite: string
  position: string
  job_type: 'household' | 'professional' | ''
  salary: string
  employer: string
  salaryCurrency: Currency | ''
  processed_workers_principal: string
  processed_workers_las: string
  verifier_type: 'MWO' | 'PEPCG' | 'OTHERS' | ''
  verifier_office: string
  pe_pcg_city: string
  others_text: string
  verified_date: string
}

export interface DocMetadata {
  passport_number: string
  passport_expiry: string
  visa_category: string
  visa_type: string
  visa_validity: string
  visa_number: string
  ec_issued_date: string
  ec_verification: string
  screenshot1_url: string
  screenshot2_url: string
}

export interface DocFiles {
  passport: File | null
  work_visa: File | null
  employment_contract: File | null
  tesda_license: File | null
  country_specific: File | null
  compliance_form: File | null
  medical_certificate: File | null
  peos_certificate: File | null
  clearance: File | null
  insurance_coverage: File | null
  eregistration: File | null
  pdos_certificate: File | null
  screenshot1: File | null
  screenshot2: File | null
}

// Date validation helpers
export const getMinDate = () => {
  const today = new Date()
  const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  return oneYearFromNow.toISOString().split('T')[0]
}

export const getMaxDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export const getPassportMinDate = () => {
  const today = new Date()
  const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  return oneYearFromNow.toISOString().split('T')[0]
}

export const getVisaValidityMinDate = () => {
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return tomorrow.toISOString().split('T')[0]
}

// Basic form validation
export const validateForm = (formData: FormData): string[] => {
  const errors: string[] = []
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
  if (formData.cellphone) {
    const digits = formData.cellphone.replace(/\D/g, '')
    if (!/^09\d{9}$/.test(digits)) {
      errors.push("Cellphone number must start with 09 and be 11 digits")
    }
  }
  
  return errors;
}

// Draft validation (only requires name)
export const validateDraftForm = (formData: FormData): string[] => {
  const errors: string[] = []
  
  if (!formData.name.trim()) {
    errors.push("Worker name is required");
  }
  
  return errors;
}

// Missing field validation function - identifies specific unfilled required fields
export const getMissingFields = (formData: FormData, docMetadata: DocMetadata, docFiles: DocFiles): string[] => {
  const missingFields: string[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
  
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
  if (formData.cellphone) {
    const digits = formData.cellphone.replace(/\D/g, '')
    if (!/^09\d{9}$/.test(digits)) {
      missingFields.push("Valid Cellphone Number (starts with 09, 11 digits)");
    }
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
  
  // Document metadata requirements - check if file is uploaded and metadata is filled
  if (docFiles.passport || (docFiles.passport && (docFiles.passport as any).uploaded)) {
    if (!docMetadata.passport_number || docMetadata.passport_number.trim() === '') {
      missingFields.push("Passport Number");
    }
    if (!docMetadata.passport_expiry || docMetadata.passport_expiry.trim() === '') {
      missingFields.push("Passport Expiry Date");
    }
  }
  
  if (docFiles.work_visa || (docFiles.work_visa && (docFiles.work_visa as any).uploaded)) {
    if (!docMetadata.visa_category || docMetadata.visa_category.trim() === '') {
      missingFields.push("Visa Category");
    }
    if (!docMetadata.visa_type || docMetadata.visa_type.trim() === '') {
      missingFields.push("Visa Type");
    }
    if (!docMetadata.visa_number || docMetadata.visa_number.trim() === '') {
      missingFields.push("Visa Number");
    }
    if (!docMetadata.visa_validity || docMetadata.visa_validity.trim() === '') {
      missingFields.push("Visa Validity Date");
    }
  }
  
  if (docFiles.employment_contract || (docFiles.employment_contract && (docFiles.employment_contract as any).uploaded)) {
    if (!docMetadata.ec_issued_date || docMetadata.ec_issued_date.trim() === '') {
      missingFields.push("Employment Contract Issued Date");
    }
    if (!docMetadata.ec_verification || docMetadata.ec_verification.trim() === '') {
      missingFields.push("Employment Contract Verification Type");
    }
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
}

// Get field-specific validation errors
export const getFieldErrors = (formData: FormData, isDraft: boolean = false): {[key: string]: string} => {
  const errors: {[key: string]: string} = {}
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
    if (formData.cellphone) {
      const digits = formData.cellphone.replace(/\D/g, '')
      if (!/^09\d{9}$/.test(digits)) {
        errors.cellphone = "Must start with 09 and be 11 digits"
      }
    }
  }
  
  return errors;
}

// Get document metadata validation errors
export const getDocumentMetadataErrors = (docFiles: DocFiles, docMetadata: DocMetadata): {[key: string]: string} => {
  const errors: {[key: string]: string} = {}
  
  // Check passport metadata if file is uploaded
  if (docFiles.passport || (docFiles.passport && (docFiles.passport as any).uploaded)) {
    if (!docMetadata.passport_number || docMetadata.passport_number.trim() === '') {
      errors.passport_number = "Passport number is required";
    }
    if (!docMetadata.passport_expiry || docMetadata.passport_expiry.trim() === '') {
      errors.passport_expiry = "Passport expiry date is required";
    }
  }
  
  // Check work visa metadata if file is uploaded
  if (docFiles.work_visa || (docFiles.work_visa && (docFiles.work_visa as any).uploaded)) {
    if (!docMetadata.visa_category || docMetadata.visa_category.trim() === '') {
      errors.visa_category = "Visa category is required";
    }
    if (!docMetadata.visa_type || docMetadata.visa_type.trim() === '') {
      errors.visa_type = "Visa type is required";
    }
    if (!docMetadata.visa_number || docMetadata.visa_number.trim() === '') {
      errors.visa_number = "Visa number is required";
    }
    if (!docMetadata.visa_validity || docMetadata.visa_validity.trim() === '') {
      errors.visa_validity = "Visa validity date is required";
    }
  }
  
  // Check employment contract metadata if file is uploaded
  if (docFiles.employment_contract || (docFiles.employment_contract && (docFiles.employment_contract as any).uploaded)) {
    if (!docMetadata.ec_issued_date || docMetadata.ec_issued_date.trim() === '') {
      errors.ec_issued_date = "Issued date is required";
    }
    if (!docMetadata.ec_verification || docMetadata.ec_verification.trim() === '') {
      errors.ec_verification = "Verification type is required";
    }
  }
  
  return errors;
}

// Enhanced validation function that shows specific missing fields
export const validateFormWithMissingFields = (formData: FormData, docMetadata: DocMetadata, docFiles: DocFiles): string[] => {
  const missingFields = getMissingFields(formData, docMetadata, docFiles);
  if (missingFields.length > 0) {
    return [`Please complete the following required fields: ${missingFields.join(', ')}`];
  }
  return [];
}
