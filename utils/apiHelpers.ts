// utils/apiHelpers.ts
import { FormData as FormDataType, DocFiles, DocMetadata } from './formValidation'
import { Currency } from "@/lib/currency-converter"
import { convertToUSD } from "@/lib/currency-converter"

// Generate control number preview
export const generateControlNumberPreview = async (): Promise<string> => {
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

// Upload selected documents
export const uploadSelectedDocuments = async (createdId: string, docFiles: DocFiles, docMetadata: DocMetadata) => {
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

// Create application API call
export const createApplication = async (formData: FormDataType, currentUser: any) => {
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
  return result;
}

// Update application API call
export const updateApplication = async (applicationId: string, formData: FormDataType, currentUser: any, initialData: any) => {
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
  const additionalDetailsChanged = (
    formData.processed_workers_principal !== undefined ||
    formData.processed_workers_las !== undefined ||
    formData.verifier_type !== undefined ||
    formData.verifier_office !== undefined ||
    formData.pe_pcg_city !== undefined ||
    formData.others_text !== undefined ||
    formData.verified_date !== undefined
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
  return result
}

// Generate Direct Hire Clearance document
export const generateDirectHireClearance = async (createdId: string) => {
  const clearanceResponse = await fetch(`/api/direct-hire/${createdId}/comprehensive-clearance?override=true`, {
    method: 'POST'
  })
  return clearanceResponse.ok
}

// Password confirmation
export const confirmPassword = async (username: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  return response.json();
}
