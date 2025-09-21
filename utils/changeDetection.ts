// utils/changeDetection.ts
import { FormData as FormDataType, DocMetadata, DocFiles } from './formValidation'

// Helper function to detect changes in form data
export const getChangedFormData = (formData: FormDataType, originalFormData: FormDataType | null) => {
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
export const getChangedDocMetadata = (docMetadata: DocMetadata, originalDocMetadata: DocMetadata | null) => {
  if (!originalDocMetadata) {
    return docMetadata
  }
  
  const changes: any = {}
  const fieldsToCheck = [
    'passport_number', 'passport_expiry', 'visa_category', 'visa_type', 
    'visa_number', 'visa_validity', 'ec_issued_date', 'ec_verification',
    'screenshot1_url', 'screenshot2_url'
  ]
  
  fieldsToCheck.forEach(field => {
    const currentValue = docMetadata[field] || ''
    const originalValue = originalDocMetadata[field] || ''
    if (currentValue !== originalValue) {
      changes[field] = currentValue
    }
  })
  
  return Object.keys(changes).length > 0 ? changes : null
}

// Helper function to detect new document uploads
export const getNewDocumentUploads = (docFiles: DocFiles, originalDocFiles: DocFiles | null) => {
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

// Helper function to map database document types to form document types
export const getFormDocumentType = (dbDocType: string): string | null => {
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
