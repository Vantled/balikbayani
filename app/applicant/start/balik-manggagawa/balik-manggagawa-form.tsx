// app/applicant/start/balik-manggagawa/balik-manggagawa-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AVAILABLE_CURRENCIES, Currency, getUSDEquivalentAsync } from '@/lib/currency-converter'
import { useToast } from '@/hooks/use-toast'

interface BalikManggagawaFormProps {
  defaultNames?: {
    first?: string
    middle?: string
    last?: string
  }
  defaultSex?: 'male' | 'female'
}

const JOB_TYPES = [
  { value: 'professional', label: 'Professional' },
  { value: 'household', label: 'Household' },
]

export default function BalikManggagawaApplicantForm({
  defaultNames,
  defaultSex = 'female',
}: BalikManggagawaFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const STORAGE_KEY = 'bb_applicant_balik_manggagawa_form_v1'
  const [loading, setLoading] = useState(false)
  const [salaryPreview, setSalaryPreview] = useState<string>('')
  const [step, setStep] = useState<'form' | 'review'>('form')

  const [formData, setFormData] = useState({
    nameOfWorker: buildDefaultName(defaultNames),
    sex: defaultSex,
    employer: '',
    destination: '',
    position: '',
    jobType: 'professional',
    salaryAmount: '',
    salaryCurrency: 'USD',
  })

  // Load saved draft on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        formData?: typeof formData
        step?: typeof step
      }
      if (parsed.formData) {
        setFormData(prev => ({ ...prev, ...parsed.formData }))
      }
      if (parsed.step === 'form' || parsed.step === 'review') {
        setStep(parsed.step)
      }
    } catch (err) {
      console.error('Failed to load BM applicant draft:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save draft whenever form data or step changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const payload = { formData, step }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.error('Failed to save BM applicant draft:', err)
    }
  }, [formData, step])

  useEffect(() => {
    const calculatePreview = async () => {
      const amount = Number(formData.salaryAmount)
      if (!amount || Number.isNaN(amount)) {
        setSalaryPreview('')
        return
      }
      try {
        const converted = await getUSDEquivalentAsync(amount, formData.salaryCurrency as Currency)
        setSalaryPreview(converted)
      } catch {
        setSalaryPreview('')
      }
    }
    calculatePreview()
  }, [formData.salaryAmount, formData.salaryCurrency])

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.nameOfWorker.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name.', variant: 'destructive' })
      return false
    }

    if (!formData.destination.trim()) {
      toast({ title: 'Destination required', description: 'Please provide your job destination.', variant: 'destructive' })
      return false
    }

    if (!formData.employer.trim()) {
      toast({ title: 'Employer required', description: 'Please enter your employer name.', variant: 'destructive' })
      return false
    }

    if (!formData.salaryAmount || Number(formData.salaryAmount) <= 0) {
      toast({ title: 'Salary required', description: 'Please provide a valid monthly salary amount.', variant: 'destructive' })
      return false
    }

    return true
  }

  const goToReview = () => {
    if (!validateForm()) {
      return
    }
    setStep('review')
  }

  const SummaryItem = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value || 'N/A'}</div>
    </div>
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (step !== 'review') {
      goToReview()
      return
    }

    if (!validateForm()) {
      setStep('form')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/applicant/balik-manggagawa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salaryAmount: Number(formData.salaryAmount),
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        toast({
          title: 'Submission failed',
          description: data.error || 'Please review your details and try again.',
          variant: 'destructive',
        })
        return
      }

      // Redirect immediately to status page with success parameter
      router.push(`/applicant/status?submitted=balik-manggagawa&control=${encodeURIComponent(data.data.controlNumber)}`)
    } catch (error) {
      console.error('Applicant BM submit error:', error)
      toast({
        title: 'Connection error',
        description: 'Unable to submit your application. Please check your internet connection.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-6" onSubmit={handleSubmit}>
      {step === 'form' && (
        <>
          <section className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Name of Worker</Label>
              <Input
                value={formData.nameOfWorker}
                onChange={(e) => updateField('nameOfWorker', e.target.value.toUpperCase())}
                placeholder="FIRST M.I LAST"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Sex</Label>
              <div className="mt-2 flex items-center gap-6 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bm-sex"
                    value="female"
                    checked={formData.sex === 'female'}
                    onChange={() => updateField('sex', 'female')}
                  />
                  Female
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bm-sex"
                    value="male"
                    checked={formData.sex === 'male'}
                    onChange={() => updateField('sex', 'male')}
                  />
                  Male
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Destination Country</Label>
              <Input
                value={formData.destination}
                onChange={(e) => updateField('destination', e.target.value.toUpperCase())}
                placeholder="E.g., SAUDI ARABIA"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Employer</Label>
              <Input
                value={formData.employer}
                onChange={(e) => updateField('employer', e.target.value.toUpperCase())}
                placeholder="Employer Name"
                className="mt-1"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <div>
                <Label className="text-sm font-medium text-gray-700">Position</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => updateField('position', e.target.value.toUpperCase())}
                  placeholder="Job Position"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Job Type</Label>
                <select
                  className="w-full border rounded-xl px-3 py-2 h-10 mt-1 text-sm"
                  value={formData.jobType}
                  onChange={(e) => updateField('jobType', e.target.value)}
                >
                  {JOB_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Monthly Salary</Label>
              <div className="grid gap-4 md:grid-cols-[2fr,1fr] mt-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salaryAmount}
                  onChange={(e) => updateField('salaryAmount', e.target.value)}
                  placeholder="Amount"
                  required
                />
                <select
                  className="w-full border rounded-xl px-3 py-2 h-10 text-sm"
                  value={formData.salaryCurrency}
                  onChange={(e) => updateField('salaryCurrency', e.target.value)}
                >
                  {AVAILABLE_CURRENCIES.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.value}
                    </option>
                  ))}
                </select>
              </div>
              {salaryPreview && (
                <p className="text-xs text-blue-600 mt-2">
                  USD Equivalent: {salaryPreview}
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {step === 'review' && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review your application</h2>
              <p className="text-sm text-red-600 mt-1">
                Your application will no longer be editable once submitted. Any corrections can only be processed at the Department of Migrant Workers Region IV-A Office.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryItem label="Name of Worker" value={formData.nameOfWorker || 'N/A'} />
              <SummaryItem label="Sex" value={formData.sex.toUpperCase()} />
              <SummaryItem label="Destination" value={formData.destination || 'N/A'} />
              <SummaryItem label="Employer" value={formData.employer || 'N/A'} />
              <SummaryItem label="Position" value={formData.position || 'N/A'} />
              <SummaryItem label="Job Type" value={formData.jobType ? formData.jobType.toUpperCase() : 'N/A'} />
              <SummaryItem
                label="Monthly Salary"
                value={`${formData.salaryCurrency || 'USD'} ${formData.salaryAmount || '0'}`}
              />
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/applicant')}
          disabled={loading}
        >
          Cancel
        </Button>
        {step === 'form' ? (
          <Button
            type="button"
            className="bg-[#0f62fe] text-white"
            disabled={loading}
            onClick={goToReview}
          >
            Review Application
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setStep('form')}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="bg-[#0f62fe] text-white"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

function buildDefaultName(defaultNames?: BalikManggagawaFormProps['defaultNames']) {
  if (!defaultNames) return ''
  const parts = [
    defaultNames.first?.trim(),
    defaultNames.middle?.trim(),
    defaultNames.last?.trim(),
  ].filter(Boolean)
  return parts.join(' ').toUpperCase()
}

