// app/applicant/status/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import DocumentViewerModal from '@/components/pdf-viewer-modal'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, Eye, FileText, CheckCircle2, Clock, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { BalikManggagawaClearance } from '@/lib/types'

interface DirectHireApplication {
  id: string
  control_number: string
  name: string
  email?: string
  cellphone?: string
  sex: 'male' | 'female'
  salary: number
  salary_currency?: string
  raw_salary?: number
  status: string
  jobsite: string
  position: string
  job_type: 'household' | 'professional'
  employer: string
  needs_correction?: boolean
  correction_fields?: string[] | null
  correction_note?: string | null
  status_checklist: {
    evaluated: { checked: boolean; timestamp?: string }
    for_confirmation: { checked: boolean; timestamp?: string }
    emailed_to_dhad: { checked: boolean; timestamp?: string }
    received_from_dhad: { checked: boolean; timestamp?: string }
    for_interview: { checked: boolean; timestamp?: string }
  }
  created_at: string
  updated_at: string
}

interface Document {
  id: string
  document_type: string
  file_name: string
  file_path: string
  mime_type: string
  meta?: any
}

interface GovToGovRecord {
  id: string
  control_number?: string | null
  last_name: string
  first_name: string
  middle_name?: string | null
  sex: 'male' | 'female'
  date_of_birth: string
  age?: number | null
  height?: number | null
  weight?: number | null
  educational_attainment: string
  present_address: string
  email_address?: string | null
  contact_number?: string | null
  passport_number: string
  passport_validity: string
  id_presented: string
  id_number: string
  with_taiwan_work_experience: boolean
  taiwan_company?: string | null
  taiwan_year_started?: number | null
  taiwan_year_ended?: number | null
  with_job_experience: boolean
  other_company?: string | null
  other_year_started?: number | null
  other_year_ended?: number | null
  remarks?: string | null
  date_received_by_region?: string | null
  date_card_released?: string | null
  time_received?: string | null
  time_released?: string | null
  needs_correction?: boolean
  correction_fields?: string[] | null
  correction_note?: string | null
  created_at: string
  updated_at: string
}
interface ApplicationData<TApplication> {
  application: TApplication | null
  documents: Document[]
}

