// app/applicant/status/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import DocumentViewerModal from '@/components/pdf-viewer-modal'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, Eye, FileText, CheckCircle2, Clock, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

interface ApplicationData {
  application: DirectHireApplication | null
  documents: Document[]
}

export default function ApplicantStatusPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [applications, setApplications] = useState<{
    directHire: ApplicationData | null
    // Future: balikManggagawa, govToGov, informationSheet
  }>({
    directHire: null,
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
        return
      }

      const newApplications: typeof applications = {
        directHire: null,
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

      // TODO: Fetch other application types when they support applicant_user_id

      setApplications(newApplications)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load application status',
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
  }

  const renderDirectHireApplication = (appData: ApplicationData) => {
    const { application, documents } = appData
    if (!application) return null

    const status = getStatusDisplay(application)

    return (
      <AccordionItem value="direct-hire" className="border rounded-lg mb-4 bg-white">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-4">
              <div>
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

  const hasAnyApplication = applications.directHire?.application !== null

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
          <Accordion type="single" collapsible className="w-full">
            {applications.directHire?.application && renderDirectHireApplication(applications.directHire)}
            {/* TODO: Add other application types when they support applicant_user_id */}
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
