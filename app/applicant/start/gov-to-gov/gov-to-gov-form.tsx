'use client'

// app/applicant/start/gov-to-gov/gov-to-gov-form.tsx
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DateWheelPicker } from '@/components/ui/date-wheel-picker'
import { useToast } from '@/hooks/use-toast'
import { validateSession } from '@/lib/auth'

interface GovToGovApplicantFormProps {
  defaultEmail?: string
  defaultNames?: {
    first?: string
    middle?: string
    last?: string
  }
}

const EDUCATION_LEVELS = [
  'POST GRADUATE',
  'COLLEGE GRADUATE',
  'VOCATIONAL GRADUATE',
  'COLLEGE LEVEL',
  'HIGH SCHOOL GRADUATE',
]

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export default function GovToGovApplicantForm({ defaultEmail, defaultNames }: GovToGovApplicantFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const STORAGE_KEY = 'bb_applicant_gov_to_gov_form_v1'
  const [step, setStep] = useState<'details' | 'experience' | 'review'>('details')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formState, setFormState] = useState({
    firstName: (defaultNames?.first || '').toUpperCase(),
    middleName: (defaultNames?.middle || '').toUpperCase(),
    lastName: (defaultNames?.last || '').toUpperCase(),
    sex: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    educationalAttainment: '',
    presentAddress: '',
    emailAddress: defaultEmail || '',
    contactNumber: '09',
    passportNumber: '',
    passportValidity: '',
    withTaiwanExperience: 'no',
    taiwanCompany: '',
    taiwanYearStarted: '',
    taiwanYearEnded: '',
    withOtherExperience: 'no',
    otherCompany: '',
    otherYearStarted: '',
    otherYearEnded: '',
  })
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 51 }, (_, i) => currentYear - i)
  }, [])

  // Load saved draft on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        formState?: typeof formState
        step?: typeof step
      }
      if (parsed.formState) {
        setFormState(prev => ({
          ...prev,
          ...parsed.formState,
        }))
      }
      if (parsed.step === 'details' || parsed.step === 'experience' || parsed.step === 'review') {
        setStep(parsed.step)
      }
    } catch (err) {
      console.error('Failed to load Gov-to-Gov applicant draft:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save draft whenever formState or step changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const payload = { formState, step }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.error('Failed to save Gov-to-Gov applicant draft:', err)
    }
  }, [formState, step])

  const clearError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const updateField = (field: keyof typeof formState, value: string, options?: { uppercase?: boolean }) => {
    setFormState(prev => ({
      ...prev,
      [field]: options?.uppercase === false ? value : value.toUpperCase(),
    }))
    clearError(field)
  }

  const updateRawField = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
    clearError(field)
  }

  const validateDetails = () => {
    const errors: Record<string, string> = {}
    if (!formState.firstName.trim()) errors.firstName = 'First name is required.'
    if (!formState.lastName.trim()) errors.lastName = 'Last name is required.'
    if (!formState.sex) errors.sex = 'Please select sex.'
    if (!formState.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.'
    } else {
      const selectedDate = new Date(formState.dateOfBirth)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.'
      }
    }
    if (!formState.height || Number(formState.height) <= 0) errors.height = 'Enter a valid height (cm).'
    if (!formState.weight || Number(formState.weight) <= 0) errors.weight = 'Enter a valid weight (kg).'
    if (!formState.educationalAttainment) errors.educationalAttainment = 'Select educational attainment.'
    if (!formState.presentAddress.trim()) errors.presentAddress = 'Present address is required.'

    const email = formState.emailAddress.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.emailAddress = 'Enter a valid email address.'
    }

    const contact = formState.contactNumber.trim()
    if (!/^09\d{9}$/.test(contact)) {
      errors.contactNumber = 'Phone number must start with 09 and be 11 digits.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }))
      toast({
        title: 'Please correct the highlighted fields',
        description: 'Complete your personal information before continuing.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const validateExperience = () => {
    const errors: Record<string, string> = {}
    if (!formState.passportNumber.trim()) errors.passportNumber = 'Passport number is required.'
    if (!formState.passportValidity) {
      errors.passportValidity = 'Passport validity date is required.'
    } else if (formState.passportValidity < todayIso) {
      errors.passportValidity = 'Passport validity must be in the future.'
    }

    if (formState.withTaiwanExperience === 'yes') {
      if (!formState.taiwanCompany.trim()) errors.taiwanCompany = 'Company name is required.'
      if (!formState.taiwanYearStarted) errors.taiwanYearStarted = 'Start year is required.'
      if (!formState.taiwanYearEnded) errors.taiwanYearEnded = 'End year is required.'
    }

    if (formState.withOtherExperience === 'yes') {
      if (!formState.otherCompany.trim()) errors.otherCompany = 'Company name is required.'
      if (!formState.otherYearStarted) errors.otherYearStarted = 'Start year is required.'
      if (!formState.otherYearEnded) errors.otherYearEnded = 'End year is required.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }))
      toast({
        title: 'Incomplete experience details',
        description: 'Fill out all required fields before reviewing your application.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToExperienceStep = () => {
    if (!validateDetails()) return
    setStep('experience')
    // Defer scroll until after the new section has rendered
    setTimeout(() => {
      scrollToTop()
    }, 0)
  }

  const goToReviewStep = () => {
    if (!validateExperience()) return
    setStep('review')
    scrollToTop()
  }

  useEffect(() => {
    scrollToTop()
  }, [step])

  const handleSubmit = async () => {
    if (!validateDetails()) {
      setStep('details')
      return
    }
    if (!validateExperience()) {
      setStep('experience')
      return
    }

    const isSessionValid = await validateSession()
    if (!isSessionValid) {
      toast({
        title: 'Session expired',
        description: 'Please log in again to continue.',
        variant: 'destructive',
      })
      setTimeout(() => router.push('/login?from=/applicant/start/gov-to-gov&sessionExpired=true'), 2000)
      return
    }

    setLoading(true)
    toast({
      title: 'Submitting application...',
      description: 'Please wait while we process your submission.',
    })

    try {
      const response = await fetch('/api/applicant/gov-to-gov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: formState.firstName,
          middle_name: formState.middleName,
          last_name: formState.lastName,
          sex: formState.sex,
          date_of_birth: formState.dateOfBirth,
          height: Number(formState.height),
          weight: Number(formState.weight),
          educational_attainment: formState.educationalAttainment,
          present_address: formState.presentAddress,
          email_address: formState.emailAddress.trim(),
          contact_number: formState.contactNumber.trim(),
          passport_number: formState.passportNumber,
          passport_validity: formState.passportValidity,
          with_taiwan_work_experience: formState.withTaiwanExperience === 'yes',
          with_job_experience: formState.withOtherExperience === 'yes',
          taiwan_company: formState.taiwanCompany,
          taiwan_year_started: formState.taiwanYearStarted,
          taiwan_year_ended: formState.taiwanYearEnded,
          other_company: formState.otherCompany,
          other_year_started: formState.otherYearStarted,
          other_year_ended: formState.otherYearEnded,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        let description = data.error || 'Unable to submit your application.'
        if (response.status === 409) {
          description = 'You already submitted a Gov-to-Gov application. Please track its status instead.'
        }
        toast({
          title: 'Submission failed',
          description,
          variant: 'destructive',
        })
        return
      }

      router.push(`/applicant/status?submitted=gov-to-gov&control=${encodeURIComponent(data.data.controlNumber)}`)
    } catch (error) {
      console.error('Gov-to-Gov applicant submission error:', error)
      toast({
        title: 'Network error',
        description: 'Unable to submit your application. Please try again later.',
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

  const renderStepNav = () => (
    <div className="flex flex-col sm:flex-row text-sm font-semibold text-gray-600 border-b pb-2">
      <button
        type="button"
        className={`flex-1 text-left sm:text-center py-2 ${step === 'details' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        onClick={() => {
          setStep('details')
          scrollToTop()
        }}
      >
        1. Personal Details
      </button>
      <button
        type="button"
        className={`flex-1 text-left sm:text-center py-2 ${step === 'experience' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        onClick={() => {
          if (step === 'details' && !validateDetails()) return
          setStep('experience')
          scrollToTop()
        }}
      >
        2. IDs & Experience
      </button>
      <button
        type="button"
        className={`flex-1 text-left sm:text-center py-2 ${step === 'review' ? 'text-[#0f62fe] border-b-2 border-[#0f62fe]' : ''}`}
        onClick={() => {
          if (step !== 'review') goToReviewStep()
        }}
      >
        3. Review &amp; Submit
      </button>
    </div>
  )

  const renderDetailsStep = () => (
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={formState.lastName}
              onChange={e => updateField('lastName', e.target.value)}
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
              onValueChange={value => {
                updateRawField('sex', value)
              }}
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
            <Label htmlFor="dob">Date of Birth</Label>
            <div className="sm:hidden">
              <DateWheelPicker
                value={formState.dateOfBirth}
                onChange={date => updateRawField('dateOfBirth', date)}
                maxDate={todayIso}
                className={fieldErrors.dateOfBirth ? 'border-red-500 focus:border-red-500' : ''}
                label="Date of Birth"
                mode="dob"
              />
            </div>
            <div className="hidden sm:block">
              <Input
                id="dob"
                type="date"
                value={formState.dateOfBirth}
                onChange={e => {
                  updateRawField('dateOfBirth', e.target.value)
                }}
                className={`${fieldErrors.dateOfBirth ? 'border-red-500 focus:border-red-500' : ''} w-full`}
                max={todayIso}
              />
            </div>
            {fieldErrors.dateOfBirth && <p className="text-xs text-red-500">{fieldErrors.dateOfBirth}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formState.height}
              onChange={e => updateRawField('height', e.target.value)}
              className={fieldErrors.height ? 'border-red-500 focus:border-red-500' : ''}
              min="1"
            />
            {fieldErrors.height && <p className="text-xs text-red-500">{fieldErrors.height}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={formState.weight}
              onChange={e => updateRawField('weight', e.target.value)}
              className={fieldErrors.weight ? 'border-red-500 focus:border-red-500' : ''}
              min="1"
            />
            {fieldErrors.weight && <p className="text-xs text-red-500">{fieldErrors.weight}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-4 sm:pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Contact & Address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="education">Educational Attainment</Label>
            <Select
              value={formState.educationalAttainment}
              onValueChange={value => {
                updateRawField('educationalAttainment', value)
              }}
            >
              <SelectTrigger id="education" className={fieldErrors.educationalAttainment ? 'border-red-500 focus:border-red-500' : ''}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.educationalAttainment && <p className="text-xs text-red-500">{fieldErrors.educationalAttainment}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formState.emailAddress}
              onChange={e => updateRawField('emailAddress', e.target.value)}
              className={fieldErrors.emailAddress ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.emailAddress && <p className="text-xs text-red-500">{fieldErrors.emailAddress}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact">Phone Number</Label>
            <Input
              id="contact"
              value={formState.contactNumber}
              onChange={e => {
                const digitsOnly = (e.target.value || '').replace(/\D/g, '')
                const rest = digitsOnly.replace(/^0?9?/, '')
                let next = `09${rest}`
                if (next.length < 2) next = '09'
                next = next.slice(0, 11)
                updateRawField('contactNumber', next)
              }}
              placeholder="09XXXXXXXXX"
              className={fieldErrors.contactNumber ? 'border-red-500 focus:border-red-500' : ''}
            />
            {fieldErrors.contactNumber && <p className="text-xs text-red-500">{fieldErrors.contactNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Present Address</Label>
            <Textarea
              id="address"
              value={formState.presentAddress}
              onChange={e => updateField('presentAddress', e.target.value)}
              placeholder="HOUSE NO., STREET, CITY/PROVINCE"
              className={`min-h-[90px] ${fieldErrors.presentAddress ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {fieldErrors.presentAddress && <p className="text-xs text-red-500">{fieldErrors.presentAddress}</p>}
          </div>
        </div>
      </section>
    </>
  )

  const renderExperienceStep = () => (
    <>
      <section className="space-y-4 pt-4 sm:pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Identification</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="passportNumber">Passport Number</Label>
            <Input
              id="passportNumber"
              value={formState.passportNumber}
              onChange={e => updateField('passportNumber', e.target.value)}
              className={fieldErrors.passportNumber ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="P1234567"
            />
            {fieldErrors.passportNumber && <p className="text-xs text-red-500">{fieldErrors.passportNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passportValidity">Passport Validity</Label>
            <div className="sm:hidden">
              <DateWheelPicker
                value={formState.passportValidity}
                onChange={date => updateRawField('passportValidity', date)}
                minDate={todayIso}
                className={fieldErrors.passportValidity ? 'border-red-500 focus:border-red-500' : ''}
                label="Passport Validity"
              />
            </div>
            <div className="hidden sm:block">
              <Input
                id="passportValidity"
                type="date"
                value={formState.passportValidity}
                onChange={e => updateRawField('passportValidity', e.target.value)}
                className={fieldErrors.passportValidity ? 'border-red-500 focus:border-red-500' : ''}
                min={todayIso}
              />
            </div>
            {fieldErrors.passportValidity && <p className="text-xs text-red-500">{fieldErrors.passportValidity}</p>}
          </div>
        </div>

        {/* ID Presented and ID Number are managed by higher accounts only */}
      </section>

      <section className="space-y-4 pt-4 sm:pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
        <div className="space-y-2">
          <Label>With Taiwan Work Experience?</Label>
          <RadioGroup
            className="flex gap-6"
            value={formState.withTaiwanExperience}
            onValueChange={value => {
              updateRawField('withTaiwanExperience', value)
              if (value === 'no') {
                setFormState(prev => ({
                  ...prev,
                  taiwanCompany: '',
                  taiwanYearStarted: '',
                  taiwanYearEnded: '',
                }))
                clearError('taiwanCompany')
                clearError('taiwanYearStarted')
                clearError('taiwanYearEnded')
              }
            }}
          >
            {YES_NO.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`taiwan-${option.value}`} />
                <Label htmlFor={`taiwan-${option.value}`} className="font-normal">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {formState.withTaiwanExperience === 'yes' && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="taiwanCompany">Company</Label>
              <Input
                id="taiwanCompany"
                value={formState.taiwanCompany}
                onChange={e => updateField('taiwanCompany', e.target.value)}
                className={fieldErrors.taiwanCompany ? 'border-red-500 focus:border-red-500' : ''}
              />
              {fieldErrors.taiwanCompany && <p className="text-xs text-red-500">{fieldErrors.taiwanCompany}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taiwanYearStarted">Year Started</Label>
              <select
                id="taiwanYearStarted"
                className={`w-full border rounded px-3 py-2.5 text-sm h-10 ${fieldErrors.taiwanYearStarted ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formState.taiwanYearStarted || ''}
                onChange={e => updateRawField('taiwanYearStarted', e.target.value)}
                aria-invalid={!!fieldErrors.taiwanYearStarted}
              >
                <option value="">Year Started</option>
                {yearOptions.map(year => (
                  <option key={`taiwan-start-${year}`} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.taiwanYearStarted && <p className="text-xs text-red-500">{fieldErrors.taiwanYearStarted}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taiwanYearEnded">Year Ended</Label>
              <select
                id="taiwanYearEnded"
                className={`w-full border rounded px-3 py-2.5 text-sm h-10 ${fieldErrors.taiwanYearEnded ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formState.taiwanYearEnded || ''}
                onChange={e => updateRawField('taiwanYearEnded', e.target.value)}
                aria-invalid={!!fieldErrors.taiwanYearEnded}
              >
                <option value="">Year Ended</option>
                {yearOptions.map(year => (
                  <option key={`taiwan-end-${year}`} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.taiwanYearEnded && <p className="text-xs text-red-500">{fieldErrors.taiwanYearEnded}</p>}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>With Other Job Experience?</Label>
          <RadioGroup
            className="flex gap-6"
            value={formState.withOtherExperience}
            onValueChange={value => {
              updateRawField('withOtherExperience', value)
              if (value === 'no') {
                setFormState(prev => ({
                  ...prev,
                  otherCompany: '',
                  otherYearStarted: '',
                  otherYearEnded: '',
                }))
                clearError('otherCompany')
                clearError('otherYearStarted')
                clearError('otherYearEnded')
              }
            }}
          >
            {YES_NO.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`job-${option.value}`} />
                <Label htmlFor={`job-${option.value}`} className="font-normal">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {formState.withOtherExperience === 'yes' && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="otherCompany">Company</Label>
              <Input
                id="otherCompany"
                value={formState.otherCompany}
                onChange={e => updateField('otherCompany', e.target.value)}
                className={fieldErrors.otherCompany ? 'border-red-500 focus:border-red-500' : ''}
              />
              {fieldErrors.otherCompany && <p className="text-xs text-red-500">{fieldErrors.otherCompany}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherYearStarted">Year Started</Label>
              <select
                id="otherYearStarted"
                className={`w-full border rounded px-3 py-2.5 text-sm h-10 ${fieldErrors.otherYearStarted ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formState.otherYearStarted || ''}
                onChange={e => updateRawField('otherYearStarted', e.target.value)}
                aria-invalid={!!fieldErrors.otherYearStarted}
              >
                <option value="">Year Started</option>
                {yearOptions.map(year => (
                  <option key={`other-start-${year}`} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.otherYearStarted && <p className="text-xs text-red-500">{fieldErrors.otherYearStarted}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherYearEnded">Year Ended</Label>
              <select
                id="otherYearEnded"
                className={`w-full border rounded px-3 py-2.5 text-sm h-10 ${fieldErrors.otherYearEnded ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formState.otherYearEnded || ''}
                onChange={e => updateRawField('otherYearEnded', e.target.value)}
                aria-invalid={!!fieldErrors.otherYearEnded}
              >
                <option value="">Year Ended</option>
                {yearOptions.map(year => (
                  <option key={`other-end-${year}`} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.otherYearEnded && <p className="text-xs text-red-500">{fieldErrors.otherYearEnded}</p>}
            </div>
          </div>
        )}
      </section>
    </>
  )

  const renderReviewStep = () => (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Review your application</h2>
          <p className="text-sm text-red-600 mt-1">
            Once submitted, your application will no longer be editable through the portal. Any corrections must be processed at the Department of Migrant Workers Region IV-A Office.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryItem label="First Name" value={formState.firstName} />
          <SummaryItem label="Last Name" value={formState.lastName} />
          <SummaryItem label="Sex" value={formState.sex ? formState.sex.toUpperCase() : 'N/A'} />
          <SummaryItem label="Date of Birth" value={formState.dateOfBirth || 'N/A'} />
          <SummaryItem label="Height (cm)" value={formState.height || 'N/A'} />
          <SummaryItem label="Weight (kg)" value={formState.weight || 'N/A'} />
          <SummaryItem label="Education" value={formState.educationalAttainment || 'N/A'} />
          <SummaryItem label="Contact Number" value={formState.contactNumber || 'N/A'} />
          <SummaryItem label="Email" value={formState.emailAddress || 'N/A'} />
          <SummaryItem label="Passport Number" value={formState.passportNumber || 'N/A'} />
          <SummaryItem label="Passport Validity" value={formState.passportValidity || 'N/A'} />
        </div>
        <div className="pt-4 border-t">
          <SummaryItem
            label="Taiwan Work Experience"
            value={formState.withTaiwanExperience === 'yes'
              ? `${formState.taiwanCompany || 'N/A'} (${formState.taiwanYearStarted || '-'} - ${formState.taiwanYearEnded || '-'})`
              : 'NO'}
          />
          <SummaryItem
            label="Other Job Experience"
            value={formState.withOtherExperience === 'yes'
              ? `${formState.otherCompany || 'N/A'} (${formState.otherYearStarted || '-'} - ${formState.otherYearEnded || '-'})`
              : 'NO'}
          />
        </div>
      </div>
    </section>
  )

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-8">
      {renderStepNav()}

      <div className="transition-all duration-300 ease-out">
        {step === 'details' && renderDetailsStep()}
        {step === 'experience' && renderExperienceStep()}
        {step === 'review' && renderReviewStep()}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/applicant')}
          disabled={loading}
        >
          Cancel
        </Button>

        {step === 'details' && (
          <Button
            type="button"
            className="bg-[#0f62fe] text-white"
            onClick={goToExperienceStep}
            disabled={loading}
          >
            Continue
          </Button>
        )}

        {step === 'experience' && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('details')
                scrollToTop()
              }}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="button"
              className="bg-[#0f62fe] text-white"
              onClick={goToReviewStep}
              disabled={loading}
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
              onClick={() => {
                setStep('experience')
                scrollToTop()
              }}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="button"
              className="bg-[#0f62fe] text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

