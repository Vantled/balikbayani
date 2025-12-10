// app/applicant/start/direct-hire/direct-hire-form.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator } from 'lucide-react'
import { DateWheelPicker } from '@/components/ui/date-wheel-picker'
import { useToast } from '@/hooks/use-toast'
import { getUSDEquivalentAsync, AVAILABLE_CURRENCIES } from '@/lib/currency-converter'
import { getPassportMinDate, getVisaValidityMinDate, getMaxDate } from '@/utils/formValidation'
import { validateSession } from '@/lib/auth'

interface DirectHireApplicantFormProps {
  defaultEmail?: string
  defaultNames?: {
    first?: string
    middle?: string
    last?: string
  }
  applicationId?: string
  needsCorrection?: boolean
  correctionFields?: string[]
}

export default function DirectHireApplicantForm({ defaultEmail, defaultNames, applicationId, needsCorrection = false, correctionFields = [] }: DirectHireApplicantFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const STORAGE_KEY = 'bb_applicant_direct_hire_form_v1'

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'documents' | 'review'>('info')
  const [documents, setDocuments] = useState<{
    passport: File | null
    workVisa: File | null
    employmentContract: File | null
    tesdaLicense: File | null
    countrySpecific: File | null
    complianceForm: File | null
    medicalCertificate: File | null
    peosCertificate: File | null
    clearance: File | null
    insuranceCoverage: File | null
    eregistration: File | null
    pdosCertificate: File | null
  }>({
    passport: null,
    workVisa: null,
    employmentContract: null,
    tesdaLicense: null,
    countrySpecific: null,
    complianceForm: null,
    medicalCertificate: null,
    peosCertificate: null,
    clearance: null,
    insuranceCoverage: null,
    eregistration: null,
    pdosCertificate: null,
  })

  const [formState, setFormState] = useState({
    firstName: defaultNames?.first || '',
    middleName: defaultNames?.middle || '',
    lastName: defaultNames?.last || '',
    sex: '',
    contactEmail: defaultEmail || '',
    contactNumber: '09',
    jobsite: '',
    position: '',
    jobType: '',
    employer: '',
    salaryAmount: '',
    salaryCurrency: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formState, string>>>({})
  const [docErrors, setDocErrors] = useState<Record<string, string>>({})

  const [docMeta, setDocMeta] = useState({
    passportNumber: '',
    passportExpiry: '',
    visaCategory: '',
    visaType: '',
    visaNumber: '',
    visaValidity: '',
    ecIssuedDate: '',
    ecVerification: '',
  })

  const [existingDocs, setExistingDocs] = useState<{
    passport: boolean
    workVisa: boolean
    employmentContract: boolean
    tesdaLicense: boolean
  }>({
    passport: false,
    workVisa: false,
    employmentContract: false,
    tesdaLicense: false,
  })

  const [existingDocInfo, setExistingDocInfo] = useState<{
    passport?: { fileName: string; id: string }
    workVisa?: { fileName: string; id: string }
    employmentContract?: { fileName: string; id: string }
    tesdaLicense?: { fileName: string; id: string }
  }>({})

  const [correctionReasons, setCorrectionReasons] = useState<Record<string, string>>({})
  
  // Track initial values to detect changes
  const [initialFormState, setInitialFormState] = useState<typeof formState | null>(null)
  const [initialDocMeta, setInitialDocMeta] = useState<typeof docMeta | null>(null)
  const [initialDocuments, setInitialDocuments] = useState<typeof documents | null>(null)

  // Helper function to map optional document keys to correction field keys
  const getOptionalDocFieldKey = (docKey: string): string => {
    const mapping: Record<string, string> = {
      countrySpecific: 'document_country_specific',
      complianceForm: 'document_compliance_form',
      medicalCertificate: 'document_medical_certificate',
      peosCertificate: 'document_peos_certificate',
      clearance: 'document_clearance',
      insuranceCoverage: 'document_insurance_coverage',
      eregistration: 'document_eregistration',
      pdosCertificate: 'document_pdos_certificate',
    }
    return mapping[docKey] || `document_${docKey}`
  }

  // Check if any flagged fields have changed
  const hasChanges = (): boolean => {
    if (!needsCorrection) return true // Allow normal form submission when not in correction mode
    if (!initialFormState || !initialDocMeta || !initialDocuments) return false // Disable until initial values are loaded
    
    // Check form fields
    for (const fieldKey of correctionFields) {
      if (fieldKey === 'name') {
        const currentName = `${formState.firstName} ${formState.middleName} ${formState.lastName}`.trim()
        const initialName = `${initialFormState.firstName} ${initialFormState.middleName} ${initialFormState.lastName}`.trim()
        if (currentName !== initialName) return true
      } else if (fieldKey === 'email' && formState.contactEmail !== initialFormState.contactEmail) {
        return true
      } else if (fieldKey === 'cellphone' && formState.contactNumber !== initialFormState.contactNumber) {
        return true
      } else if (fieldKey === 'sex' && formState.sex !== initialFormState.sex) {
        return true
      } else if (fieldKey === 'jobsite' && formState.jobsite !== initialFormState.jobsite) {
        return true
      } else if (fieldKey === 'position' && formState.position !== initialFormState.position) {
        return true
      } else if (fieldKey === 'job_type' && formState.jobType !== initialFormState.jobType) {
        return true
      } else if (fieldKey === 'employer' && formState.employer !== initialFormState.employer) {
        return true
      } else if (fieldKey === 'raw_salary' && formState.salaryAmount !== initialFormState.salaryAmount) {
        return true
      } else if (fieldKey === 'salary_currency' && formState.salaryCurrency !== initialFormState.salaryCurrency) {
        return true
      } else if (fieldKey === 'passport_number' && docMeta.passportNumber !== initialDocMeta.passportNumber) {
        return true
      } else if (fieldKey === 'passport_validity' && docMeta.passportExpiry !== initialDocMeta.passportExpiry) {
        return true
      } else if (fieldKey === 'visa_category' && docMeta.visaCategory !== initialDocMeta.visaCategory) {
        return true
      } else if (fieldKey === 'visa_type' && docMeta.visaType !== initialDocMeta.visaType) {
        return true
      } else if (fieldKey === 'visa_number' && docMeta.visaNumber !== initialDocMeta.visaNumber) {
        return true
      } else if (fieldKey === 'visa_validity' && docMeta.visaValidity !== initialDocMeta.visaValidity) {
        return true
      } else if (fieldKey === 'ec_issued_date' && docMeta.ecIssuedDate !== initialDocMeta.ecIssuedDate) {
        return true
      } else if (fieldKey === 'ec_verification' && docMeta.ecVerification !== initialDocMeta.ecVerification) {
        return true
      } else if (fieldKey.startsWith('document_')) {
        const docType = fieldKey.replace('document_', '')
        const docKeyMap: Record<string, keyof typeof documents> = {
          passport: 'passport',
          work_visa: 'workVisa',
          employment_contract: 'employmentContract',
          tesda_license: 'tesdaLicense',
          country_specific: 'countrySpecific',
          compliance_form: 'complianceForm',
          medical_certificate: 'medicalCertificate',
          peos_certificate: 'peosCertificate',
          clearance: 'clearance',
          insurance_coverage: 'insuranceCoverage',
          eregistration: 'eregistration',
          pdos_certificate: 'pdosCertificate',
        }
        const docKey = docKeyMap[docType]
        if (docKey) {
          const currentDoc = documents[docKey]
          const initialDoc = initialDocuments?.[docKey] ?? null
          // Check if document changed: both null/undefined = no change, one is null and other isn't = change
          const currentExists = currentDoc !== null && currentDoc !== undefined
          const initialExists = initialDoc !== null && initialDoc !== undefined
          if (currentExists !== initialExists) {
            console.log(`Document ${docKey} changed: current exists=${currentExists}, initial exists=${initialExists}`)
            return true // One exists and other doesn't = change
          }
          if (currentExists && initialExists && currentDoc !== initialDoc) {
            console.log(`Document ${docKey} changed: different file objects`)
            return true // Both exist but different = change
          }
          // Also check file name/size if both are File objects
          if (currentDoc instanceof File && initialDoc instanceof File) {
            if (currentDoc.name !== initialDoc.name || currentDoc.size !== initialDoc.size) {
              console.log(`Document ${docKey} changed: file name or size different`)
              return true
            }
          }
        }
      }
    }
    
    return false
  }

  // Memoize the hasChanges result so React re-renders when dependencies change
  const formHasChanges = useMemo(() => {
    return hasChanges()
  }, [documents, formState, docMeta, initialFormState, initialDocMeta, initialDocuments, correctionFields, needsCorrection])

  const passportComplete =
    (!!documents.passport || existingDocs.passport) && !!docMeta.passportNumber.trim() && !!docMeta.passportExpiry
  const workVisaComplete =
    (!!documents.workVisa || existingDocs.workVisa) &&
    !!docMeta.visaCategory &&
    !!docMeta.visaType &&
    !!docMeta.visaNumber.trim() &&
    !!docMeta.visaValidity
  const employmentContractComplete =
    (!!documents.employmentContract || existingDocs.employmentContract) && !!docMeta.ecIssuedDate && !!docMeta.ecVerification

  const documentChecklist = [
    { label: 'Passport', complete: passportComplete },
    { label: 'Work Visa / Permit', complete: workVisaComplete },
    { label: 'Employment Contract', complete: employmentContractComplete },
    { label: 'TESDA / PRC License', complete: !!documents.tesdaLicense },
  ]

  // Helper function to check if a field is editable (for correction mode)
  const isFieldEditable = (fieldKey: string): boolean => {
    if (!needsCorrection) return true
    return correctionFields.includes(fieldKey)
  }

  // Helper function to check if a field is flagged for correction
  const isFieldFlagged = (fieldKey: string): boolean => {
    if (!needsCorrection) return false
    return correctionFields.includes(fieldKey)
  }

  // Helper function to get correction reason for a field
  const getCorrectionReason = (fieldKey: string): string => {
    // First try exact match
    if (correctionReasons[fieldKey]) {
      return correctionReasons[fieldKey]
    }
    // If no exact match and field is flagged, return empty string (will show fallback message)
    return ''
  }

  // Helper function to get className for flagged fields
  const getFlaggedFieldClassName = (fieldKey: string, baseClassName: string = ''): string => {
    const flagged = isFieldFlagged(fieldKey)
    const editable = isFieldEditable(fieldKey)
    let className = baseClassName
    
    if (!editable) {
      className += ' bg-gray-100 cursor-not-allowed'
    }
    if (flagged) {
      className += ' border-red-500 border-2 bg-red-50'
    }
    return className.trim()
  }

  // Map form field names to database field keys for flagging
  const getFieldKeyForFormField = (formField: string): string => {
    const mapping: Record<string, string> = {
      firstName: 'name',
      middleName: 'name',
      lastName: 'name',
      contactEmail: 'email',
      contactNumber: 'cellphone',
      sex: 'sex',
      jobsite: 'jobsite',
      position: 'position',
      jobType: 'job_type',
      employer: 'employer',
      salaryAmount: 'raw_salary',
      salaryCurrency: 'salary_currency',
      passportNumber: 'passport_number',
      passportExpiry: 'passport_validity',
      visaCategory: 'visa_category',
      visaType: 'visa_type',
      visaNumber: 'visa_number',
      visaValidity: 'visa_validity',
      ecIssuedDate: 'ec_issued_date',
      ecVerification: 'ec_verification',
    }
    return mapping[formField] || formField
  }

  // Load existing application data when editing
  useEffect(() => {
    if (!applicationId) return
    
    const loadApplication = async () => {
      try {
        const response = await fetch(`/api/applicant/direct-hire/${applicationId}`, {
          credentials: 'include',
        })
        if (!response.ok) return
        
        const data = await response.json()
        if (!data.success || !data.data) return
        
        const app = data.data
        
        // Parse name into first, middle, last
        const nameParts = (app.name || '').split(' ').filter(Boolean)
        const firstName = nameParts[0] || ''
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : (nameParts[1] || '')
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''
        
        const loadedFormState = {
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          sex: app.sex || '',
          contactEmail: app.email || defaultEmail || '',
          contactNumber: app.cellphone || '09',
          jobsite: app.jobsite || '',
          position: app.position || '',
          jobType: app.job_type || '',
          employer: (app as any).employer || '',
          salaryAmount: String((app as any).raw_salary || app.salary || ''),
          salaryCurrency: (app as any).salary_currency || '',
        }
        setFormState(loadedFormState)
        // Store initial state for change detection
        if (needsCorrection) {
          setInitialFormState(loadedFormState)
        }
        
        // Load corrections if in correction mode
        if (needsCorrection) {
          try {
            const correctionsResponse = await fetch(`/api/direct-hire/${applicationId}/corrections`, {
              credentials: 'include',
            })
            if (correctionsResponse.ok) {
              const correctionsData = await correctionsResponse.json()
              if (correctionsData.success && correctionsData.data && Array.isArray(correctionsData.data)) {
                const reasons: Record<string, string> = {}
                correctionsData.data.forEach((correction: { field_key: string; message: string }) => {
                  const key = correction.field_key
                  const message = correction.message
                  if (key && message) {
                    reasons[key] = message
                    // Handle 'salary' field key mapping to both raw_salary and salary_currency
                    if (key === 'salary') {
                      reasons['raw_salary'] = message
                      reasons['salary_currency'] = message
                    }
                  }
                })
                console.log('Loaded correction reasons:', reasons, 'for correctionFields:', correctionFields)
                setCorrectionReasons(reasons)
              } else {
                console.warn('Corrections API response format unexpected:', correctionsData)
              }
            } else {
              console.warn('Failed to fetch corrections:', correctionsResponse.status, correctionsResponse.statusText)
            }
          } catch (err) {
            console.error('Failed to load corrections:', err)
          }
        }
        
        // Load documents and metadata
        const docsResponse = await fetch(
          `/api/documents?applicationId=${applicationId}&applicationType=direct_hire`,
          { credentials: 'include' }
        )
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          if (docsData.success && docsData.data) {
            const docs = docsData.data as any[]
            
            // Extract metadata from documents and fetch files
            const existing = { passport: false, workVisa: false, employmentContract: false, tesdaLicense: false }
            const documentMap: Record<string, any> = {}
            const docInfo: typeof existingDocInfo = {}
            
            docs.forEach(doc => {
              const type = doc.document_type
              documentMap[type] = doc
              
              if (type === 'passport') {
                existing.passport = true
                docInfo.passport = { fileName: doc.file_name, id: doc.id }
              }
              if (type === 'work_visa') {
                existing.workVisa = true
                docInfo.workVisa = { fileName: doc.file_name, id: doc.id }
              }
              if (type === 'employment_contract') {
                existing.employmentContract = true
                docInfo.employmentContract = { fileName: doc.file_name, id: doc.id }
              }
              if (type === 'tesda_license') {
                existing.tesdaLicense = true
                docInfo.tesdaLicense = { fileName: doc.file_name, id: doc.id }
              }
              
            })
            
            setExistingDocs(existing)
            setExistingDocInfo(docInfo)
            
            // Collect docMeta values and store initial state
            const loadedDocMeta: typeof docMeta = {
              passportNumber: '',
              passportExpiry: '',
              visaCategory: '',
              visaType: '',
              visaNumber: '',
              visaValidity: '',
              ecIssuedDate: '',
              ecVerification: '',
            }
            
            docs.forEach(doc => {
              if (doc.meta) {
                // Parse metadata if it's a string
                let meta = doc.meta
                if (typeof meta === 'string') {
                  try {
                    meta = JSON.parse(meta)
                  } catch (e) {
                    console.warn('Failed to parse document metadata:', e, 'for document:', doc.document_type)
                    meta = {}
                  }
                }
                
                // Ensure meta is an object
                if (typeof meta !== 'object' || meta === null) {
                  console.warn('Document metadata is not an object for:', doc.document_type, 'meta:', meta)
                  return
                }
                
                // Debug logging for passport
                if (doc.document_type === 'passport') {
                  console.log('Loading passport metadata:', meta, 'keys:', Object.keys(meta))
                }
                
                if (doc.document_type === 'passport') {
                  // Try both snake_case and camelCase keys
                  if (meta.passport_number || meta.passportNumber) {
                    loadedDocMeta.passportNumber = String(meta.passport_number || meta.passportNumber).trim()
                  }
                  if (meta.passport_expiry || meta.passportExpiry) {
                    loadedDocMeta.passportExpiry = String(meta.passport_expiry || meta.passportExpiry).trim()
                  }
                } else if (doc.document_type === 'work_visa') {
                  if (meta.visa_category) loadedDocMeta.visaCategory = String(meta.visa_category).trim()
                  if (meta.visa_type) loadedDocMeta.visaType = String(meta.visa_type).trim()
                  if (meta.visa_number) loadedDocMeta.visaNumber = String(meta.visa_number).trim()
                  if (meta.visa_validity) loadedDocMeta.visaValidity = String(meta.visa_validity).trim()
                } else if (doc.document_type === 'employment_contract') {
                  if (meta.ec_issued_date) loadedDocMeta.ecIssuedDate = String(meta.ec_issued_date).trim()
                  if (meta.ec_verification) loadedDocMeta.ecVerification = String(meta.ec_verification).trim()
                }
              } else {
                // Log when document exists but has no metadata
                console.warn('Document', doc.document_type, 'exists but has no metadata')
              }
            })
            
            console.log('Loaded document metadata:', loadedDocMeta)
            
            setDocMeta(loadedDocMeta)
            if (needsCorrection) {
              setInitialDocMeta({ ...loadedDocMeta })
            }
            
            // Fetch document files and create File objects
            const fetchDocumentFiles = async () => {
              const filePromises = [
                { key: 'passport', doc: documentMap['passport'] },
                { key: 'workVisa', doc: documentMap['work_visa'] },
                { key: 'employmentContract', doc: documentMap['employment_contract'] },
                { key: 'tesdaLicense', doc: documentMap['tesda_license'] },
              ].map(async ({ key, doc }) => {
                if (!doc || !doc.id) return null
                
                try {
                  const fileResponse = await fetch(`/api/documents/${doc.id}/view`, {
                    credentials: 'include',
                  })
                  if (!fileResponse.ok) return null
                  
                  const blob = await fileResponse.blob()
                  const fileName = doc.file_name || `${key}.pdf`
                  const file = new File([blob], fileName, { type: blob.type || doc.mime_type || 'application/pdf' })
                  return { key, file }
                } catch (err) {
                  console.error(`Failed to fetch ${key} document:`, err)
                  return null
                }
              })
              
              const results = await Promise.all(filePromises)
              const newDocuments = { ...documents }
              results.forEach(result => {
                if (result) {
                  newDocuments[result.key as keyof typeof documents] = result.file
                }
              })
              setDocuments(newDocuments)
              
              // Store initial documents for change detection
              // Include all document keys, even if they're null/undefined
              if (needsCorrection) {
                const initialDocsState: typeof documents = {
                  passport: newDocuments.passport ?? null,
                  workVisa: newDocuments.workVisa ?? null,
                  employmentContract: newDocuments.employmentContract ?? null,
                  tesdaLicense: newDocuments.tesdaLicense ?? null,
                  countrySpecific: newDocuments.countrySpecific ?? null,
                  complianceForm: newDocuments.complianceForm ?? null,
                  medicalCertificate: newDocuments.medicalCertificate ?? null,
                  peosCertificate: newDocuments.peosCertificate ?? null,
                  clearance: newDocuments.clearance ?? null,
                  insuranceCoverage: newDocuments.insuranceCoverage ?? null,
                  eregistration: newDocuments.eregistration ?? null,
                  pdosCertificate: newDocuments.pdosCertificate ?? null,
                }
                setInitialDocuments(initialDocsState)
              }
            }
            
            await fetchDocumentFiles()
          }
        }
      } catch (err) {
        console.error('Failed to load application data:', err)
      }
    }
    
    void loadApplication()
  }, [applicationId, defaultEmail])

  // Scroll to first flagged field when form loads in correction mode
  useEffect(() => {
    if (!needsCorrection || correctionFields.length === 0) return
    
    // Wait for form to render, then scroll to first flagged field
    const timer = setTimeout(() => {
      // Find the first flagged field and scroll to it
      const fieldSelectors = [
        'firstName', 'middleName', 'lastName', // name
        'contactEmail', // email
        'contactNumber', // cellphone
        'sex-male', 'sex-female', // sex
        'jobsite', // jobsite
        'position', // position
        'jobType', // job_type
        'employer', // employer
        'salaryAmount', // raw_salary
        'salaryCurrency', // salary_currency
        'passportNumber', // passport_number
        'passportExpiry', // passport_validity
        'visaCategory', // visa_category
        'visaType', // visa_type
        'visaNumber', // visa_number
        'visaValidity', // visa_validity
        'ecIssuedDate', // ec_issued_date
        'ecVerification', // ec_verification
      ]
      
      for (const fieldKey of correctionFields) {
        let selector: string | null = null
        
        if (fieldKey === 'name') {
          selector = 'firstName'
        } else if (fieldKey === 'email') {
          selector = 'contactEmail'
        } else if (fieldKey === 'cellphone') {
          selector = 'contactNumber'
        } else if (fieldKey === 'sex') {
          selector = 'sex-male'
        } else if (fieldKey === 'jobsite') {
          selector = 'jobsite'
        } else if (fieldKey === 'position') {
          selector = 'position'
        } else if (fieldKey === 'job_type') {
          selector = 'jobType'
        } else if (fieldKey === 'employer') {
          selector = 'employer'
        } else if (fieldKey === 'raw_salary') {
          selector = 'salaryAmount'
        } else if (fieldKey === 'salary_currency') {
          selector = 'salaryCurrency'
        } else if (fieldKey === 'passport_number') {
          selector = 'passportNumber'
        } else if (fieldKey === 'passport_validity') {
          selector = 'passportExpiry'
        } else if (fieldKey === 'visa_category') {
          selector = 'visaCategory'
        } else if (fieldKey === 'visa_type') {
          selector = 'visaType'
        } else if (fieldKey === 'visa_number') {
          selector = 'visaNumber'
        } else if (fieldKey === 'visa_validity') {
          selector = 'visaValidity'
        } else if (fieldKey === 'ec_issued_date') {
          selector = 'ecIssuedDate'
        } else if (fieldKey === 'ec_verification') {
          selector = 'ecVerification'
        } else if (fieldKey.startsWith('document_')) {
          // For documents, scroll to documents section
          selector = 'documents-section'
        }
        
        if (selector) {
          const element = document.getElementById(selector) || document.querySelector(`[id*="${selector}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the field briefly
            element.classList.add('ring-2', 'ring-red-500')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-red-500')
            }, 2000)
            break
          }
        }
      }
      
      // If no specific field found but we're in correction mode, scroll to documents section
      if (correctionFields.some(f => f.startsWith('document_'))) {
        const docsSection = document.getElementById('documents-section') || document.querySelector('[data-section="documents"]')
        if (docsSection) {
          docsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [needsCorrection, correctionFields])

  // Load saved draft from localStorage on mount (client-side only) - skip if editing
  useEffect(() => {
    if (applicationId) return // Skip localStorage load when editing
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        formState?: typeof formState
        docMeta?: typeof docMeta
        step?: typeof step
      }
      if (parsed.formState) {
        setFormState(prev => ({
          ...prev,
          ...parsed.formState,
        }))
      }
      if (parsed.docMeta) {
        setDocMeta(prev => ({
          ...prev,
          ...parsed.docMeta,
        }))
      }
      if (parsed.step === 'documents' || parsed.step === 'info' || parsed.step === 'review') {
        setStep(parsed.step)
      }
    } catch (err) {
      console.error('Failed to load saved applicant form state:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  // Auto-save draft to localStorage whenever form fields or metadata change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = {
      formState,
      docMeta,
      step,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      // Best-effort only; ignore quota / serialization errors
      console.error('Failed to save applicant form draft:', err)
    }
  }, [formState, docMeta, step])

  const [usdDisplay, setUsdDisplay] = useState<string>('')

  const updateField = (field: keyof typeof formState, value: string) => {
    const nameFields: (keyof typeof formState)[] = [
      'firstName',
      'middleName',
      'lastName',
      'jobsite',
      'position',
      'employer',
    ]
    const nextValue = nameFields.includes(field) ? value.toUpperCase() : value
    setFormState(prev => ({ ...prev, [field]: nextValue }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleFileChange = (key: keyof typeof documents, file: File | null) => {
    setDocuments(prev => ({ ...prev, [key]: file }))
    setDocErrors(prev => {
      if (!prev[key]) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  const validateInfo = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
    const errors: Partial<Record<keyof typeof formState, string>> = {}

    if (!formState.firstName.trim()) errors.firstName = 'First name is required'
    if (!formState.lastName.trim()) errors.lastName = 'Last name is required'
    if (!formState.jobsite.trim()) errors.jobsite = 'Job site is required'
    if (!formState.position.trim()) errors.position = 'Position is required'
    if (!formState.salaryAmount.trim() || Number(formState.salaryAmount) <= 0) {
      errors.salaryAmount = 'Enter a positive salary'
    }
    if (!formState.salaryCurrency) errors.salaryCurrency = 'Select a currency'
    if (!formState.jobType) errors.jobType = 'Select a job type'
    if (!formState.sex) errors.sex = 'Select sex'

    if (formState.contactEmail && !emailRegex.test(formState.contactEmail)) {
      errors.contactEmail = 'Enter a valid email address'
    }

    if (formState.contactNumber) {
      const digits = formState.contactNumber.replace(/\D/g, '')
      if (!/^09\d{9}$/.test(digits)) {
        errors.contactNumber = 'Phone number must start with 09 and contain 11 digits'
      }
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Complete required fields',
        description: 'Please review the highlighted fields.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const goToDocumentsStep = () => {
    // Clear any previous document errors and only validate personal & job info when moving to Documents
    setDocErrors({})
    if (validateInfo()) {
      setStep('documents')
      toast({
        title: 'Step 2: Documents',
        description: 'Please upload all required documents and fill in their details.',
      })
      // Scroll to top of page
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }

  const goToReviewStep = () => {
    if (!validateInfo()) {
      setStep('info')
      // Scroll to top of page
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
      return
    }
    if (!validateDocuments()) {
      setStep('documents')
      // Scroll to top of page
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
      return
    }
    setStep('review')
    // Scroll to top of page
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  // Compute USD equivalent display similar to staff create modal
  useEffect(() => {
    const compute = async () => {
      const raw = formState.salaryAmount
      const currency = formState.salaryCurrency
      if (!raw || !currency) {
        setUsdDisplay('')
        return
      }
      const amount = Number(raw)
      if (Number.isNaN(amount) || amount <= 0) {
        setUsdDisplay('')
        return
      }
      try {
        const equivalent = await getUSDEquivalentAsync(amount, currency)
        setUsdDisplay(equivalent)
      } catch {
        setUsdDisplay('')
      }
    }
    compute()
  }, [formState.salaryAmount, formState.salaryCurrency])

  // Scroll to top when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(timer)
  }, [step])

  const validateDocuments = () => {
    const requiredDocs = [
      { key: 'passport', label: 'Passport' },
      { key: 'workVisa', label: 'Work Visa' },
      { key: 'employmentContract', label: 'Employment Contract' },
      { key: 'tesdaLicense', label: 'TESDA/PRC License' },
    ] as const

    const errors: Record<string, string> = {}
    requiredDocs.forEach(doc => {
      if (!documents[doc.key]) {
        errors[doc.key] = `${doc.label} is required`
      }
    })

    setDocErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Upload required documents',
        description: 'Please upload all required documents.',
        variant: 'destructive',
      })
      return false
    }

    // Additional date constraints mirroring staff behavior
    // Passport expiry: at least 1 year from current date
    if (documents.passport) {
      const minPassport = getPassportMinDate()
      if (!docMeta.passportNumber.trim() || !docMeta.passportExpiry) {
        toast({
          title: 'Complete passport details',
          description: 'Please provide passport number and expiry date.',
          variant: 'destructive',
        })
        return false
      }
      if (docMeta.passportExpiry < minPassport) {
        toast({
          title: 'Invalid passport expiry',
          description: 'Expiry date must be at least 1 year from today.',
          variant: 'destructive',
        })
        return false
      }
    }

    // Work visa validity: must be a future date (from tomorrow onwards)
    if (documents.workVisa) {
      const minVisaValidity = getVisaValidityMinDate()
      if (!docMeta.visaCategory || !docMeta.visaType || !docMeta.visaNumber.trim() || !docMeta.visaValidity) {
        toast({
          title: 'Complete visa details',
          description: 'Please fill in visa category, type, number, and validity.',
          variant: 'destructive',
        })
        return false
      }
      if (docMeta.visaValidity < minVisaValidity) {
        toast({
          title: 'Invalid visa validity',
          description: 'Validity date must be in the future.',
          variant: 'destructive',
        })
        return false
      }
    }

    // Employment contract issued date: cannot be in the future
    if (documents.employmentContract) {
      const maxIssued = getMaxDate()
      if (!docMeta.ecIssuedDate || !docMeta.ecVerification) {
        toast({
          title: 'Complete employment contract details',
          description: 'Please provide issued date and verification type.',
          variant: 'destructive',
        })
        return false
      }
      if (docMeta.ecIssuedDate > maxIssued) {
        toast({
          title: 'Invalid issued date',
          description: 'Employment contract issued date cannot be in the future.',
          variant: 'destructive',
        })
        return false
      }
    }

    setDocErrors({})
    return true
  }

  // Map form field names to database column names
  const mapFormFieldToDbField = (formField: string): string => {
    const mapping: Record<string, string> = {
      firstName: 'name', // Will be combined with middleName and lastName
      middleName: 'name', // Part of name
      lastName: 'name', // Part of name
      contactEmail: 'email',
      contactNumber: 'cellphone',
      sex: 'sex',
      jobsite: 'jobsite',
      position: 'position',
      jobType: 'job_type',
      employer: 'employer',
      salaryAmount: 'raw_salary',
      salaryCurrency: 'salary_currency',
      passportNumber: 'passport_number',
      passportExpiry: 'passport_validity',
      visaCategory: 'visa_category',
      visaType: 'visa_type',
      visaNumber: 'visa_number',
      visaValidity: 'visa_validity',
      ecIssuedDate: 'ec_issued_date',
      ecVerification: 'ec_verification',
    }
    return mapping[formField] || formField
  }

  const handleSubmit = async () => {
    if (step !== 'review') {
      return
    }

    if (!validateInfo() || !validateDocuments()) {
      return
    }

    // Validate session before submission
    const isSessionValid = await validateSession()
    if (!isSessionValid) {
      toast({
        title: 'Session expired',
        description: 'Your session has expired. Please log in again to submit your application.',
        variant: 'destructive',
      })
      setTimeout(() => {
        router.push('/login?from=/applicant/start/direct-hire&sessionExpired=true')
      }, 2000)
      return
    }

    // Handle correction mode submission
    if (needsCorrection && applicationId) {
      setLoading(true)
      toast({
        title: 'Submitting corrections...',
        description: 'Please wait while we process your corrections.',
      })

      try {
        // Build payload with only editable fields
        const payload: Record<string, string> = {}
        
        // Handle name fields (combine into single name field)
        if (isFieldEditable('name')) {
          const nameParts = [
            formState.firstName,
            formState.middleName,
            formState.lastName
          ].filter(Boolean)
          if (nameParts.length > 0) {
            payload.name = nameParts.join(' ').toUpperCase()
          }
        }
        
        // Handle other form fields
        if (isFieldEditable('email')) payload.email = formState.contactEmail
        if (isFieldEditable('cellphone')) payload.cellphone = formState.contactNumber
        if (isFieldEditable('sex')) payload.sex = formState.sex
        if (isFieldEditable('jobsite')) payload.jobsite = formState.jobsite.toUpperCase()
        if (isFieldEditable('position')) payload.position = formState.position.toUpperCase()
        if (isFieldEditable('job_type')) payload.job_type = formState.jobType
        if (isFieldEditable('employer')) payload.employer = formState.employer.toUpperCase()
        if (isFieldEditable('raw_salary')) {
          payload.raw_salary = String(Number(formState.salaryAmount))
        }
        if (isFieldEditable('salary_currency')) payload.salary_currency = formState.salaryCurrency
        
        // Handle document metadata fields
        if (isFieldEditable('passport_number')) payload.passport_number = docMeta.passportNumber.toUpperCase()
        if (isFieldEditable('passport_validity')) payload.passport_validity = docMeta.passportExpiry
        if (isFieldEditable('visa_category')) payload.visa_category = docMeta.visaCategory
        if (isFieldEditable('visa_type')) payload.visa_type = docMeta.visaType
        if (isFieldEditable('visa_number')) payload.visa_number = docMeta.visaNumber.toUpperCase()
        if (isFieldEditable('visa_validity')) payload.visa_validity = docMeta.visaValidity
        if (isFieldEditable('ec_issued_date')) payload.ec_issued_date = docMeta.ecIssuedDate
        if (isFieldEditable('ec_verification')) payload.ec_verification = docMeta.ecVerification

        // Check if any documents need to be uploaded
        const documentFields = ['document_passport', 'document_work_visa', 'document_employment_contract', 'document_tesda_license', 
                                'document_country_specific', 'document_compliance_form', 'document_medical_certificate', 
                                'document_peos_certificate', 'document_clearance', 'document_insurance_coverage', 
                                'document_eregistration', 'document_pdos_certificate']
        const hasDocumentCorrections = documentFields.some(field => isFieldEditable(field))
        const hasNewDocuments = Object.values(documents).some(file => file !== null)
        
        let response: Response
        if (hasDocumentCorrections && hasNewDocuments) {
          // Use FormData to send files
          const formData = new FormData()
          
          // Add form fields
          Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, value)
          })
          
          // Add document files
          if (isFieldEditable('document_passport') && documents.passport) {
            formData.append('passport', documents.passport)
            if (docMeta.passportNumber) formData.append('passportNumber', docMeta.passportNumber.toUpperCase())
            if (docMeta.passportExpiry) formData.append('passportExpiry', docMeta.passportExpiry)
          }
          if (isFieldEditable('document_work_visa') && documents.workVisa) {
            formData.append('workVisa', documents.workVisa)
            if (docMeta.visaCategory) formData.append('visaCategory', docMeta.visaCategory)
            if (docMeta.visaType) formData.append('visaType', docMeta.visaType)
            if (docMeta.visaNumber) formData.append('visaNumber', docMeta.visaNumber.toUpperCase())
            if (docMeta.visaValidity) formData.append('visaValidity', docMeta.visaValidity)
          }
          if (isFieldEditable('document_employment_contract') && documents.employmentContract) {
            formData.append('employmentContract', documents.employmentContract)
            if (docMeta.ecIssuedDate) formData.append('ecIssuedDate', docMeta.ecIssuedDate)
            if (docMeta.ecVerification) formData.append('ecVerification', docMeta.ecVerification)
          }
          if (isFieldEditable('document_tesda_license') && documents.tesdaLicense) {
            formData.append('tesdaLicense', documents.tesdaLicense)
          }
          if (isFieldEditable('document_country_specific') && documents.countrySpecific) {
            formData.append('countrySpecific', documents.countrySpecific)
          }
          if (isFieldEditable('document_compliance_form') && documents.complianceForm) {
            formData.append('complianceForm', documents.complianceForm)
          }
          if (isFieldEditable('document_medical_certificate') && documents.medicalCertificate) {
            formData.append('medicalCertificate', documents.medicalCertificate)
          }
          if (isFieldEditable('document_peos_certificate') && documents.peosCertificate) {
            formData.append('peosCertificate', documents.peosCertificate)
          }
          if (isFieldEditable('document_clearance') && documents.clearance) {
            formData.append('clearance', documents.clearance)
          }
          if (isFieldEditable('document_insurance_coverage') && documents.insuranceCoverage) {
            formData.append('insuranceCoverage', documents.insuranceCoverage)
          }
          if (isFieldEditable('document_eregistration') && documents.eregistration) {
            formData.append('eregistration', documents.eregistration)
          }
          if (isFieldEditable('document_pdos_certificate') && documents.pdosCertificate) {
            formData.append('pdosCertificate', documents.pdosCertificate)
          }
          
          response = await fetch(`/api/direct-hire/${applicationId}/corrections/resolve`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
        } else {
          // Use JSON for form fields only
          response = await fetch(`/api/direct-hire/${applicationId}/corrections/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload }),
            credentials: 'include',
          })
        }

        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit corrections')
        }

        toast({
          title: 'Corrections submitted',
          description: 'Your corrections have been submitted for review.',
        })
        
        router.push('/applicant/status')
        return
      } catch (error: any) {
        console.error('Correction submission error:', error)
        toast({
          title: 'Error',
          description: error?.message || 'Failed to submit corrections. Please try again.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    }

    // Original submission flow for new applications
    const salaryNumber = Number(formState.salaryAmount)
    const payload = new FormData()
    Object.entries(formState).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        payload.append(key, String(value))
      }
    })
    payload.set('salaryAmount', salaryNumber.toString())

    Object.entries(documents).forEach(([key, file]) => {
      if (file) payload.append(key, file)
    })

    // Add document metadata
    Object.entries(docMeta).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        payload.append(key, String(value))
      }
    })

    setLoading(true)
    toast({
      title: 'Submitting application...',
      description: 'Please wait while we process your submission.',
    })
    
    try {
      const response = await fetch('/api/applicant/direct-hire', {
        method: 'POST',
        body: payload,
        credentials: 'include', // ensure auth cookies (bb_auth_token) are sent
      })

      let data: any = {}
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (parseError) {
          const text = await response.text()
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
      } else {
        const text = await response.text()
        data = { error: text || `Server error: ${response.status} ${response.statusText}` }
      }

      if (!response.ok || !data.success) {
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          toast({
            title: 'Session expired',
            description: 'Please log in again to submit your application.',
            variant: 'destructive',
          })
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/login?from=/applicant/start/direct-hire')
          }, 2000)
          return
        }
        
        let errorMessage = data.error || data.message || `Submission failed (${response.status})`
        
        // Provide more specific error messages
        if (response.status === 409) {
          errorMessage = 'You already have a Direct Hire application. Please track its status instead.'
        } else if (response.status === 400) {
          errorMessage = data.error || 'Please check all required fields and try again.'
        } else if (response.status === 413) {
          errorMessage = 'File size too large. Please reduce the size of your documents and try again.'
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support if the problem persists.'
        }
        
        throw new Error(errorMessage)
      }

      // Clear saved draft on successful submission
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // ignore
      }

      // Redirect immediately to status page with success parameter
      router.push(`/applicant/status?submitted=direct-hire&control=${encodeURIComponent(data.data.controlNumber)}`)
    } catch (error: any) {
      console.error('Applicant direct hire submission error:', error)
      let errorMessage = 'Unable to submit your application. Please try again later.'
      
      if (error?.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Submission failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const SummaryItem = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
    </div>
  )

  return (
    <form className="bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row text-sm font-semibold text-gray-600 border-b pb-2">
        <button
          type="button"
          onClick={() => {
            // When going back to info, clear document errors
            setDocErrors({})
            setStep('info')
            // Scroll to top of page
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }, 100)
          }}
          className={`flex-1 text-left sm:text-center py-2 ${step === 'info' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        >
          1. Personal & Job Information
        </button>
        <button
          type="button"
          onClick={goToDocumentsStep}
          className={`flex-1 text-left sm:text-center py-2 ${step === 'documents' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        >
          2. Documents
        </button>
        <button
          type="button"
          onClick={() => {
            if (step === 'review') return
            goToReviewStep()
          }}
          className={`flex-1 text-left sm:text-center py-2 ${step === 'review' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        >
          3. Review &amp; Submit
        </button>
      </div>

      <div
        key={step}
        className="transition-all duration-300 ease-out"
      >
      {step === 'info' && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={formState.firstName}
                  onChange={e => updateField('firstName', e.target.value)}
                  required
                  disabled={!isFieldEditable('name')}
                  className={`${fieldErrors.firstName ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('name') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('name') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-500">{fieldErrors.firstName}</p>}
                {isFieldFlagged('name') && (
                  <p className="text-xs text-red-600 font-medium">
                    This part was not accepted due to the reason: {getCorrectionReason('name') || 'Field requires correction'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle name</Label>
                <Input
                  id="middleName"
                  value={formState.middleName}
                  onChange={e => updateField('middleName', e.target.value)}
                  disabled={!isFieldEditable('name')}
                  className={`${!isFieldEditable('name') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('name') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={formState.lastName}
                  onChange={e => updateField('lastName', e.target.value)}
                  required
                  disabled={!isFieldEditable('name')}
                  className={`${fieldErrors.lastName ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('name') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('name') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                />
                {fieldErrors.lastName && <p className="text-xs text-red-500">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={`space-y-2 ${isFieldFlagged('sex') ? 'p-2 border-2 border-red-500 rounded bg-red-50' : ''}`}>
                <Label>Sex</Label>
                <RadioGroup
                  className="flex gap-6"
                  value={formState.sex}
                  onValueChange={value => updateField('sex', value)}
                  disabled={!isFieldEditable('sex')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="sex-male" disabled={!isFieldEditable('sex')} />
                    <Label htmlFor="sex-male" className={`font-normal ${!isFieldEditable('sex') ? 'text-gray-400 cursor-not-allowed' : ''}`}>Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="sex-female" disabled={!isFieldEditable('sex')} />
                    <Label htmlFor="sex-female" className={`font-normal ${!isFieldEditable('sex') ? 'text-gray-400 cursor-not-allowed' : ''}`}>Female</Label>
                  </div>
                </RadioGroup>
            {fieldErrors.sex && <p className="text-xs text-red-500">{fieldErrors.sex}</p>}
            {isFieldFlagged('sex') && (
              <p className="text-xs text-red-600 font-medium">
                This part was not accepted due to the reason: {getCorrectionReason('sex') || 'Field requires correction'}
              </p>
            )}
              </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Phone Number</Label>
            <Input
              id="contactNumber"
              value={formState.contactNumber}
              onChange={e => {
                const raw = (e.target.value || '').replace(/\D/g, '')
                let next = raw
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
                updateField('contactNumber', next)
              }}
              placeholder="09XXXXXXXXX"
              disabled={!isFieldEditable('cellphone')}
              className={`${fieldErrors.contactNumber ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('cellphone') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('cellphone') ? 'border-red-500 border-2 bg-red-50' : ''}`}
            />
            {fieldErrors.contactNumber && <p className="text-xs text-red-500">{fieldErrors.contactNumber}</p>}
            {isFieldFlagged('cellphone') && (
              <p className="text-xs text-red-600 font-medium">
                This part was not accepted due to the reason: {getCorrectionReason('cellphone') || 'Field requires correction'}
              </p>
            )}
          </div>
            </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formState.contactEmail}
            onChange={e => updateField('contactEmail', e.target.value)}
            disabled={!isFieldEditable('email')}
            className={`${fieldErrors.contactEmail ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('email') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('email') ? 'border-red-500 border-2 bg-red-50' : ''}`}
          />
          {fieldErrors.contactEmail && <p className="text-xs text-red-500">{fieldErrors.contactEmail}</p>}
          {isFieldFlagged('email') && (
            <p className="text-xs text-red-600 font-medium">
              This part was not accepted due to the reason: {getCorrectionReason('email') || 'Field requires correction'}
            </p>
          )}
        </div>
          </section>

          <section className="space-y-4 mt-4 md:mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Job Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jobsite">Job site</Label>
            <Input
              id="jobsite"
              value={formState.jobsite}
              onChange={e => updateField('jobsite', e.target.value)}
              placeholder="COUNTRY"
              required
              disabled={!isFieldEditable('jobsite')}
              className={`${fieldErrors.jobsite ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('jobsite') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('jobsite') ? 'border-red-500 border-2 bg-red-50' : ''}`}
            />
            {fieldErrors.jobsite && <p className="text-xs text-red-500">{fieldErrors.jobsite}</p>}
            {isFieldFlagged('jobsite') && (
              <p className="text-xs text-red-600 font-medium">
                This part was not accepted due to the reason: {getCorrectionReason('jobsite') || 'Field requires correction'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formState.position}
              onChange={e => updateField('position', e.target.value)}
              placeholder="POSITION TITLE"
              required
              disabled={!isFieldEditable('position')}
              className={`${fieldErrors.position ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('position') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('position') ? 'border-red-500 border-2 bg-red-50' : ''}`}
            />
            {fieldErrors.position && <p className="text-xs text-red-500">{fieldErrors.position}</p>}
            {isFieldFlagged('position') && (
              <p className="text-xs text-red-600 font-medium">
                This part was not accepted due to the reason: {getCorrectionReason('position') || 'Field requires correction'}
              </p>
            )}
          </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job type</Label>
                <Select
                  value={formState.jobType || undefined}
                  onValueChange={value => updateField('jobType', value)}
                  disabled={!isFieldEditable('job_type')}
                >
              <SelectTrigger id="jobType" className={`bg-white ${fieldErrors.jobType ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('job_type') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('job_type') ? 'border-red-500 border-2 bg-red-50' : ''}`}>
                    <SelectValue placeholder="---" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                  </SelectContent>
                </Select>
            {fieldErrors.jobType && <p className="text-xs text-red-500">{fieldErrors.jobType}</p>}
            {isFieldFlagged('job_type') && (
              <p className="text-xs text-red-600 font-medium">
                This part was not accepted due to the reason: {getCorrectionReason('job_type') || 'Field requires correction'}
              </p>
            )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer</Label>
                <Input
                  id="employer"
                  value={formState.employer}
                  onChange={e => updateField('employer', e.target.value)}
                  placeholder="EMPLOYER NAME"
                  disabled={!isFieldEditable('employer')}
                  className={`${!isFieldEditable('employer') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('employer') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                />
                {isFieldFlagged('employer') && (
                  <p className="text-xs text-red-600 font-medium">
                    This part was not accepted due to the reason: {getCorrectionReason('employer') || 'Field requires correction'}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salaryAmount">Monthly salary</Label>
                  <Input
                    id="salaryAmount"
                    type="number"
                    min="0"
                    value={formState.salaryAmount}
                    onChange={e => updateField('salaryAmount', e.target.value)}
                    placeholder="Enter amount"
                    required
                    disabled={!isFieldEditable('raw_salary')}
                    className={`${fieldErrors.salaryAmount ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('raw_salary') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('raw_salary') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                  />
                  {fieldErrors.salaryAmount && <p className="text-xs text-red-500">{fieldErrors.salaryAmount}</p>}
                  {isFieldFlagged('raw_salary') && (
                    <p className="text-xs text-red-600 font-medium">
                      This part was not accepted due to the reason: {getCorrectionReason('raw_salary') || 'Field requires correction'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryCurrency">Currency</Label>
                <Select
                  value={formState.salaryCurrency || undefined}
                  onValueChange={value => updateField('salaryCurrency', value)}
                  disabled={!isFieldEditable('salary_currency')}
                >
                  <SelectTrigger id="salaryCurrency" className={`bg-white ${fieldErrors.salaryCurrency ? 'border-red-500 focus:border-red-500' : ''} ${!isFieldEditable('salary_currency') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('salary_currency') ? 'border-red-500 border-2 bg-red-50' : ''}`}>
                    <SelectValue placeholder="---" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CURRENCIES.map(currency => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  {fieldErrors.salaryCurrency && <p className="text-xs text-red-500">{fieldErrors.salaryCurrency}</p>}
                  {isFieldFlagged('salary_currency') && (
                    <p className="text-xs text-red-600 font-medium">
                      This part was not accepted due to the reason: {getCorrectionReason('salary_currency') || 'Field requires correction'}
                    </p>
                  )}
                </div>
              </div>
              {usdDisplay && formState.salaryCurrency !== 'USD' && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-blue-50 rounded-md border border-blue-100 text-sm text-blue-800">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span>USD Equivalent: {usdDisplay}</span>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {step === 'documents' && (
        <>
          <section id="documents-section" data-section="documents" className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Required Documents</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Passport */}
                <div
                  className={`space-y-2 text-left rounded-lg p-3 ${
                    passportComplete ? 'bg-green-50 border border-green-300' : ''
                  }`}
                >
                  <Label
                    htmlFor="passportFile"
                    className={passportComplete ? 'text-green-700 font-medium' : ''}
                  >
                    Passport (valid at least 1 year)
                  </Label>
                  {existingDocs.passport && existingDocInfo.passport && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <span className="font-medium">Previously uploaded:</span> {existingDocInfo.passport.fileName}
                    </div>
                  )}
                  <Input
                    id="passportFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('passport', event.target.files?.[0] || null)}
                    disabled={needsCorrection && !isFieldFlagged('document_passport')}
                    className={`${docErrors.passport ? 'border-red-500 focus:border-red-500' : ''} ${needsCorrection && !isFieldFlagged('document_passport') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('document_passport') ? 'border-red-500 border-2' : ''}`}
                  />
                  {isFieldFlagged('document_passport') && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      This part was not accepted due to the reason: {getCorrectionReason('document_passport') || 'Document requires correction'}
                    </p>
                  )}
                  {documents.passport && !existingDocs.passport && (
                    <div className="text-xs text-green-600 mt-1">
                      Selected: {documents.passport.name}
                    </div>
                  )}
                  {docErrors.passport && <p className="text-xs text-red-500">{docErrors.passport}</p>}
                  {(documents.passport || existingDocs.passport) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 min-w-0 w-full">
                      <div className="space-y-1">
                        <Label
                          htmlFor="passportNumber"
                          className={`text-xs ${docMeta.passportNumber ? 'text-green-700' : ''}`}
                        >
                          Passport Number
                        </Label>
                        <Input
                          id="passportNumber"
                          value={docMeta.passportNumber}
                          onChange={e => setDocMeta(prev => ({ ...prev, passportNumber: e.target.value.toUpperCase() }))}
                          placeholder="E.g. P1234567"
                          disabled={!isFieldEditable('passport_number')}
                          className={`text-xs ${
                            passportComplete ? 'border-green-500 focus:border-green-500' : ''
                          } ${!isFieldEditable('passport_number') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('passport_number') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                        />
                        {isFieldFlagged('passport_number') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('passport_number') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="passportExpiry"
                          className={`text-xs ${docMeta.passportExpiry ? 'text-green-700' : ''}`}
                        >
                          Expiry Date
                        </Label>
                        <DateWheelPicker
                          value={docMeta.passportExpiry}
                          onChange={(date) => setDocMeta(prev => ({ ...prev, passportExpiry: date }))}
                          minDate={getPassportMinDate()}
                          placeholder="Select date"
                          disabled={!isFieldEditable('passport_validity')}
                          className={`${passportComplete ? 'border-green-500' : ''} ${!isFieldEditable('passport_validity') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('passport_validity') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                          label="Passport Expiry Date"
                        />
                        {isFieldFlagged('passport_validity') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('passport_validity') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Work Visa */}
                <div
                  className={`space-y-2 text-left rounded-lg p-3 ${
                    workVisaComplete ? 'bg-green-50 border border-green-300' : ''
                  }`}
                >
                  <Label
                    htmlFor="workVisaFile"
                    className={workVisaComplete ? 'text-green-700 font-medium' : ''}
                  >
                    Valid Work Visa, Entry/Work Permit
                  </Label>
                  {existingDocs.workVisa && existingDocInfo.workVisa && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <span className="font-medium">Previously uploaded:</span> {existingDocInfo.workVisa.fileName}
                    </div>
                  )}
                  <Input
                    id="workVisaFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('workVisa', event.target.files?.[0] || null)}
                    disabled={needsCorrection && !isFieldFlagged('document_work_visa')}
                    className={`${docErrors.workVisa ? 'border-red-500 focus:border-red-500' : ''} ${needsCorrection && !isFieldFlagged('document_work_visa') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('document_work_visa') ? 'border-red-500 border-2' : ''}`}
                  />
                  {isFieldFlagged('document_work_visa') && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      This part was not accepted due to the reason: {getCorrectionReason('document_work_visa') || 'Document requires correction'}
                    </p>
                  )}
                  {documents.workVisa && !existingDocs.workVisa && (
                    <div className="text-xs text-green-600 mt-1">
                      Selected: {documents.workVisa.name}
                    </div>
                  )}
                  {docErrors.workVisa && <p className="text-xs text-red-500">{docErrors.workVisa}</p>}
                  {(documents.workVisa || existingDocs.workVisa) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 min-w-0 w-full">
                      <div className="space-y-1">
                        <Label
                          htmlFor="visaCategory"
                          className={`text-xs ${docMeta.visaCategory ? 'text-green-700' : ''}`}
                        >
                          Visa Category
                        </Label>
                        <select
                          id="visaCategory"
                          className={`w-full border rounded px-2 py-2 text-xs h-10 ${
                            workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                          } ${!isFieldEditable('visa_category') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_category') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                          value={docMeta.visaCategory}
                          onChange={e =>
                            setDocMeta(prev => ({
                              ...prev,
                              visaCategory: e.target.value,
                              visaType: '',
                            }))
                          }
                          disabled={!isFieldEditable('visa_category')}
                        >
                          <option value="">----</option>
                          <option value="Temporary Work Visas (Non-Immigrant)">Temporary Work Visas (Non-Immigrant)</option>
                          <option value="Immigrant Work Visas (Employment-Based Green Cards)">
                            Immigrant Work Visas (Employment-Based Green Cards)
                          </option>
                          <option value="Family / Dependent Visas">Family / Dependent Visas</option>
                          <option value="Others">Others</option>
                        </select>
                        {isFieldFlagged('visa_category') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('visa_category') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="visaType"
                          className={`text-xs ${docMeta.visaType ? 'text-green-700' : ''}`}
                        >
                          Visa Type
                        </Label>
                        {docMeta.visaCategory === 'Temporary Work Visas (Non-Immigrant)' ? (
                          <select
                            id="visaType"
                            className={`w-full border rounded px-2 py-2 text-xs h-10 ${
                              workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                            } ${!isFieldEditable('visa_type') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_type') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
                            disabled={!isFieldEditable('visa_type')}
                          >
                            <option value="">----</option>
                            <option value="H-1B – Skilled Workers / Professionals">
                              H-1B – Skilled Workers / Professionals
                            </option>
                            <option value="H-2A – Temporary Agricultural Workers">
                              H-2A – Temporary Agricultural Workers
                            </option>
                            <option value="H-2B – Temporary Non-Agricultural Workers">
                              H-2B – Temporary Non-Agricultural Workers
                            </option>
                            <option value="H-3 – Trainees (non-medical, non-academic)">
                              H-3 – Trainees (non-medical, non-academic)
                            </option>
                            <option value="L-1 – Intra-Company Transfers">L-1 – Intra-Company Transfers</option>
                            <option value="O-1 – Individuals with Extraordinary Ability">
                              O-1 – Individuals with Extraordinary Ability
                            </option>
                            <option value="P-1 – Athletes / Entertainers">P-1 – Athletes / Entertainers</option>
                            <option value="TN – NAFTA/USMCA Professionals">TN – NAFTA/USMCA Professionals</option>
                          </select>
                        ) : docMeta.visaCategory === 'Immigrant Work Visas (Employment-Based Green Cards)' ? (
                          <select
                            id="visaType"
                            className={`w-full border rounded px-2 py-2 text-xs h-10 ${
                              workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                            } ${!isFieldEditable('visa_type') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_type') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
                            disabled={!isFieldEditable('visa_type')}
                          >
                            <option value="">----</option>
                            <option value="EB-1 – Priority Workers">EB-1 – Priority Workers</option>
                            <option value="EB-2 – Professionals with Advanced Degrees">
                              EB-2 – Professionals with Advanced Degrees
                            </option>
                            <option value="EB-3 – Skilled Workers, Professionals, and Other Workers">
                              EB-3 – Skilled Workers, Professionals, and Other Workers
                            </option>
                            <option value="EB-4 – Special Immigrants">EB-4 – Special Immigrants</option>
                            <option value="EB-5 – Immigrant Investors">EB-5 – Immigrant Investors</option>
                          </select>
                        ) : docMeta.visaCategory === 'Family / Dependent Visas' ? (
                          <select
                            id="visaType"
                            className={`w-full border rounded px-2 py-2 text-xs h-10 ${
                              workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                            } ${!isFieldEditable('visa_type') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_type') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
                            disabled={!isFieldEditable('visa_type')}
                          >
                            <option value="">----</option>
                            <option value="H-4 – Dependents of H Visa Holders">H-4 – Dependents of H Visa Holders</option>
                            <option value="L-2 – Dependents of L-1 Holders">L-2 – Dependents of L-1 Holders</option>
                            <option value="K-1 – Fiancé(e) of U.S. Citizen">K-1 – Fiancé(e) of U.S. Citizen</option>
                            <option value="IR/CR Categories – Immediate Relative Immigrant Visas">
                              IR/CR Categories – Immediate Relative Immigrant Visas
                            </option>
                          </select>
                        ) : docMeta.visaCategory === 'Others' ? (
                          <Input
                            id="visaType"
                            type="text"
                            className={`text-xs h-10 ${workVisaComplete ? 'border-green-500 focus:border-green-500' : ''} ${!isFieldEditable('visa_type') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_type') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                            placeholder="Enter custom visa type"
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
                            disabled={!isFieldEditable('visa_type')}
                          />
                        ) : (
                          <Input
                            id="visaType"
                            type="text"
                            className="text-xs border-gray-300 h-10"
                            placeholder="Select category first"
                            disabled
                          />
                        )}
                        {isFieldFlagged('visa_type') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('visa_type') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="visaNumber"
                          className={`text-xs ${docMeta.visaNumber ? 'text-green-700' : ''}`}
                        >
                          Visa Number
                        </Label>
                        <Input
                          id="visaNumber"
                          value={docMeta.visaNumber}
                          onChange={e => setDocMeta(prev => ({ ...prev, visaNumber: e.target.value.toUpperCase() }))}
                          placeholder="Visa number"
                          disabled={!isFieldEditable('visa_number')}
                          className={`text-xs ${
                            workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                          } ${!isFieldEditable('visa_number') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_number') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                        />
                        {isFieldFlagged('visa_number') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('visa_number') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="visaValidity"
                          className={`text-xs ${docMeta.visaValidity ? 'text-green-700' : ''}`}
                        >
                          Validity
                        </Label>
                        <DateWheelPicker
                          value={docMeta.visaValidity}
                          onChange={(date) => setDocMeta(prev => ({ ...prev, visaValidity: date }))}
                          minDate={getVisaValidityMinDate()}
                          placeholder="Select date"
                          disabled={!isFieldEditable('visa_validity')}
                          className={`${workVisaComplete ? 'border-green-500' : ''} ${!isFieldEditable('visa_validity') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('visa_validity') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                          label="Visa Validity"
                        />
                        {isFieldFlagged('visa_validity') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('visa_validity') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Employment Contract */}
                <div
                  className={`space-y-2 text-left rounded-lg p-3 ${
                    employmentContractComplete ? 'bg-green-50 border border-green-300' : ''
                  }`}
                >
                  <Label
                    htmlFor="employmentContractFile"
                    className={employmentContractComplete ? 'text-green-700 font-medium' : ''}
                  >
                    Employment Contract / Offer Letter
                  </Label>
                  {existingDocs.employmentContract && existingDocInfo.employmentContract && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <span className="font-medium">Previously uploaded:</span> {existingDocInfo.employmentContract.fileName}
                    </div>
                  )}
                  <Input
                    id="employmentContractFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('employmentContract', event.target.files?.[0] || null)}
                    disabled={needsCorrection && !isFieldFlagged('document_employment_contract')}
                    className={`${docErrors.employmentContract ? 'border-red-500 focus:border-red-500' : ''} ${needsCorrection && !isFieldFlagged('document_employment_contract') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('document_employment_contract') ? 'border-red-500 border-2' : ''}`}
                  />
                  {isFieldFlagged('document_employment_contract') && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      This part was not accepted due to the reason: {getCorrectionReason('document_employment_contract') || 'Document requires correction'}
                    </p>
                  )}
                  {documents.employmentContract && !existingDocs.employmentContract && (
                    <div className="text-xs text-green-600 mt-1">
                      Selected: {documents.employmentContract.name}
                    </div>
                  )}
                  {docErrors.employmentContract && (
                    <p className="text-xs text-red-500">{docErrors.employmentContract}</p>
                  )}
                  {(documents.employmentContract || existingDocs.employmentContract) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 min-w-0 w-full">
                      <div className="space-y-1">
                        <Label
                          htmlFor="ecIssuedDate"
                          className={`text-xs ${docMeta.ecIssuedDate ? 'text-green-700' : ''}`}
                        >
                          Issued Date
                        </Label>
                        <DateWheelPicker
                          value={docMeta.ecIssuedDate}
                          onChange={(date) => setDocMeta(prev => ({ ...prev, ecIssuedDate: date }))}
                          maxDate={getMaxDate()}
                          placeholder="Select date"
                          disabled={!isFieldEditable('ec_issued_date')}
                          className={`${employmentContractComplete ? 'border-green-500' : ''} ${!isFieldEditable('ec_issued_date') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('ec_issued_date') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                          label="Employment Contract Issued Date"
                        />
                        {isFieldFlagged('ec_issued_date') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('ec_issued_date') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="ecVerification"
                          className={`text-xs ${docMeta.ecVerification ? 'text-green-700' : ''}`}
                        >
                          Verification Type
                        </Label>
                        <select
                          id="ecVerification"
                          className={`w-full border rounded px-2 py-2 text-xs h-10 ${
                            employmentContractComplete ? 'border-green-500 focus:border-green-500' : ''
                          } ${!isFieldEditable('ec_verification') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('ec_verification') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                          disabled={!isFieldEditable('ec_verification')}
                          value={docMeta.ecVerification}
                          onChange={e => setDocMeta(prev => ({ ...prev, ecVerification: e.target.value }))}
                        >
                          <option value="">----</option>
                          <option value="POLO">POLO</option>
                          <option value="PE/Consulate for countries with no POLO">
                            PE/Consulate for countries with no POLO
                          </option>
                          <option value="Apostille with POLO Verification">Apostille with POLO Verification</option>
                          <option value="Apostille with PE Acknowledgement">Apostille with PE Acknowledgement</option>
                          <option value="Notarized Employment Contract for DFA">
                            Notarized Employment Contract for DFA
                          </option>
                          <option value="Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients">
                            Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients
                          </option>
                          <option value="Employment Contract with confirmation from SEM">
                            Employment Contract with confirmation from SEM
                          </option>
                        </select>
                        {isFieldFlagged('ec_verification') && (
                          <p className="text-xs text-red-600 font-medium">
                            This part was not accepted due to the reason: {getCorrectionReason('ec_verification') || 'Field requires correction'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* TESDA / PRC License */}
                <div className="space-y-2 text-left">
                  <Label htmlFor="tesdaLicenseFile">TESDA / PRC License</Label>
                  {existingDocs.tesdaLicense && existingDocInfo.tesdaLicense && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <span className="font-medium">Previously uploaded:</span> {existingDocInfo.tesdaLicense.fileName}
                    </div>
                  )}
                  <Input
                    id="tesdaLicenseFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('tesdaLicense', event.target.files?.[0] || null)}
                    disabled={needsCorrection && !isFieldFlagged('document_tesda_license')}
                    className={`${docErrors.tesdaLicense ? 'border-red-500 focus:border-red-500' : ''} ${needsCorrection && !isFieldFlagged('document_tesda_license') ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFieldFlagged('document_tesda_license') ? 'border-red-500 border-2' : ''}`}
                  />
                  {isFieldFlagged('document_tesda_license') && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      This part was not accepted due to the reason: {getCorrectionReason('document_tesda_license') || 'Document requires correction'}
                    </p>
                  )}
                  {documents.tesdaLicense && !existingDocs.tesdaLicense && (
                    <div className="text-xs text-green-600 mt-1">
                      Selected: {documents.tesdaLicense.name}
                    </div>
                  )}
                  {docErrors.tesdaLicense && <p className="text-xs text-red-500">{docErrors.tesdaLicense}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Optional / Country-Specific Documents</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'countrySpecific', label: 'Country-Specific Requirements' },
                  { key: 'complianceForm', label: 'Compliance Form' },
                  { key: 'medicalCertificate', label: 'Medical Certificate' },
                  { key: 'peosCertificate', label: 'PEOS Certificate' },
                  { key: 'clearance', label: 'Clearance' },
                  { key: 'insuranceCoverage', label: 'Insurance Coverage Proof' },
                ].map(item => {
                  const fieldKey = getOptionalDocFieldKey(item.key)
                  const isFlagged = isFieldFlagged(fieldKey)
                  return (
                    <div key={item.key} className="space-y-2 text-left">
                      <Label htmlFor={`${item.key}File`}>{item.label}</Label>
                      <Input
                        id={`${item.key}File`}
                        type="file"
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        onChange={event => handleFileChange(item.key as keyof typeof documents, event.target.files?.[0] || null)}
                        disabled={needsCorrection && !isFlagged}
                        className={`${needsCorrection && !isFlagged ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFlagged ? 'border-red-500 border-2' : ''}`}
                      />
                      {isFlagged && (
                        <p className="text-xs text-red-600 font-medium">
                          This part was not accepted due to the reason: {getCorrectionReason(fieldKey) || 'Document requires correction'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">OEC Issuance (Optional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'eregistration', label: 'E-Registration Form' },
                  { key: 'pdosCertificate', label: 'PDOS Certificate' },
                ].map(item => {
                  const fieldKey = getOptionalDocFieldKey(item.key)
                  const isFlagged = isFieldFlagged(fieldKey)
                  return (
                    <div key={item.key} className="space-y-2 text-left">
                      <Label htmlFor={`${item.key}File`}>{item.label}</Label>
                      <Input
                        id={`${item.key}File`}
                        type="file"
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        onChange={event => handleFileChange(item.key as keyof typeof documents, event.target.files?.[0] || null)}
                        disabled={needsCorrection && !isFlagged}
                        className={`${needsCorrection && !isFlagged ? 'bg-gray-100 cursor-not-allowed' : ''} ${isFlagged ? 'border-red-500 border-2' : ''}`}
                      />
                      {isFlagged && (
                        <p className="text-xs text-red-600 font-medium">
                          This part was not accepted due to the reason: {getCorrectionReason(fieldKey) || 'Document requires correction'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-gray-500 text-left">Accepted formats: JPG, PNG, PDF, DOCX up to 5MB each.</p>
          </section>
        </>
      )}
      {step === 'review' && (
        <>
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review your application</h2>
                <p className="text-sm text-red-600 mt-1">
                  Your application will no longer be editable once submitted. To request any changes after submission,
                  please visit the Department of Migrant Workers Region IV-A Office.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryItem
                  label="Full Name"
                  value={[formState.firstName, formState.middleName, formState.lastName].filter(Boolean).join(' ') || 'N/A'}
                />
                <SummaryItem label="Sex" value={formState.sex ? formState.sex.toUpperCase() : 'N/A'} />
                <SummaryItem label="Email" value={formState.contactEmail || 'N/A'} />
                <SummaryItem label="Phone Number" value={formState.contactNumber || 'N/A'} />
                <SummaryItem label="Job Site" value={formState.jobsite} />
                <SummaryItem label="Position" value={formState.position} />
                <SummaryItem label="Job Type" value={formState.jobType ? formState.jobType.toUpperCase() : 'N/A'} />
                <SummaryItem label="Employer" value={formState.employer || 'N/A'} />
                <SummaryItem
                  label="Monthly Salary"
                  value={`${formState.salaryCurrency || 'N/A'} ${formState.salaryAmount || '0'}`}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6 space-y-3">
              <h3 className="text-base font-semibold text-gray-900">Document checklist</h3>
              <p className="text-sm text-gray-600">
                Ensure all required documents are uploaded and their details are complete.
              </p>
              <ul className="space-y-2 text-sm">
                {documentChecklist.map(item => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${
                        item.complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {item.complete ? '✓' : '!'}
                    </span>
                    <span className={item.complete ? 'text-gray-900' : 'text-gray-600'}>
                      {item.label} {item.complete ? 'complete' : 'needs attention'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
        {step === 'info' && (
          <Button
            type="button"
            className="bg-[#0f62fe] hover:bg-[#0c4dcc]"
            onClick={goToDocumentsStep}
          >
            Next
          </Button>
        )}
        {step === 'documents' && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setDocErrors({})
                setStep('info')
                // Scroll to top of page
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }, 100)
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              className="bg-[#0f62fe] hover:bg-[#0c4dcc]"
              disabled={loading || (needsCorrection && !formHasChanges)}
              onClick={goToReviewStep}
            >
              Review Application
            </Button>
          </>
        )}
        {step === 'review' && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setStep('documents')
                // Scroll to top of page
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }, 100)
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              className="bg-[#0f62fe] hover:bg-[#0c4dcc]"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

