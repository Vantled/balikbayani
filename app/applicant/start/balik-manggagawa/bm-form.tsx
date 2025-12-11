// app/applicant/start/balik-manggagawa/bm-form.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AVAILABLE_CURRENCIES, getUSDEquivalentAsync, type Currency } from "@/lib/currency-converter"
import { Calculator } from "lucide-react"

interface BalikManggagawaApplicantFormProps {
  defaultEmail?: string
  defaultNames?: { first: string; middle: string; last: string }
  applicationId?: string
  needsCorrection?: boolean
  correctionFields?: string[]
}

const STORAGE_KEY = 'bb_applicant_bm_form_v1'

export default function BalikManggagawaApplicantForm({
  defaultEmail,
  defaultNames,
  applicationId,
  needsCorrection = false,
  correctionFields = [],
}: BalikManggagawaApplicantFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'review'>('info')
  const [formState, setFormState] = useState({
    name_of_worker: `${defaultNames?.first || ''} ${defaultNames?.middle || ''} ${defaultNames?.last || ''}`.trim(),
    sex: '',
    destination: '',
    position: '',
    job_type: '',
    employer: '',
    salary: '',
    salary_currency: 'USD',
  })
  const [initialFormState, setInitialFormState] = useState(formState)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formState, string>>>({})
  const [usdDisplay, setUsdDisplay] = useState<string>("")

  // Helper: is field editable (only flagged fields in correction mode)
  const isFieldEditable = (fieldKey: string) => {
    if (!needsCorrection) return true
    return correctionFields.includes(fieldKey)
  }

  const isFieldFlagged = (fieldKey: string) => {
    if (!needsCorrection) return false
    return correctionFields.includes(fieldKey)
  }

  const getFlaggedClass = (fieldKey: string, base: string = '') => {
    let cls = base
    if (!isFieldEditable(fieldKey)) cls += ' bg-gray-100 cursor-not-allowed'
    if (isFieldFlagged(fieldKey)) cls += ' border-red-500 border-2 bg-red-50'
    return cls.trim()
  }

  // Load application when editing
  useEffect(() => {
    const loadApplication = async () => {
      if (!applicationId) return
      try {
        const res = await fetch(`/api/applicant/balik-manggagawa/${applicationId}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!data.success || !data.data) return
        const app = data.data
        const loaded = {
          name_of_worker: app.name_of_worker || '',
          sex: app.sex || '',
          destination: app.destination || '',
          position: app.position || '',
          job_type: app.job_type || '',
          employer: app.employer || '',
          salary: app.raw_salary != null ? String(app.raw_salary) : (app.salary != null ? String(app.salary) : ''),
          salary_currency: app.salary_currency || 'USD',
        }
        setFormState(loaded)
        if (needsCorrection) setInitialFormState(loaded)
      } catch {}
    }
    void loadApplication()
  }, [applicationId, needsCorrection])

  // Persist to localStorage
  useEffect(() => {
    if (applicationId) return
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setFormState(prev => ({ ...prev, ...parsed }))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (applicationId) return
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formState))
    }
  }, [formState, applicationId])

  useEffect(() => {
    const compute = async () => {
      const raw = formState.salary
      const currency = formState.salary_currency
      if (!raw || !currency) {
        setUsdDisplay('')
        return
      }
      const val = await getUSDEquivalentAsync(parseFloat(raw), currency)
      setUsdDisplay(val ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
    }
    compute()
  }, [formState.salary, formState.salary_currency])

  const validate = () => {
    const errs: Partial<Record<keyof typeof formState, string>> = {}
    if (!formState.name_of_worker.trim()) errs.name_of_worker = 'Name is required'
    if (!formState.sex) errs.sex = 'Sex is required'
    if (!formState.destination.trim()) errs.destination = 'Destination is required'
    if (!formState.position.trim()) errs.position = 'Position is required'
    if (!formState.job_type) errs.job_type = 'Job type is required'
    if (!formState.employer.trim()) errs.employer = 'Employer is required'
    if (!formState.salary.trim() || Number(formState.salary) <= 0) errs.salary = 'Salary is required'
    if (!formState.salary_currency) errs.salary_currency = 'Currency is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (needsCorrection && applicationId) {
        // Submit corrections
        const payload: Record<string, string> = {}
        Object.entries(formState).forEach(([key, value]) => {
          if (!isFieldEditable(key)) return
          // Only send changed fields
          if ((initialFormState as any)[key] !== value) {
            payload[key] = value
          }
        })

        const res = await fetch(`/api/balik-manggagawa/clearance/${applicationId}/corrections/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit corrections')

        toast({ title: 'Corrections submitted', description: 'Your corrections have been submitted for review.' })
        router.push('/applicant/status')
        return
      }

      // New submission
      const res = await fetch('/api/applicant/balik-manggagawa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          salary: Number(formState.salary),
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit application')

      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
      toast({ title: 'Application submitted', description: 'Your application has been submitted successfully.' })
      router.push('/applicant/status')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Submission failed. Please try again.',
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

  const goToReviewStep = () => {
    if (!validate()) return
    setStep('review')
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 md:p-8 space-y-5">
      {step === 'info' && (
        <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Name of Worker</Label>
          <Input
            value={formState.name_of_worker}
            disabled={!isFieldEditable('name_of_worker')}
            onChange={(e) => setFormState(f => ({ ...f, name_of_worker: e.target.value.toUpperCase() }))}
            className={`${getFlaggedClass('name_of_worker', 'mt-1')}`}
            placeholder="Enter Name (FIRST M.I LAST)"
          />
          {fieldErrors.name_of_worker && <p className="text-xs text-red-600 mt-1">{fieldErrors.name_of_worker}</p>}
        </div>

        <div>
          <Label>Sex</Label>
          <div className="flex gap-4 mt-2">
            {['female','male'].map(sex => (
              <label key={sex} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sex"
                  value={sex}
                  disabled={!isFieldEditable('sex')}
                  checked={formState.sex === sex}
                  onChange={(e)=> setFormState(f=>({ ...f, sex: e.target.value as 'male' | 'female' }))}
                />
                <span className={`${isFieldFlagged('sex') ? 'text-red-600 font-semibold' : ''}`}>{sex.charAt(0).toUpperCase()+sex.slice(1)}</span>
              </label>
            ))}
          </div>
          {fieldErrors.sex && <p className="text-xs text-red-600 mt-1">{fieldErrors.sex}</p>}
        </div>

        <div>
          <Label>Destination</Label>
          <Input
            value={formState.destination}
            disabled={!isFieldEditable('destination')}
            onChange={(e)=> setFormState(f=>({ ...f, destination: e.target.value.toUpperCase() }))}
            className={`${getFlaggedClass('destination', 'mt-1')}`}
            placeholder="Enter Country"
          />
          {fieldErrors.destination && <p className="text-xs text-red-600 mt-1">{fieldErrors.destination}</p>}
        </div>

        <div>
          <Label>Position</Label>
          <Input
            value={formState.position}
            disabled={!isFieldEditable('position')}
            onChange={(e)=> setFormState(f=>({ ...f, position: e.target.value.toUpperCase() }))}
            className={`${getFlaggedClass('position', 'mt-1')}`}
            placeholder="Enter Position"
          />
          {fieldErrors.position && <p className="text-xs text-red-600 mt-1">{fieldErrors.position}</p>}
        </div>

        <div>
          <Label>Job Type</Label>
          <select
            value={formState.job_type}
            disabled={!isFieldEditable('job_type')}
            onChange={(e)=> setFormState(f=>({ ...f, job_type: e.target.value as 'household' | 'professional' }))}
            className={`${getFlaggedClass('job_type', 'mt-1 w-full border rounded px-3 py-2.5 h-10 text-sm')}`}
          >
            <option value="">----</option>
            <option value="professional">Professional</option>
            <option value="household">Household</option>
          </select>
          {fieldErrors.job_type && <p className="text-xs text-red-600 mt-1">{fieldErrors.job_type}</p>}
        </div>

        <div className="md:col-span-2">
          <Label>Employer</Label>
          <Input
            value={formState.employer}
            disabled={!isFieldEditable('employer')}
            onChange={(e)=> setFormState(f=>({ ...f, employer: e.target.value.toUpperCase() }))}
            className={`${getFlaggedClass('employer', 'mt-1')}`}
            placeholder="Enter Employer Name"
          />
          {fieldErrors.employer && <p className="text-xs text-red-600 mt-1">{fieldErrors.employer}</p>}
        </div>

        <div className="md:col-span-2">
          <div className="flex gap-2 mb-1">
            <div className="flex-1">
              <Label>Salary (per month)</Label>
            </div>
            <div className="w-40">
              <Label>Currency</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={formState.salary}
                disabled={!isFieldEditable('salary')}
                onChange={(e)=> setFormState(f=>({ ...f, salary: e.target.value }))}
                className={`${getFlaggedClass('salary', 'mt-1')}`}
                placeholder="Enter Salary Amount"
              />
            </div>
            <div className="w-40">
              <Select
                value={formState.salary_currency || undefined}
                onValueChange={(value) => setFormState(f => ({ ...f, salary_currency: value as Currency }))}
                disabled={!isFieldEditable('salary_currency')}
              >
                <SelectTrigger
                  className={`${getFlaggedClass('salary_currency', 'mt-1 w-full h-10 text-sm')} ${!isFieldEditable('salary_currency') ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                >
                  <SelectValue placeholder="---" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(fieldErrors.salary || fieldErrors.salary_currency) && (
            <p className="text-xs text-red-600 mt-1">
              {fieldErrors.salary || fieldErrors.salary_currency}
            </p>
          )}
          {usdDisplay && formState.salary_currency !== 'USD' && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md border border-blue-200 text-sm text-blue-800">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>USD Equivalent: {usdDisplay}</span>
            </div>
          )}
        </div>
      </div>
      )}

      {step === 'review' && (
        <div className="space-y-6">
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
                label="Name of Worker"
                value={formState.name_of_worker || 'N/A'}
              />
              <SummaryItem
                label="Sex"
                value={formState.sex ? formState.sex.toUpperCase() : 'N/A'}
              />
              <SummaryItem
                label="Destination"
                value={formState.destination || 'N/A'}
              />
              <SummaryItem
                label="Position"
                value={formState.position || 'N/A'}
              />
              <SummaryItem
                label="Job Type"
                value={formState.job_type ? formState.job_type.toUpperCase() : 'N/A'}
              />
              <SummaryItem
                label="Employer"
                value={formState.employer || 'N/A'}
              />
              <SummaryItem
                label="Monthly Salary"
                value={formState.salary_currency && formState.salary
                  ? `${formState.salary_currency} ${Number(formState.salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'N/A'}
              />
              {usdDisplay && formState.salary_currency !== 'USD' && (
                <SummaryItem
                  label="USD Equivalent"
                  value={`USD ${usdDisplay}`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {step === 'info' && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                router.push('/applicant/status')
              }}
            >
              Cancel
            </Button>
            <Button className="bg-[#1976D2] text-white" onClick={goToReviewStep}>
              Review Application
            </Button>
          </>
        )}
        {step === 'review' && (
          <>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                setStep('info')
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }, 100)
              }}
            >
              Back
            </Button>
            <Button className="bg-[#1976D2] text-white" disabled={loading} onClick={handleSubmit}>
              {loading ? 'Submitting...' : (needsCorrection ? 'Submit Corrections' : 'Submit Application')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

