// app/applicant/status/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import DocumentViewerModal from '@/components/pdf-viewer-modal'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, Eye, FileText, CheckCircle2, Clock } from 'lucide-react'
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

interface ApplicationData<TApplication> {
  application: TApplication | null
  documents: Document[]
}

export default function ApplicantStatusPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [applications, setApplications] = useState<{
    directHire: ApplicationData<DirectHireApplication> | null
    balikManggagawa: ApplicationData<BalikManggagawaClearance> | null
    // Future: govToGov, informationSheet
  }>({
    directHire: null,
    balikManggagawa: null,
  })
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; name: string } | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      
      // Fetch application info
      const appsResponse = await fetch('/api/applicant/applications', {
        credentials: 'include',
      })
      const appsData = await appsResponse.json()
      
      if (!appsData.success) {
        setApplications({ directHire: null })
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

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold'
    
    if (status === 'Approved') {
      return `${baseClasses} bg-green-100 text-green-800`
    }
    if (status === 'Rejected') {
      return `${baseClasses} bg-red-100 text-red-800`
    }
    if (status === 'For Interview' || status === 'Received from DHAD') {
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
    toast({
      title: 'Opening document',
      description: `Loading ${doc.file_name}...`,
    })
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
                <p className="text-sm text-gray-500">Control Number: {application.control_number}</p>
              </div>
            </div>
            <span className={getStatusBadge(status)}>
              {status}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6 pt-4">
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
              <p className="text-sm text-gray-500">Control Number: {application.control_number}</p>
            </div>
            <span className={getStatusBadge(statusLabel)}>
              {statusLabel}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6 pt-4">
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
                <DetailItem label="Clearance Type" value={application.clearance_type ? formatClearanceType(application.clearance_type) : 'General BM'} />
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

  const DetailItem = ({ label, value }: { label: string; value: string | number }) => {
    const display = value === null || value === undefined || value === '' ? 'N/A' : value
    return (
      <div>
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="font-medium">{display}</div>
      </div>
    )
  }

  const formatDate = (value?: string) => {
    if (!value) return 'N/A'
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return value
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
    applications.balikManggagawa?.application !== null

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
          <Accordion type="single" collapsible className="w-full space-y-4">
            {applications.directHire?.application && renderDirectHireApplication(applications.directHire)}
            {applications.balikManggagawa?.application && renderBalikManggagawaApplication(applications.balikManggagawa)}
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
