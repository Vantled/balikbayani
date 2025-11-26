// app/applicant/start/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ApplicantHeader from '@/components/applicant-header'

export default function ApplicantStartPage() {
  const router = useRouter()
  const [hasDirectHire, setHasDirectHire] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkApplications = async () => {
      try {
        const response = await fetch('/api/applicant/applications', {
          credentials: 'include',
        })
        const data = await response.json()
        
        if (data.success) {
          setHasDirectHire(data.data.hasDirectHire)
        }
      } catch (error) {
        // Silently fail - allow user to see the page
      } finally {
        setLoading(false)
      }
    }

    checkApplications()
  }, [])

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

        <div className="grid gap-6 md:grid-cols-2">
          <div className={`bg-white rounded-2xl shadow-lg p-6 space-y-4 border transition-colors ${
            hasDirectHire 
              ? 'opacity-60 pointer-events-none border-dashed border-gray-300' 
              : 'border-transparent hover:border-[#0f62fe]/30'
          }`}>
            <h2 className="text-xl font-semibold text-gray-900">Direct Hire</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              For applicants with a verified employer abroad. Provide your personal and job details to generate a control number and enter the evaluation queue.
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>One submission per applicant.</li>
              <li>Completed forms go directly to staff for evaluation.</li>
            </ul>
            <div className="pt-2">
              {hasDirectHire ? (
                <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-300 text-gray-600 font-semibold cursor-not-allowed">
                  Application Already Submitted
                </div>
              ) : (
                <Link
                  href="/applicant/start/direct-hire"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0f62fe] text-white font-semibold hover:bg-[#0c4dcc] transition-colors"
                >
                  Start Direct Hire Form
                </Link>
              )}
            </div>
            {hasDirectHire && (
              <p className="text-xs text-gray-500 mt-2 pointer-events-auto">
                You already have a Direct Hire application. <Link href="/applicant/status" className="text-[#0f62fe] hover:underline pointer-events-auto">Track its status here</Link>.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 opacity-60 pointer-events-none border border-dashed border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Coming Soon</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Additional modules such as Balik Manggagawa, Gov-to-Gov, and Information Sheet will be available here soon.
            </p>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}