export default function ApplicantStatusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [applications, setApplications] = useState<{
    directHire: ApplicationData<DirectHireApplication> | null
    balikManggagawa: ApplicationData<BalikManggagawaClearance> | null
    govToGov: ApplicationData<GovToGovRecord> | null
  }>({
    directHire: null,
    balikManggagawa: null,
    govToGov: null,
  })
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; name: string } | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [directHireCorrections, setDirectHireCorrections] = useState<{ field_key: string; message: string }[]>([])
  const [directHireCorrectionsLoading, setDirectHireCorrectionsLoading] = useState(false)
  const [bmCorrections, setBmCorrections] = useState<{ field_key: string; message: string }[]>([])
  const [bmCorrectionsLoading, setBmCorrectionsLoading] = useState(false)
  const [govToGovCorrections, setGovToGovCorrections] = useState<{ field_key: string; message: string }[]>([])
  const [govToGovCorrectionsLoading, setGovToGovCorrectionsLoading] = useState(false)
  const [accordionValue, setAccordionValue] = useState<string>('')

  useEffect(() => {
    fetchApplications()
  }, [])

  // Open specific accordion when coming from notification
  useEffect(() => {
    const openApp = searchParams.get('open')
    if (openApp) {
      // Wait for applications to load, then open the accordion
      if (!loading) {
        if (openApp === 'direct-hire' && applications.directHire?.application) {
          setAccordionValue('direct-hire')
          // Clean up URL
          router.replace('/applicant/status', { scroll: false })
        } else if (openApp === 'balik-manggagawa' && applications.balikManggagawa?.application) {
          setAccordionValue('balik-manggagawa')
          router.replace('/applicant/status', { scroll: false })
        } else if (openApp === 'gov-to-gov' && applications.govToGov?.application) {
          setAccordionValue('gov-to-gov')
          router.replace('/applicant/status', { scroll: false })
        }
      }
    }
  }, [searchParams, loading, applications, router])

  const fetchDirectHireCorrections = async (applicationId: string) => {
    try {
      setDirectHireCorrectionsLoading(true)
      const res = await fetch(`/api/direct-hire/${applicationId}/corrections`)
      const data = await res.json()
      if (data.success) {
        setDirectHireCorrections(data.data || [])
      } else {
        setDirectHireCorrections([])
      }
    } catch {
      setDirectHireCorrections([])
    } finally {
      setDirectHireCorrectionsLoading(false)
    }
  }

  const fetchBmCorrections = async (clearanceId: string) => {
    try {
      setBmCorrectionsLoading(true)
      const res = await fetch(`/api/balik-manggagawa/clearance/${clearanceId}/corrections`)
      const data = await res.json()
      if (data.success) {
        setBmCorrections(data.data || [])
      } else {
        setBmCorrections([])
      }
    } catch {
      setBmCorrections([])
    } finally {
      setBmCorrectionsLoading(false)
    }
  }

  const fetchGovToGovCorrections = async (applicationId: string) => {
    try {
      setGovToGovCorrectionsLoading(true)
      const res = await fetch(`/api/gov-to-gov/${applicationId}/corrections`)
      const data = await res.json()
      if (data.success) {
        setGovToGovCorrections(data.data || [])
      } else {
        setGovToGovCorrections([])
      }
    } catch {
      setGovToGovCorrections([])
    } finally {
      setGovToGovCorrectionsLoading(false)
    }
  }

  // Show success toast if redirected from successful submission
  useEffect(() => {
    const submitted = searchParams.get('submitted')
    const controlNumber = searchParams.get('control')
    
    if (submitted === 'direct-hire' && controlNumber) {
      toast({
        title: 'Application submitted successfully!',
        description: `Your Direct Hire application has been submitted. Control number: ${controlNumber}.`,
      })
      // Clean up URL by removing query parameters
      router.replace('/applicant/status', { scroll: false })
    } else if (submitted === 'balik-manggagawa' && controlNumber) {
      toast({
        title: 'Application submitted successfully!',
        description: `Your Balik Manggagawa application has been submitted. Control number: ${controlNumber}.`,
      })
      // Clean up URL by removing query parameters
      router.replace('/applicant/status', { scroll: false })
    } else if (submitted === 'gov-to-gov' && controlNumber) {
      toast({
        title: 'Application submitted successfully!',
        description: `Your Gov-to-Gov application has been submitted. Control number: ${controlNumber}.`,
      })
      router.replace('/applicant/status', { scroll: false })
    }
  }, [searchParams, toast, router])

  useEffect(() => {
    const app = applications.directHire?.application
    if (app && app.needs_correction) {
      void fetchDirectHireCorrections(app.id)
    } else {
      setDirectHireCorrections([])
    }
  }, [applications.directHire?.application?.id, applications.directHire?.application?.needs_correction])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      
      // Fetch application info
      const appsResponse = await fetch('/api/applicant/applications', {
        credentials: 'include',
      })
      const appsData = await appsResponse.json()
      
      if (!appsData.success) {
        setApplications({ directHire: null, balikManggagawa: null, govToGov: null })
        if (appsData.error) {
          toast({
            title: 'Unable to load applications',
            description: appsData.error || 'Please refresh the page to try again.',
            variant: 'destructive',
          })
        }
        return
      }

      const newApplications: typeof applications = {
        directHire: null,
        balikManggagawa: null,
        govToGov: null,
      }

      // Fetch Direct Hire application if exists
      if (appsData.data.hasDirectHire && appsData.data.directHire) {
        const appResponse = await fetch(`/api/applicant/direct-hire/${appsData.data.directHire.id}`, {
          credentials: 'include',
        })
        const appData = await appResponse.json()
        
        if (appData.success && appData.data) {
          // Fetch documents
          const docsResponse = await fetch(
            `/api/documents?applicationId=${appsData.data.directHire.id}&applicationType=direct_hire`,
            { credentials: 'include' }
          )
          const docsData = await docsResponse.json()
          
          newApplications.directHire = {
            application: appData.data,
            documents: docsData.success ? (docsData.data || []) : [],
          }
        }
      }

      // Fetch Balik Manggagawa application when available
      if (appsData.data.hasBalikManggagawa && appsData.data.balikManggagawa) {
        const bmResponse = await fetch(`/api/applicant/balik-manggagawa/${appsData.data.balikManggagawa.id}`, {
          credentials: 'include',
        })
        const bmData = await bmResponse.json()

        if (bmData.success && bmData.data) {
          const docsResponse = await fetch(
            `/api/documents?applicationId=${appsData.data.balikManggagawa.id}&applicationType=balik_manggagawa`,
            { credentials: 'include' }
          )
          const docsData = await docsResponse.json()

          newApplications.balikManggagawa = {
            application: bmData.data,
            documents: docsData.success ? (docsData.data || []) : [],
          }
          if (bmData.data.needs_correction) {
            void fetchBmCorrections(bmData.data.id)
          } else {
            setBmCorrections([])
          }
        }
      }

      if (appsData.data.hasGovToGov && appsData.data.govToGov) {
        const govResponse = await fetch(`/api/applicant/gov-to-gov/${appsData.data.govToGov.id}`, {
          credentials: 'include',
        })
        const govData = await govResponse.json()

        if (govData.success && govData.data) {
          const docsResponse = await fetch(
            `/api/documents?applicationId=${appsData.data.govToGov.id}&applicationType=gov_to_gov`,
            { credentials: 'include' }
          )
          const docsData = await docsResponse.json()

          newApplications.govToGov = {
            application: govData.data,
            documents: docsData.success ? (docsData.data || []) : [],
          }
          if (govData.data.needs_correction) {
            void fetchGovToGovCorrections(govData.data.id)
          } else {
            setGovToGovCorrections([])
          }
        }
      }

      setApplications(newApplications)
      
      // Only show success toast if applications were found
      if (newApplications.directHire?.application) {
        // Silent success - status is already displayed on the page
      }
    } catch (error) {
      toast({
        title: 'Failed to load applications',
        description: 'Unable to fetch your application status. Please refresh the page or try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (application: DirectHireApplication) => {
    const checklist = application.status_checklist
    if (checklist.for_interview?.checked) return 'For Interview'
    if (checklist.received_from_dhad?.checked) return 'Received from DHAD'
    if (checklist.emailed_to_dhad?.checked) return 'Emailed to DHAD'
    if (checklist.for_confirmation?.checked) return 'For Confirmation'
    if (checklist.evaluated?.checked) return 'Evaluated'
    if (application.status === 'approved') return 'Approved'
    if (application.status === 'rejected') return 'Rejected'
    return 'Pending'
  }

  const formatBmStatus = (status?: string) => {
    const normalized = (status || '').toLowerCase()
    switch (normalized) {
      case 'for_approval':
      case 'pending':
        return 'For Approval'
      case 'for_review':
        return 'For Review'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Pending'
    }
  }

  const getGovToGovStatus = (application: GovToGovRecord) => {
    if (application.date_card_released) return 'Card Released'
    if (application.date_received_by_region) return 'Received by Region'
    return 'Processing'
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold'
    
    if (status === 'Approved') {
      return `${baseClasses} bg-green-100 text-green-800`
    }
    if (status === 'Card Released') {
      return `${baseClasses} bg-green-100 text-green-800`
    }
    if (status === 'Rejected') {
      return `${baseClasses} bg-red-100 text-red-800`
    }
    if (status === 'For Interview' || status === 'Received from DHAD') {
      return `${baseClasses} bg-blue-100 text-blue-800`
    }
    if (status === 'Received by Region') {
      return `${baseClasses} bg-blue-100 text-blue-800`
    }
    if (status === 'Evaluated' || status === 'For Confirmation' || status === 'Emailed to DHAD') {
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    }
    return `${baseClasses} bg-gray-100 text-gray-800`
  }

  const formatDocumentType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument({
      id: doc.id,
      name: doc.file_name,
    })
    setPdfViewerOpen(true)
  }

  const renderDirectHireApplication = (appData: ApplicationData<DirectHireApplication>) => {
    const { application, documents } = appData
    if (!application) return null

    const status = getStatusDisplay(application)

    return (
      <AccordionItem value="direct-hire" className="border rounded-lg mb-4 bg-white">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Direct Hire</h3>
                <p 
                  className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors inline-flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(application.control_number)
                    toast({
                      title: 'Copied!',
                      description: 'Control number copied to clipboard',
                    })
                  }}
                  title="Click to copy control number"
                >
                  Control Number: <span className="font-mono">{application.control_number}</span>
                  <Copy className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
            <span className={getStatusBadge(status)}>
              {status}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6 pt-4">
            {application.needs_correction && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-800">Action required</div>
                    <div className="text-xs text-amber-700">Some fields need correction before processing continues.</div>
                  </div>
                </div>
                {directHireCorrectionsLoading ? (
                  <div className="text-sm text-amber-800">Loading corrections...</div>
                ) : directHireCorrections.length === 0 ? (
                  <div className="text-sm text-amber-800">Corrections will appear here once available.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {directHireCorrections.map((c, idx) => {
                      // Convert technical field key to user-friendly label
                      const getFieldLabel = (fieldKey: string): string => {
                        const fieldLabelMap: Record<string, string> = {
                          name: 'Name',
                          email: 'Email',
                          cellphone: 'Phone Number',
                          sex: 'Sex',
                          jobsite: 'Job Site',
                          position: 'Position',
                          job_type: 'Job Type',
                          employer: 'Employer',
                          salary: 'Salary',
                          raw_salary: 'Salary',
                          salary_currency: 'Salary Currency',
                          evaluator: 'Evaluator',
                          passport_number: 'Passport Number',
                          passport_validity: 'Passport Validity',
                          visa_category: 'Visa Category',
                          visa_type: 'Visa Type',
                          visa_number: 'Visa Number',
                          visa_validity: 'Visa Validity',
                          ec_issued_date: 'Employment Contract Issued Date',
                          ec_verification: 'Employment Contract Verification Type',
                        }
                        
                        if (fieldKey.startsWith('document_')) {
                          const docType = fieldKey.replace('document_', '')
                          return docType
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                        }
                        
                        return fieldLabelMap[fieldKey] || fieldKey
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')
                      }
                      
                      return (
                        <li key={idx} className="rounded-md bg-white border p-2">
                          <div className="font-semibold text-gray-900">{getFieldLabel(c.field_key)}</div>
                          <div className="text-gray-700">{c.message}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      router.push(`/applicant/start/direct-hire?edit=${application.id}&corrections=true`)
                    }}
                  >
                    Open Application Form to Make Corrections
                  </Button>
                </div>
              </div>
            )}
            {/* Application Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Application Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Name</div>
                  <div className="font-medium">{application.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="font-medium">{application.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Phone Number</div>
                  <div className="font-medium">{application.cellphone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Sex</div>
                  <div className="font-medium capitalize">{application.sex}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Jobsite</div>
                  <div className="font-medium">{application.jobsite}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Position</div>
                  <div className="font-medium">{application.position}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Job Type</div>
                  <div className="font-medium capitalize">{application.job_type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Employer</div>
                  <div className="font-medium">{application.employer}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Monthly Salary</div>
                  <div className="font-medium">
                    {application.salary_currency || 'USD'} {Number(application.raw_salary || application.salary).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Submitted</div>
                  <div className="font-medium">
                    {new Date(application.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Checklist */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Checklist</h4>
              <div className="space-y-3">
                {[
                  { key: 'evaluated', label: 'Evaluated' },
                  { key: 'for_confirmation', label: 'For Confirmation' },
                  { key: 'emailed_to_dhad', label: 'Emailed to DHAD' },
                  { key: 'received_from_dhad', label: 'Received from DHAD' },
                  { key: 'for_interview', label: 'For Interview' },
                ].map(({ key, label }) => {
                  const item = application.status_checklist[key as keyof typeof application.status_checklist]
                  const isChecked = item?.checked || false
                  const timestamp = item?.timestamp
                  
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      {isChecked ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                          {label}
                        </div>
                        {timestamp && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(timestamp).toLocaleString('en-US')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{formatDocumentType(doc.document_type)}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }

  const renderBalikManggagawaApplication = (appData: ApplicationData<BalikManggagawaClearance>) => {
    const { application, documents } = appData
    if (!application) return null

    const statusLabel = formatBmStatus(application.status)

    return (
      <AccordionItem value="balik-manggagawa" className="border rounded-lg mb-4 bg-white">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-semibold text-gray-900">Balik Manggagawa</h3>
              <p 
                className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors inline-flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(application.control_number)
                  toast({
                    title: 'Copied!',
                    description: 'Control number copied to clipboard',
                  })
                }}
                title="Click to copy control number"
              >
                Control Number: <span className="font-mono">{application.control_number}</span>
                <Copy className="h-3.5 w-3.5" />
              </p>
            </div>
            <span className={getStatusBadge(statusLabel)}>
              {statusLabel}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6 pt-4">
            {application.needs_correction && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-800">Action required</div>
                    <div className="text-xs text-amber-700">Some fields need correction before processing continues.</div>
                  </div>
                </div>
                {bmCorrectionsLoading ? (
                  <div className="text-sm text-amber-800">Loading corrections...</div>
                ) : bmCorrections.length === 0 ? (
                  <div className="text-sm text-amber-800">Corrections will appear here once available.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {bmCorrections.map((c, idx) => {
                      // Convert technical field key to user-friendly label
                      const getFieldLabel = (fieldKey: string): string => {
                        const fieldLabelMap: Record<string, string> = {
                          name_of_worker: 'Name of Worker',
                          sex: 'Sex',
                          destination: 'Destination',
                          position: 'Position',
                          job_type: 'Job Type',
                          employer: 'Employer',
                          salary: 'Salary',
                          raw_salary: 'Salary',
                          salary_currency: 'Salary Currency',
                        }
                        return fieldLabelMap[fieldKey] || fieldKey
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')
                      }
                      
                      return (
                        <li key={idx} className="rounded-md bg-white border p-2">
                          <div className="font-semibold text-gray-900">{getFieldLabel(c.field_key)}</div>
                          <div className="text-gray-700">{c.message}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      router.push(`/applicant/start/balik-manggagawa?edit=${application.id}&corrections=true`)
                    }}
                  >
                    Open Application Form to Make Corrections
                  </Button>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Application Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Name" value={application.name_of_worker} />
                <DetailItem label="Sex" value={application.sex.toUpperCase()} />
                <DetailItem label="Destination" value={application.destination} />
                <DetailItem label="Employer" value={application.employer} />
                <DetailItem label="Position" value={application.position || 'N/A'} />
                <DetailItem label="Job Type" value={application.job_type ? application.job_type.toUpperCase() : 'N/A'} />
                <DetailItem
                  label="Monthly Salary"
                  value={`${application.salary_currency || 'USD'} ${Number(application.raw_salary || application.salary).toLocaleString()}`}
                />
                <DetailItem label="Submitted" value={formatDate(application.created_at)} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Status</h4>
              <p className="text-sm text-gray-600">
                Your Balik Manggagawa clearance is currently <span className="font-semibold text-gray-900">{statusLabel}</span>.{' '}
                We will notify you if additional requirements are needed.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents uploaded for this application.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{formatDocumentType(doc.document_type)}</div>
                          <div className="text-xs text-gray-500">{doc.file_name}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }

  const renderGovToGovApplication = (appData: ApplicationData<GovToGovRecord>) => {
    const { application, documents } = appData
    if (!application) return null

    const status = getGovToGovStatus(application)
    const reference = application.control_number || application.id
    const fullName = [
      application.first_name,
      application.middle_name,
      application.last_name,
    ].filter(Boolean).join(' ')

    const formatExperience = (
      label: string,
      active: boolean,
      company?: string | null,
      start?: number | null,
      end?: number | null
    ) => (
      <div>
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="font-medium">
          {active
            ? `${company || 'N/A'} (${start || '—'} - ${end || '—'})`
            : 'No'}
        </div>
      </div>
    )

    return (
      <AccordionItem value="gov-to-gov" className="border rounded-lg mb-4 bg-white">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Gov-to-Gov</h3>
            </div>
            <span className={getStatusBadge(status)}>
              {status}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6 pt-4">
            {application.needs_correction && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-800">Action required</div>
                    <div className="text-xs text-amber-700">Some fields need correction before processing continues.</div>
                  </div>
                </div>
                {govToGovCorrectionsLoading ? (
                  <div className="text-sm text-amber-800">Loading corrections...</div>
                ) : govToGovCorrections.length === 0 ? (
                  <div className="text-sm text-amber-800">Corrections will appear here once available.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {govToGovCorrections.map((c, idx) => {
                      const getFieldLabel = (fieldKey: string): string => {
                        const fieldLabelMap: Record<string, string> = {
                          last_name: 'Last Name',
                          first_name: 'First Name',
                          middle_name: 'Middle Name',
                          sex: 'Sex',
                          date_of_birth: 'Date of Birth',
                          age: 'Age',
                          height: 'Height',
                          weight: 'Weight',
                          educational_attainment: 'Educational Attainment',
                          present_address: 'Present Address',
                          email_address: 'Email Address',
                          contact_number: 'Contact Number',
                          passport_number: 'Passport Number',
                          passport_validity: 'Passport Validity',
                          id_presented: 'ID Presented',
                          id_number: 'ID Number',
                          with_taiwan_work_experience: 'Taiwan Work Experience',
                          taiwan_company: 'Taiwan Company',
                          taiwan_year_started: 'Taiwan Year Started',
                          taiwan_year_ended: 'Taiwan Year Ended',
                          with_job_experience: 'Job Experience',
                          other_company: 'Other Company',
                          other_year_started: 'Other Year Started',
                          other_year_ended: 'Other Year Ended',
                        }
                        return fieldLabelMap[fieldKey] || fieldKey
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')
                      }
                      return (
                        <li key={idx} className="rounded-md bg-white border p-2">
                          <div className="font-semibold text-gray-900">{getFieldLabel(c.field_key)}</div>
                          <div className="text-gray-700">{c.message}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      router.push(`/applicant/start/gov-to-gov?edit=${application.id}&corrections=true`)
                    }}
                  >
                    Open Application Form to Make Corrections
                  </Button>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Name" value={fullName || 'N/A'} />
                <DetailItem label="Sex" value={application.sex.toUpperCase()} />
                <DetailItem label="Date of Birth" value={formatDate(application.date_of_birth)} />
                <DetailItem label="Height (cm)" value={application.height ?? 'N/A'} />
                <DetailItem label="Weight (kg)" value={application.weight ?? 'N/A'} />
                <DetailItem label="Educational Attainment" value={application.educational_attainment || 'N/A'} />
                <DetailItem label="Email" value={application.email_address || 'N/A'} />
                <DetailItem label="Contact Number" value={application.contact_number || 'N/A'} />
                <DetailItem label="Present Address" value={application.present_address || 'N/A'} />
                <DetailItem label="Submitted" value={formatDate(application.created_at)} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Identification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Passport Number" value={application.passport_number || 'N/A'} />
                <DetailItem label="Passport Validity" value={formatDate(application.passport_validity)} />
                <DetailItem label="ID Presented" value={application.id_presented || 'N/A'} />
                <DetailItem label="ID Number" value={application.id_number || 'N/A'} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Experience</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formatExperience(
                  'Taiwan Work Experience',
                  application.with_taiwan_work_experience,
                  application.taiwan_company,
                  application.taiwan_year_started,
                  application.taiwan_year_ended
                )}
                {formatExperience(
                  'Other Job Experience',
                  application.with_job_experience,
                  application.other_company,
                  application.other_year_started,
                  application.other_year_ended
                )}
                <DetailItem label="Remarks" value={application.remarks || 'N/A'} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DetailItem label="Submitted" value={formatDate(application.created_at)} />
                <DetailItem label="Received by Region" value={formatDate(application.date_received_by_region)} />
                <DetailItem label="Card Released" value={formatDate(application.date_card_released)} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{formatDocumentType(doc.document_type)}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }

  const DetailItem = ({ label, value }: { label: string; value: string | number }) => {
    const display = value === null || value === undefined || value === '' ? 'N/A' : value
    return (
      <div>
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="font-medium">{display}</div>
      </div>
    )
  }

  const formatDate = (value?: string | Date | null) => {
    if (!value) return 'N/A'
    try {
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) {
        return typeof value === 'string' ? value : 'N/A'
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return typeof value === 'string' ? value : 'N/A'
    }
  }

  const formatClearanceType = (value?: string) => {
    if (!value) return 'General BM'
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const hasAnyApplication =
    applications.directHire?.application !== null ||
    applications.balikManggagawa?.application !== null ||
    applications.govToGov?.application !== null

  if (loading) {
    return (
      <>
        <ApplicantHeader />
        <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] flex items-center justify-center px-4 py-16 pt-20">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading application status...</span>
          </div>
        </section>
      </>
    )
  }

  if (!hasAnyApplication) {
    return (
      <>
        <ApplicantHeader />
        <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] flex items-center justify-center px-4 py-16 pt-20">
          <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Track Status</p>
            <h1 className="text-3xl font-bold text-gray-900">No Applications Found</h1>
            <p className="text-gray-600 text-base">
              You haven&apos;t submitted any applications yet. <a href="/applicant/start" className="text-[#0f62fe] hover:underline">Start an application</a> to track its status here.
            </p>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <ApplicantHeader />
      <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] px-4 py-8 pt-20">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900">Application Status</h1>
            <p className="text-gray-600 mt-1">Track the status of all your submitted applications</p>
          </div>

          {/* Applications Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-4" value={accordionValue} onValueChange={setAccordionValue}>
            {applications.directHire?.application && renderDirectHireApplication(applications.directHire)}
            {applications.balikManggagawa?.application && renderBalikManggagawaApplication(applications.balikManggagawa)}
            {applications.govToGov?.application && renderGovToGovApplication(applications.govToGov)}
          </Accordion>
        </div>
      </section>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false)
            setSelectedDocument(null)
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
        />
      )}
    </>
  )
}
