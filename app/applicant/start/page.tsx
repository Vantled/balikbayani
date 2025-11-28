// app/applicant/start/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ApplicantHeader from '@/components/applicant-header'
import { useToast } from '@/hooks/use-toast'

export default function ApplicantStartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [hasDirectHire, setHasDirectHire] = useState(false)
  const [hasBalikManggagawa, setHasBalikManggagawa] = useState(false)
  const [hasGovToGov, setHasGovToGov] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkApplications = async () => {
      try {
        const response = await fetch('/api/applicant/applications', {
          credentials: 'include',
        })
        const data = await response.json()
        
        if (data.success) {
          setHasDirectHire(Boolean(data.data.hasDirectHire))
          setHasBalikManggagawa(Boolean(data.data.hasBalikManggagawa))
          setHasGovToGov(Boolean(data.data.hasGovToGov))
        } else {
          toast({
            title: 'Unable to load applications',
            description: data.error || 'Please refresh the page to try again.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Connection error',
          description: 'Failed to load your applications. Please check your internet connection and try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    checkApplications()
  }, [toast])

  return (
    <>
    <ApplicantHeader />
    <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] px-4 py-16 pt-20">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[#0f62fe] font-semibold">Start Application</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Choose a service</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
            Begin a new application for the program that matches your needs. Complete all required fields so our team can review your submission right away.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ApplicationCard
            title="Direct Hire"
            description="For applicants with a verified employer abroad. Provide your personal and job details to generate a control number and enter the evaluation queue."
            disabled={hasDirectHire}
            loading={loading}
            href="/applicant/start/direct-hire"
            trackHref="/applicant/status"
            alreadySubmittedText="You already have a Direct Hire application."
          />

          <ApplicationCard
            title="Balik Manggagawa"
            description="For returning OFWs who need a clearance update. Submit your new job information to generate a BM control number."
            disabled={hasBalikManggagawa}
            loading={loading}
            href="/applicant/start/balik-manggagawa"
            trackHref="/applicant/status"
            alreadySubmittedText="You already have a Balik Manggagawa application."
          />

          <ApplicationCard
            title="Gov-to-Gov"
            description="For applicants under the government-to-government deployment program. Submit your personal data and experience details for screening."
            disabled={hasGovToGov}
            loading={loading}
            href="/applicant/start/gov-to-gov"
            trackHref="/applicant/status"
            alreadySubmittedText="You already have a Gov-to-Gov application."
          />
        </div>
      </div>
    </section>
    </>
  )
}

function ApplicationCard({
  title,
  description,
  disabled,
  loading,
  href,
  trackHref,
  alreadySubmittedText,
}: {
  title: string
  description: string
  disabled: boolean
  loading: boolean
  href: string
  trackHref: string
  alreadySubmittedText: string
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 space-y-4 border transition-colors ${
      disabled
        ? 'opacity-60 pointer-events-none border-dashed border-gray-300'
        : 'border-transparent hover:border-[#0f62fe]/30'
    }`}>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
        <li>One submission per applicant.</li>
        <li>Track your status anytime inside the portal.</li>
      </ul>
      <div className="pt-2">
        {disabled ? (
          <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-300 text-gray-600 font-semibold cursor-not-allowed">
            Application Already Submitted
          </div>
        ) : loading ? (
          <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-200 text-gray-500 font-semibold">
            Checking availability...
          </div>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0f62fe] text-white font-semibold hover:bg-[#0c4dcc] transition-colors"
          >
            Start {title} Form
          </Link>
        )}
      </div>
      {disabled && (
        <p className="text-xs text-gray-500 mt-2 pointer-events-auto">
          {alreadySubmittedText}{' '}
          <Link href={trackHref} className="text-[#0f62fe] hover:underline pointer-events-auto">
            Track its status here
          </Link>.
        </p>
      )}
    </div>
  )
}

