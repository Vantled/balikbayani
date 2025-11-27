// app/applicant/start/direct-hire/direct-hire-form.tsx
'use client'

import { useState, useEffect } from 'react'
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
}

export default function DirectHireApplicantForm({ defaultEmail, defaultNames }: DirectHireApplicantFormProps) {
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
    sex: 'male',
    contactEmail: defaultEmail || '',
    contactNumber: '09',
    jobsite: '',
    position: '',
    jobType: 'professional',
    employer: '',
    salaryAmount: '',
    salaryCurrency: 'USD',
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

  const passportComplete =
    !!documents.passport && !!docMeta.passportNumber.trim() && !!docMeta.passportExpiry
  const workVisaComplete =
    !!documents.workVisa &&
    !!docMeta.visaCategory &&
    !!docMeta.visaType &&
    !!docMeta.visaNumber.trim() &&
    !!docMeta.visaValidity
  const employmentContractComplete =
    !!documents.employmentContract && !!docMeta.ecIssuedDate && !!docMeta.ecVerification

  const documentChecklist = [
    { label: 'Passport', complete: passportComplete },
    { label: 'Work Visa / Permit', complete: workVisaComplete },
    { label: 'Employment Contract', complete: employmentContractComplete },
    { label: 'TESDA / PRC License', complete: !!documents.tesdaLicense },
  ]

  // Load saved draft from localStorage on mount (client-side only)
  useEffect(() => {
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
  }, [])

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
    }
  }

  const goToReviewStep = () => {
    if (!validateInfo()) {
      setStep('info')
      return
    }
    if (!validateDocuments()) {
      setStep('documents')
      return
    }
    setStep('review')
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

  const handleSubmit = async () => {
    if (step !== 'review') {
      return
    }

    if (!validateInfo() || !validateDocuments()) {
      return
    }

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

      toast({
        title: 'Application submitted successfully!',
        description: `Your Direct Hire application has been submitted. Control number: ${data.data.controlNumber}. You will be redirected shortly.`,
      })

      // Clear saved draft on successful submission
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // ignore
      }

      // Delay redirect to allow user to see the success message
      setTimeout(() => {
        router.push(`/applicant?submitted=direct-hire&control=${encodeURIComponent(data.data.controlNumber)}`)
      }, 2000)
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
                  placeholder="JUAN"
                  required
                  className={fieldErrors.firstName ? 'border-red-500 focus:border-red-500' : ''}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-500">{fieldErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle name</Label>
                <Input
                  id="middleName"
                  value={formState.middleName}
                  onChange={e => updateField('middleName', e.target.value)}
                  placeholder="REYES"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={formState.lastName}
                  onChange={e => updateField('lastName', e.target.value)}
                  placeholder="DELA CRUZ"
                  required
                  className={fieldErrors.lastName ? 'border-red-500 focus:border-red-500' : ''}
                />
                {fieldErrors.lastName && <p className="text-xs text-red-500">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sex</Label>
                <RadioGroup
                  className="flex gap-6"
                  value={formState.sex}
                  onValueChange={value => updateField('sex', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="sex-male" />
                    <Label htmlFor="sex-male" className="font-normal">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="sex-female" />
                    <Label htmlFor="sex-female" className="font-normal">Female</Label>
                  </div>
                </RadioGroup>
            {fieldErrors.sex && <p className="text-xs text-red-500">{fieldErrors.sex}</p>}
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
              className={fieldErrors.contactNumber ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.contactNumber && <p className="text-xs text-red-500">{fieldErrors.contactNumber}</p>}
          </div>
            </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formState.contactEmail}
            onChange={e => updateField('contactEmail', e.target.value)}
            placeholder="you@example.com"
            className={fieldErrors.contactEmail ? 'border-red-500 focus:border-red-500' : ''}
          />
          {fieldErrors.contactEmail && <p className="text-xs text-red-500">{fieldErrors.contactEmail}</p>}
        </div>
          </section>

          <section className="space-y-4">
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
              className={fieldErrors.jobsite ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.jobsite && <p className="text-xs text-red-500">{fieldErrors.jobsite}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formState.position}
              onChange={e => updateField('position', e.target.value)}
              placeholder="POSITION TITLE"
              required
              className={fieldErrors.position ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.position && <p className="text-xs text-red-500">{fieldErrors.position}</p>}
          </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job type</Label>
                <Select
                  value={formState.jobType}
                  onValueChange={value => updateField('jobType', value)}
                >
              <SelectTrigger id="jobType" className={`bg-white ${fieldErrors.jobType ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                  </SelectContent>
                </Select>
            {fieldErrors.jobType && <p className="text-xs text-red-500">{fieldErrors.jobType}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer</Label>
                <Input
                  id="employer"
                  value={formState.employer}
                  onChange={e => updateField('employer', e.target.value)}
                  placeholder="EMPLOYER NAME"
                />
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
                    className={fieldErrors.salaryAmount ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {fieldErrors.salaryAmount && <p className="text-xs text-red-500">{fieldErrors.salaryAmount}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryCurrency">Currency</Label>
                <Select
                  value={formState.salaryCurrency}
                  onValueChange={value => updateField('salaryCurrency', value)}
                >
                  <SelectTrigger id="salaryCurrency" className={`bg-white ${fieldErrors.salaryCurrency ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Currency" />
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
          <section className="space-y-6">
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
                  <Input
                    id="passportFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('passport', event.target.files?.[0] || null)}
                    className={docErrors.passport ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {docErrors.passport && <p className="text-xs text-red-500">{docErrors.passport}</p>}
                  {documents.passport && (
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
                          className={`text-xs ${
                            passportComplete ? 'border-green-500 focus:border-green-500' : ''
                          }`}
                        />
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
                          className={passportComplete ? 'border-green-500' : ''}
                          label="Passport Expiry Date"
                        />
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
                  <Input
                    id="workVisaFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('workVisa', event.target.files?.[0] || null)}
                    className={docErrors.workVisa ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {docErrors.workVisa && <p className="text-xs text-red-500">{docErrors.workVisa}</p>}
                  {documents.workVisa && (
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
                          }`}
                          value={docMeta.visaCategory}
                          onChange={e =>
                            setDocMeta(prev => ({
                              ...prev,
                              visaCategory: e.target.value,
                              visaType: '',
                            }))
                          }
                        >
                          <option value="">----</option>
                          <option value="Temporary Work Visas (Non-Immigrant)">Temporary Work Visas (Non-Immigrant)</option>
                          <option value="Immigrant Work Visas (Employment-Based Green Cards)">
                            Immigrant Work Visas (Employment-Based Green Cards)
                          </option>
                          <option value="Family / Dependent Visas">Family / Dependent Visas</option>
                          <option value="Others">Others</option>
                        </select>
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
                            }`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
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
                            }`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
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
                            }`}
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
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
                            className={`text-xs h-10 ${workVisaComplete ? 'border-green-500 focus:border-green-500' : ''}`}
                            placeholder="Enter custom visa type"
                            value={docMeta.visaType}
                            onChange={e => setDocMeta(prev => ({ ...prev, visaType: e.target.value }))}
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
                          className={`text-xs ${
                            workVisaComplete ? 'border-green-500 focus:border-green-500' : ''
                          }`}
                        />
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
                          className={workVisaComplete ? 'border-green-500' : ''}
                          label="Visa Validity"
                        />
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
                  <Input
                    id="employmentContractFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('employmentContract', event.target.files?.[0] || null)}
                    className={docErrors.employmentContract ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {docErrors.employmentContract && (
                    <p className="text-xs text-red-500">{docErrors.employmentContract}</p>
                  )}
                  {documents.employmentContract && (
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
                          className={employmentContractComplete ? 'border-green-500' : ''}
                          label="Employment Contract Issued Date"
                        />
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
                          }`}
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
                      </div>
                    </div>
                  )}
                </div>

                {/* TESDA / PRC License */}
                <div className="space-y-2 text-left">
                  <Label htmlFor="tesdaLicenseFile">TESDA / PRC License</Label>
                  <Input
                    id="tesdaLicenseFile"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={event => handleFileChange('tesdaLicense', event.target.files?.[0] || null)}
                    className={docErrors.tesdaLicense ? 'border-red-500 focus:border-red-500' : ''}
                  />
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
                ].map(item => (
                  <div key={item.key} className="space-y-2 text-left">
                    <Label htmlFor={`${item.key}File`}>{item.label}</Label>
                    <Input
                      id={`${item.key}File`}
                      type="file"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={event => handleFileChange(item.key as keyof typeof documents, event.target.files?.[0] || null)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">OEC Issuance (Optional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'eregistration', label: 'E-Registration Form' },
                  { key: 'pdosCertificate', label: 'PDOS Certificate' },
                ].map(item => (
                  <div key={item.key} className="space-y-2 text-left">
                    <Label htmlFor={`${item.key}File`}>{item.label}</Label>
                    <Input
                      id={`${item.key}File`}
                      type="file"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={event => handleFileChange(item.key as keyof typeof documents, event.target.files?.[0] || null)}
                    />
                  </div>
                ))}
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
                <SummaryItem label="Sex" value={formState.sex.toUpperCase()} />
                <SummaryItem label="Email" value={formState.contactEmail || 'N/A'} />
                <SummaryItem label="Phone Number" value={formState.contactNumber || 'N/A'} />
                <SummaryItem label="Job Site" value={formState.jobsite} />
                <SummaryItem label="Position" value={formState.position} />
                <SummaryItem label="Job Type" value={formState.jobType.toUpperCase()} />
                <SummaryItem label="Employer" value={formState.employer || 'N/A'} />
                <SummaryItem
                  label="Monthly Salary"
                  value={`${formState.salaryCurrency || 'USD'} ${formState.salaryAmount || '0'}`}
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
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              className="bg-[#0f62fe] hover:bg-[#0c4dcc]"
              disabled={loading}
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
              onClick={() => setStep('documents')}
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

