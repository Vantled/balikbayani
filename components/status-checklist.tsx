// components/status-checklist.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Circle, CircleCheck } from "lucide-react"
import DirectHireDocumentRequirements from "./direct-hire-document-requirements"
import { Progress } from "@/components/ui/progress"

interface StatusChecklistProps {
  applicationId: string
  applicantName: string
  currentStatus: string
  statusChecklist: {
    evaluated: { checked: boolean; timestamp?: string }
    for_confirmation: { checked: boolean; timestamp?: string }
    emailed_to_dhad: { checked: boolean; timestamp?: string }
    received_from_dhad: { checked: boolean; timestamp?: string }
    for_interview: { checked: boolean; timestamp?: string }
  }
  onStatusUpdate: (newStatus: string, newChecklist: any) => void
  isOpen: boolean
  onClose: () => void
}

const STATUS_OPTIONS = [
  { key: 'evaluated', label: 'Evaluated', color: 'bg-blue-100 text-blue-800' },
  { key: 'for_confirmation', label: 'For Confirmation', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'emailed_to_dhad', label: 'Emailed to DHAD', color: 'bg-purple-100 text-purple-800' },
  { key: 'received_from_dhad', label: 'Received from DHAD', color: 'bg-green-100 text-green-800' },
  { key: 'for_interview', label: 'For Interview', color: 'bg-pink-100 text-pink-800' }
]

export default function StatusChecklist({
  applicationId,
  applicantName,
  currentStatus,
  statusChecklist,
  onStatusUpdate,
  isOpen,
  onClose
}: StatusChecklistProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [localChecklist, setLocalChecklist] = useState(statusChecklist)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showDocumentRequirements, setShowDocumentRequirements] = useState(false)
  const [pendingEvaluatedStatus, setPendingEvaluatedStatus] = useState(false)
  const [docCounts, setDocCounts] = useState({ requiredCompleted: 0, requiredTotal: 0, optionalCompleted: 0, optionalTotal: 0 })
  const [docsLoading, setDocsLoading] = useState(false)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showConfirmVerified, setShowConfirmVerified] = useState(false)
  const [showConfirmInterview, setShowConfirmInterview] = useState(false)
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false)
  const [showConfirmGenerateInterview, setShowConfirmGenerateInterview] = useState(false)
  const [verifierType, setVerifierType] = useState<'MWO' | 'PEPCG' | 'OTHERS' | ''>('')
  const [verifierOffice, setVerifierOffice] = useState('')
  const [othersText, setOthersText] = useState('')
  const [pePcgCity, setPePcgCity] = useState('')
  const [verifiedDate, setVerifiedDate] = useState('')
  const [submittingConfirm, setSubmittingConfirm] = useState(false)
  const [confirmModalMarksStatus, setConfirmModalMarksStatus] = useState(true)
  const [verificationImage, setVerificationImage] = useState<File | null>(null)
  const [pasteMessage, setPasteMessage] = useState<string>("")
  const [interviewImage, setInterviewImage] = useState<File | null>(null)
  const [pasteInterviewMessage, setPasteInterviewMessage] = useState<string>("")
  const [submittingInterview, setSubmittingInterview] = useState(false)
  const [processedWorkersPrincipal, setProcessedWorkersPrincipal] = useState<string>("")
  const [processedWorkersLas, setProcessedWorkersLas] = useState<string>("")

  useEffect(() => {
    if (!showConfirmVerified) return
    const onPaste = (e: ClipboardEvent) => {
      const items = (e.clipboardData && e.clipboardData.items) || [] as any
      for (let i = 0; i < items.length; i++) {
        const it = items[i] as DataTransferItem
        if (it && it.type && it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            setVerificationImage(new File([file], `verification-${Date.now()}.${(file.type.split('/')[1]||'png')}`, { type: file.type }))
            e.preventDefault()
            break
          }
        }
      }
    }
    window.addEventListener('paste', onPaste as any)
    return () => window.removeEventListener('paste', onPaste as any)
  }, [showConfirmVerified])

  useEffect(() => {
    if (!showConfirmInterview) return
    const onPaste = (e: ClipboardEvent) => {
      const items = (e.clipboardData && e.clipboardData.items) || [] as any
      for (let i = 0; i < items.length; i++) {
        const it = items[i] as DataTransferItem
        if (it && it.type && it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            setInterviewImage(new File([file], `for-interview-${Date.now()}.${(file.type.split('/')[1]||'png')}`, { type: file.type }))
            e.preventDefault()
            break
          }
        }
      }
    }
    window.addEventListener('paste', onPaste as any)
    return () => window.removeEventListener('paste', onPaste as any)
  }, [showConfirmInterview])

  const REQUIRED_TYPES = useMemo(() => [
    'passport',
    'work_visa',
    'employment_contract',
    'tesda_license'
  ], [])
  const OPTIONAL_TYPES = useMemo(() => [
    'country_specific',
    'compliance_form',
    'medical_certificate',
    'peos_certificate',
    'clearance',
    'insurance_coverage',
    'eregistration',
    'pdos_certificate'
  ], [])

  const computeCounts = (docs: any[]) => {
    const has = (type: string) => docs.some(d => String((d as any).document_type).toLowerCase() === type)
    const requiredCompleted = REQUIRED_TYPES.filter(has).length
    const optionalCompleted = OPTIONAL_TYPES.filter(has).length
    return {
      requiredCompleted,
      requiredTotal: REQUIRED_TYPES.length,
      optionalCompleted,
      optionalTotal: OPTIONAL_TYPES.length
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return
      try {
        setDocsLoading(true)
        const res = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
        const json = await res.json()
        if (json.success) {
          setDocCounts(computeCounts(json.data || []))
        }
      } finally {
        setDocsLoading(false)
      }
    }
    load()
  }, [isOpen, applicationId])

  const handleStatusClick = (key: string) => {
    const isPreviouslyChecked = statusChecklist[key as keyof typeof statusChecklist]?.checked
    const isCurrentlyChecked = localChecklist[key as keyof typeof localChecklist]?.checked

    // Prevent unchecking previously saved statuses
    if (isPreviouslyChecked && !isCurrentlyChecked) {
      toast({
        title: "Cannot uncheck status",
        description: "Once a status is checked, it cannot be unchecked.",
        variant: "destructive"
      })
      return
    }

    // If trying to check "Evaluated" status, check document requirements first
    if (key === 'evaluated' && !isCurrentlyChecked && !isPreviouslyChecked) {
      setPendingEvaluatedStatus(true)
      setShowDocumentRequirements(true)
      return
    }

    // If trying to check "For Interview", open modal to collect required fields and screenshot first
    if (key === 'for_interview' && !isCurrentlyChecked && !isPreviouslyChecked) {
      setShowConfirmInterview(true)
      return
    }

    // Toggle the current selection
    const newChecked = !isCurrentlyChecked

    setLocalChecklist(prev => {
      // Enforce only one newly-checked status at a time: if checking a new one,
      // uncheck other statuses that were not previously checked.
      if (newChecked && !isPreviouslyChecked) {
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          const wasPrevChecked = statusChecklist[k as keyof typeof statusChecklist]?.checked
          if (!wasPrevChecked && k !== key) {
            next[k as keyof typeof next] = { checked: false, timestamp: undefined }
          }
        })
        next[key as keyof typeof next] = { checked: true, timestamp: new Date().toISOString() }
        return next
      }

      // Allow checking a previously saved status (no change), or leaving as is
      return {
        ...prev,
        [key]: {
          checked: newChecked,
          timestamp: newChecked ? (prev[key as keyof typeof prev] as any)?.timestamp ?? new Date().toISOString() : undefined
        }
      }
    })
  }

  const handleSave = async () => {
    // Check if there are any new checked statuses
    const hasNewCheckedStatuses = Object.entries(localChecklist).some(([key, status]) => {
      const originalStatus = statusChecklist[key as keyof typeof statusChecklist]
      return status.checked && !originalStatus.checked
    })

    if (hasNewCheckedStatuses) {
      setShowWarningModal(true)
      return
    }

    await performSave()
  }

  const performSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/direct-hire/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status_checklist: localChecklist
        })
      })

      const result = await response.json()

      if (result.success) {
        onStatusUpdate(currentStatus, localChecklist)
        toast({
          title: "Status updated",
          description: "Application status checklist has been updated successfully",
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to update status')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status checklist. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentRequirementsComplete = () => {
    // Mark evaluated status as checked
    setLocalChecklist(prev => ({
      ...prev,
      evaluated: { checked: true, timestamp: new Date().toISOString() }
    }))
    
    // Uncheck other statuses that were not previously checked
    setLocalChecklist(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        const wasPrevChecked = statusChecklist[k as keyof typeof statusChecklist]?.checked
        if (!wasPrevChecked && k !== 'evaluated') {
          next[k as keyof typeof next] = { checked: false, timestamp: undefined }
        }
      })
      return next
    })
    
    setPendingEvaluatedStatus(false)
    setShowDocumentRequirements(false)
    
    toast({
      title: "Document Requirements Complete",
      description: "Evaluated status is now available. Click 'Save Changes' to confirm.",
    })
  }

  const canGenerateChecklist = docCounts.requiredCompleted === docCounts.requiredTotal

  const handleGenerateChecklist = async () => {
    if (!canGenerateChecklist) return
    setLoading(true)
    try {
      const res = await fetch(`/api/direct-hire/${applicationId}/evaluation-checklist`, { method: 'POST' })
      if (res.status === 409) {
        if (true) {
          const res2 = await fetch(`/api/direct-hire/${applicationId}/evaluation-checklist?override=true`, { method: 'POST' })
          if (!res2.ok) throw new Error('Failed to override')
          toast({ title: 'Documents overridden', description: 'Existing evaluation checklist was replaced. DMW clearance request regenerated.' })
        } else {
          toast({ title: 'Generation cancelled', description: 'Existing documents were kept.' })
        }
      } else if (res.ok) {
        toast({ title: 'Documents generated', description: 'Evaluation checklist and DMW clearance request have been attached.' })
      } else {
        throw new Error('Failed to generate')
      }
    } catch {
      toast({ title: 'Failed to generate', description: 'Could not generate the documents.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleFinishEvaluated = async () => {
    // Mark evaluated as checked (auto) and uncheck other newly checked ones
    const updatedChecklist = { ...localChecklist }
    Object.keys(updatedChecklist).forEach(k => {
      const wasPrevChecked = statusChecklist[k as keyof typeof statusChecklist]?.checked
      if (!wasPrevChecked && k !== 'evaluated') {
        updatedChecklist[k as keyof typeof updatedChecklist] = { checked: false, timestamp: undefined }
      }
    })
    updatedChecklist.evaluated = { checked: true, timestamp: new Date().toISOString() }
    
    // Update local state immediately
    setLocalChecklist(updatedChecklist)
    
    // Save to database
    setLoading(true)
    try {
      const response = await fetch(`/api/direct-hire/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status_checklist: updatedChecklist
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update parent component
        onStatusUpdate(currentStatus, updatedChecklist)
        toast({
          title: "Status updated",
          description: "Evaluated status has been marked as completed.",
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to update status')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status checklist. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStatusDisplay = () => {
    const checkedItems = Object.entries(localChecklist).filter(([_, status]) => status.checked)
    if (checkedItems.length === 0) return "No statuses checked"
    
    const lastChecked = checkedItems[checkedItems.length - 1]
    const statusOption = STATUS_OPTIONS.find(option => option.key === lastChecked[0])
    return statusOption ? statusOption.label : "Unknown status"
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
        <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold">{applicantName}'s Application Status</DialogTitle>
        </div>
        
                 <div className="px-8 py-6 space-y-5 max-h-[80vh] overflow-y-auto">
           
            <div className="space-y-3">
                    {STATUS_OPTIONS.map((option) => {
                      const status = localChecklist[option.key as keyof typeof localChecklist]
                      const isPreviouslyChecked = statusChecklist[option.key as keyof typeof statusChecklist]?.checked
                      const isCurrentlySelected = status.checked && !isPreviouslyChecked
                      
                      return (
                        <div 
                          key={option.key} 
                          className={`flex items-center w-full space-x-3 p-3 rounded-lg transition-colors border ${
                            isCurrentlySelected ? 'bg-blue-50 border-blue-300 cursor-pointer' : 
                            isPreviouslyChecked ? 'bg-gray-50 border-gray-200' : 'hover:bg-gray-50 border-gray-200 cursor-pointer'
                          }`}
                          onClick={() => !isPreviouslyChecked && handleStatusClick(option.key)}
                        >
                          {status.checked ? (
                            isPreviouslyChecked ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <CircleCheck className="h-5 w-5 text-blue-600" />
                            )
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                          <label
                            className={`text-sm font-medium leading-none flex items-center gap-2 flex-shrink-0 ${
                              isPreviouslyChecked && option.key !== 'evaluated' ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {option.key === 'for_confirmation' 
                              && Boolean((statusChecklist as any)?.for_confirmation_confirmed?.checked)
                              ? 'Confirmed'
                              : option.label}
                            {option.key === 'evaluated' && !status.checked && (
                              <span className="text-xs text-gray-600">{` ${docCounts.requiredCompleted}/${docCounts.requiredTotal} required documents | ${docCounts.optionalCompleted}/${docCounts.optionalTotal} optional documents`}</span>
                            )}
                          </label>
                          {status.checked && status.timestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(status.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {/* Right-side container for timestamp and other actions */}
                          <div className="ml-auto flex items-center gap-2 flex-1 justify-end">
                            {option.key === 'for_confirmation' 
                              && Boolean((statusChecklist as any)?.for_confirmation?.checked) 
                              && !Boolean((statusChecklist as any)?.for_confirmation_confirmed?.checked) && (
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); setConfirmModalMarksStatus(true); setShowConfirmVerified(true) }} disabled={loading}>
                                Mark as Confirmed
                              </Button>
                            )}
                            {option.key === 'for_confirmation' 
                              && Boolean((statusChecklist as any)?.for_confirmation_confirmed?.checked) && (
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowConfirmGenerate(true) }} disabled={loading}>
                                Generate
                              </Button>
                            )}
                            {option.key === 'evaluated' && canGenerateChecklist && (
                                <Button size="sm" variant="outline" disabled={loading} onClick={(e) => { e.stopPropagation(); setShowGenerateConfirm(true); }}>
                                  Generate
                                </Button>
                              )}
                              {option.key === 'evaluated' && !status.checked && (
                                <Button size="sm" disabled={!canGenerateChecklist || loading} onClick={(e) => { e.stopPropagation(); setShowFinishConfirm(true); }}>
                                  Finish
                                </Button>
                              )}
                              {option.key === 'for_interview' && status.checked && (
                                <Button size="sm" variant="outline" disabled={loading} onClick={(e) => {
                                  e.stopPropagation();
                                  const meta: any = (localChecklist as any)?.for_interview_meta || (statusChecklist as any)?.for_interview_meta
                                  if (!meta || typeof meta.processed_workers_principal !== 'number' || typeof meta.processed_workers_las !== 'number') {
                                    toast({ title: 'Missing details', description: 'Open the For Interview modal to input required fields and attach a screenshot before generating.', variant: 'destructive' })
                                    setShowConfirmInterview(true)
                                    return
                                  }
                                  setShowConfirmGenerateInterview(true)
                                }}>
                                  Generate
                                </Button>
                              )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
           
           <div className="flex justify-end space-x-2 pt-4">
             <Button variant="outline" onClick={onClose} disabled={loading}>
               Cancel
             </Button>
             <Button onClick={handleSave} disabled={loading}>
               {loading ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Saving...
                 </>
               ) : (
                 'Save Changes'
               )}
             </Button>
           </div>
                  </div>
        </DialogContent>
      </Dialog>

      {/* Generate Confirmation Modal */}
      <Dialog open={showConfirmGenerate} onOpenChange={setShowConfirmGenerate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Confirmation Document</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            This will generate the Confirmation document and attach it to the application. If a file already exists, you will be asked to override it.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmGenerate(false)}>Cancel</Button>
            <Button onClick={async ()=>{ 
              setShowConfirmGenerate(false);
              setLoading(true)
              try {
                const meta: any = (localChecklist as any)?.for_confirmation_meta || (statusChecklist as any)?.for_confirmation_meta || {}
                if (!meta.verifier_type) {
                  setConfirmModalMarksStatus(false)
                  setShowConfirmVerified(true)
                  return
                }
                const payload = {
                  verifier_type: meta.verifier_type,
                  verifier_office: meta.verifier_office || '',
                  pe_pcg_city: meta.pe_pcg_city || '',
                  others_text: meta.others_text || '',
                  verified_date: meta.verified_date || ''
                }
                let res = await fetch(`/api/direct-hire/${applicationId}/confirmation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                if (res.status === 409) {
                  res = await fetch(`/api/direct-hire/${applicationId}/confirmation?override=true`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                }
                if (!res.ok) throw new Error('Failed to generate confirmation')
                toast({ title: 'Confirmation generated', description: 'The confirmation document has been attached.' })
              } catch (err) {
                toast({ title: 'Generation failed', description: 'Could not generate the confirmation document.', variant: 'destructive' })
              } finally {
                setLoading(false)
              }
            }}>Generate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Confirm Modal */}
      <Dialog open={showConfirmVerified} onOpenChange={setShowConfirmVerified}>
        <DialogContent className="max-w-md w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Mark as Confirmed</DialogTitle>
          </div>
          <div className="px-8 py-6 space-y-3">
            <div className="text-sm text-gray-700">Provide verification details to generate the confirmation document.</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Who verified the Employment Contract?</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={verifierType}
                onChange={(e) => setVerifierType(e.target.value as any)}
              >
                <option value="">Select verifier</option>
                <option value="MWO">MWO</option>
                <option value="PEPCG">PE/PCG</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>
            {verifierType === 'MWO' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Specify MWO Office</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm uppercase"
                  placeholder="Office"
                  value={verifierOffice}
                  onChange={(e) => setVerifierOffice(e.target.value.toUpperCase())}
                />
              </div>
            )}
            {verifierType === 'PEPCG' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Specify PE/PCG</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="City/Office"
                  value={pePcgCity}
                  onChange={(e) => setPePcgCity(e.target.value)}
                />
              </div>
            )}
            {verifierType === 'OTHERS' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Specify</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Enter details"
                  value={othersText}
                  onChange={(e) => setOthersText(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Issued</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 text-sm"
                value={verifiedDate}
                onChange={(e) => setVerifiedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Verification Screenshot</label>
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-2/3 min-w-0 border rounded px-3 py-2 text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setVerificationImage(f)
                      setPasteMessage(f ? `Attached: ${f.name}` : '')
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 w-1/4 justify-center"
                    onClick={async () => {
                      try {
                        const hasApi = typeof navigator !== 'undefined' && 'clipboard' in navigator && 'read' in navigator.clipboard
                        if (!hasApi) {
                          toast({ title: 'Paste not supported', description: 'Use Choose File instead.', variant: 'destructive' })
                          return
                        }
                        const items = await (navigator.clipboard as any).read()
                        let imgFile: File | null = null
                        for (const item of items) {
                          const type = item.types?.find((t: string) => t.startsWith('image/'))
                          if (type) {
                            const blob = await item.getType(type)
                            imgFile = new File([blob], `verification-${Date.now()}.${(blob.type.split('/')[1]||'png')}`, { type: blob.type })
                            break
                          }
                        }
                        if (imgFile) {
                          setVerificationImage(imgFile)
                          setPasteMessage(`Attached: ${imgFile.name}`)
                          toast({ title: 'Image pasted', description: 'Verification screenshot attached.' })
                        } else {
                          toast({ title: 'No image found', description: 'Copy an image to clipboard then click Paste.', variant: 'destructive' })
                        }
                      } catch (err) {
                        toast({ title: 'Paste failed', description: 'Clipboard access denied or no image in clipboard.', variant: 'destructive' })
                      }
                    }}
                  >Paste</Button>
                </div>
              </div>
              {pasteMessage && (
                <p className="text-xs text-gray-700">{pasteMessage}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirmVerified(false)} disabled={submittingConfirm}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!verifierType) {
                    toast({ title: 'Missing verifier', description: 'Please select who verified the Employment Contract.', variant: 'destructive' })
                    return
                  }
                  if (verifierType === 'MWO' && !verifierOffice.trim()) {
                    toast({ title: 'Missing office', description: 'Please specify the MWO office.', variant: 'destructive' })
                    return
                  }
                  if (verifierType === 'PEPCG' && !pePcgCity.trim()) {
                    toast({ title: 'Missing city/office', description: 'Please specify the PE/PCG details.', variant: 'destructive' })
                    return
                  }
                  if (verifierType === 'OTHERS' && !othersText.trim()) {
                    toast({ title: 'Missing details', description: 'Please specify the verifier details for Others.', variant: 'destructive' })
                    return
                  }
                  // Require an image unless one is already stored in meta
                  const existingImage = (statusChecklist as any)?.for_confirmation_meta?.verification_image_url
                  if (!verificationImage && !existingImage) {
                    toast({ title: 'Verification image required', description: 'Please attach or paste a verification screenshot.', variant: 'destructive' })
                    return
                  }
                  setSubmittingConfirm(true)
                  try {
                    // If an image is selected, upload it first and capture URL
                    let uploadedImageMeta: any = {}
                    if (verificationImage) {
                      const fd = new FormData()
                      fd.append('file', verificationImage)
                      fd.append('applicationId', applicationId)
                      fd.append('applicationType', 'direct_hire')
                      fd.append('documentName', 'confirmation_verification_image')
                      const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd })
                      const upJson = await upRes.json()
                      if (upJson?.success && upJson?.data) {
                        const doc = upJson.data
                        uploadedImageMeta = {
                          verification_image_id: doc.id,
                          verification_image_name: doc.file_name,
                          verification_image_path: doc.file_path,
                          verification_image_url: `/api/documents/${doc.id}/download?format=original`
                        }
                      }
                    }
                    let res = await fetch(`/api/direct-hire/${applicationId}/confirmation`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ verifier_type: verifierType, verifier_office: verifierOffice.trim(), pe_pcg_city: pePcgCity.trim(), others_text: othersText.trim(), verified_date: verifiedDate || undefined, ...uploadedImageMeta })
                    })
                    if (res.status === 409) {
                      res = await fetch(`/api/direct-hire/${applicationId}/confirmation?override=true`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ verifier_type: verifierType, verifier_office: verifierOffice.trim(), pe_pcg_city: pePcgCity.trim(), others_text: othersText.trim(), verified_date: verifiedDate || undefined })
                      })
                    }
                    const data = await res.json()
                    if (data.success) {
                      if (confirmModalMarksStatus) {
                        // Persist the 'confirmed' step for For Confirmation
                        const nowTs = new Date().toISOString()
                        const updatedChecklist: any = {
                          ...statusChecklist,
                          for_confirmation_confirmed: { checked: true, timestamp: nowTs },
                          for_confirmation_meta: {
                            verifier_type: verifierType,
                            verifier_office: verifierOffice.trim(),
                            pe_pcg_city: pePcgCity.trim(),
                            others_text: othersText.trim(),
                            verified_date: verifiedDate || undefined,
                            ...uploadedImageMeta
                          }
                        }
                        // Reflect in local view immediately
                        setLocalChecklist((prev: any) => ({ 
                          ...prev, 
                          for_confirmation_confirmed: { checked: true, timestamp: nowTs },
                          for_confirmation_meta: {
                            verifier_type: verifierType,
                            verifier_office: verifierOffice.trim(),
                            pe_pcg_city: pePcgCity.trim(),
                            others_text: othersText.trim(),
                            verified_date: verifiedDate || undefined,
                            ...uploadedImageMeta
                          }
                        }))
                        const saveRes = await fetch(`/api/direct-hire/${applicationId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status_checklist: updatedChecklist })
                        })
                        const saveJson = await saveRes.json()
                        if (!saveJson.success) {
                          throw new Error(saveJson.error || 'Failed to save confirmation status')
                        }
                        toast({ title: 'Confirmation completed', description: 'Marked as confirmed and document attached.' })
                        onStatusUpdate(currentStatus, updatedChecklist)
                        onClose()
                      } else {
                        // Only generate document: store meta for future one-click generations
                        const updatedChecklist: any = {
                          ...statusChecklist,
                          for_confirmation_meta: {
                            verifier_type: verifierType,
                            verifier_office: verifierOffice.trim(),
                            pe_pcg_city: pePcgCity.trim(),
                            others_text: othersText.trim(),
                            verified_date: verifiedDate || undefined,
                            ...uploadedImageMeta
                          }
                        }
                        setLocalChecklist((prev: any) => ({
                          ...prev,
                          for_confirmation_meta: {
                            verifier_type: verifierType,
                            verifier_office: verifierOffice.trim(),
                            pe_pcg_city: pePcgCity.trim(),
                            others_text: othersText.trim(),
                            verified_date: verifiedDate || undefined
                          }
                        }))
                        const saveRes = await fetch(`/api/direct-hire/${applicationId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status_checklist: updatedChecklist })
                        })
                        const saveJson = await saveRes.json()
                        if (!saveJson.success) {
                          throw new Error(saveJson.error || 'Failed to save confirmation meta')
                        }
                        onStatusUpdate(currentStatus, updatedChecklist)
                        toast({ title: 'Confirmation generated', description: 'The confirmation document has been attached to the application.' })
                      }
                      setShowConfirmVerified(false)
                    } else {
                      throw new Error(data.error || 'Failed to generate confirmation')
                    }
                  } catch (err) {
                    toast({ title: 'Generation failed', description: 'Could not generate the confirmation document.', variant: 'destructive' })
                  } finally {
                    setSubmittingConfirm(false)
                  }
                }}
                disabled={submittingConfirm}
              >
                {submittingConfirm ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* For Interview Pre-Mark Modal */}
      <Dialog open={showConfirmInterview} onOpenChange={setShowConfirmInterview}>
        <DialogContent className="max-w-md w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Mark as For Interview</DialogTitle>
          </div>
          <div className="px-8 py-6 space-y-3">
            <div className="text-sm text-gray-700">Provide details and attach a screenshot before marking For Interview. These fields are required for the Issuance of OEC.</div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">No. of Processed Workers (Principal)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={processedWorkersPrincipal}
                  onChange={(e) => setProcessedWorkersPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Landbased Accreditation System</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={processedWorkersLas}
                  onChange={(e) => setProcessedWorkersLas(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Screenshot for Proof</label>
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-2/3 min-w-0 border rounded px-3 py-2 text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setInterviewImage(f)
                      setPasteInterviewMessage(f ? `Attached: ${f.name}` : '')
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 w-1/4 justify-center"
                    onClick={async () => {
                      try {
                        const hasApi = typeof navigator !== 'undefined' && 'clipboard' in navigator && 'read' in navigator.clipboard
                        if (!hasApi) {
                          toast({ title: 'Paste not supported', description: 'Use Choose File instead.', variant: 'destructive' })
                          return
                        }
                        const items = await (navigator.clipboard as any).read()
                        let imgFile: File | null = null
                        for (const item of items) {
                          const type = item.types?.find((t: string) => t.startsWith('image/'))
                          if (type) {
                            const blob = await item.getType(type)
                            imgFile = new File([blob], `for-interview-${Date.now()}.${(blob.type.split('/')[1]||'png')}`, { type: blob.type })
                            break
                          }
                        }
                        if (imgFile) {
                          setInterviewImage(imgFile)
                          setPasteInterviewMessage(`Attached: ${imgFile.name}`)
                          toast({ title: 'Image pasted', description: 'Screenshot attached.' })
                        } else {
                          toast({ title: 'No image found', description: 'Copy an image to clipboard then click Paste.', variant: 'destructive' })
                        }
                      } catch (err) {
                        toast({ title: 'Paste failed', description: 'Clipboard access denied or no image in clipboard.', variant: 'destructive' })
                      }
                    }}
                  >Paste</Button>
                </div>
              </div>
              {pasteInterviewMessage && (
                <p className="text-xs text-gray-700">{pasteInterviewMessage}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirmInterview(false)} disabled={submittingInterview}>Cancel</Button>
              <Button
                onClick={async () => {
                  // Validate fields
                  if (!processedWorkersPrincipal || Number(processedWorkersPrincipal) < 0) {
                    toast({ title: 'Missing value', description: 'Enter a valid number for Processed Workers (Principal).', variant: 'destructive' })
                    return
                  }
                  if (!processedWorkersLas || Number(processedWorkersLas) < 0) {
                    toast({ title: 'Missing value', description: 'Enter a valid number for Processed Workers (Landbased Accreditation System).', variant: 'destructive' })
                    return
                  }
                  // Require image? Spec says attach a screenshot; mirror confirmation behavior which requires unless already stored
                  const existingImage = (statusChecklist as any)?.for_interview_meta?.screenshot_url
                  if (!interviewImage && !existingImage) {
                    toast({ title: 'Screenshot required', description: 'Please attach or paste a screenshot.', variant: 'destructive' })
                    return
                  }
                  setSubmittingInterview(true)
                  try {
                    let uploadedImageMeta: any = {}
                    if (interviewImage) {
                      const fd = new FormData()
                      fd.append('file', interviewImage)
                      fd.append('applicationId', applicationId)
                      fd.append('applicationType', 'direct_hire')
                      fd.append('documentName', 'for_interview_screenshot')
                      const upRes = await fetch('/api/documents/upload', { method: 'POST', body: fd })
                      const upJson = await upRes.json()
                      if (upJson?.success && upJson?.data) {
                        const doc = upJson.data
                        uploadedImageMeta = {
                          screenshot_id: doc.id,
                          screenshot_name: doc.file_name,
                          screenshot_path: doc.file_path,
                          screenshot_url: `/api/documents/${doc.id}/download?format=original`
                        }
                      }
                    }

                    // Generate documents first
                    const genRes = await fetch(`/api/direct-hire/${applicationId}/interview-docs`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        processed_workers_principal: Number(processedWorkersPrincipal),
                        processed_workers_las: Number(processedWorkersLas)
                      })
                    })
                    if (!genRes.ok) {
                      throw new Error('Failed to generate For Interview documents')
                    }

                    // Then mark status and save meta
                    const nowTs = new Date().toISOString()
                    const updatedChecklist: any = {
                      ...statusChecklist,
                      for_interview: { checked: true, timestamp: nowTs },
                      for_interview_meta: {
                        processed_workers_principal: Number(processedWorkersPrincipal),
                        processed_workers_las: Number(processedWorkersLas),
                        ...uploadedImageMeta
                      }
                    }
                    const saveRes = await fetch(`/api/direct-hire/${applicationId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status_checklist: updatedChecklist })
                    })
                    const saveJson = await saveRes.json()
                    if (!saveJson.success) {
                      throw new Error(saveJson.error || 'Failed to save For Interview status')
                    }
                    toast({ title: 'Documents generated', description: 'OEC memorandum and attachments have been attached. Marked as For Interview.' })
                    onStatusUpdate(currentStatus, updatedChecklist)
                    setShowConfirmInterview(false)
                    onClose()
                  } catch (err) {
                    toast({ title: 'Failed to generate', description: 'Could not generate For Interview documents.', variant: 'destructive' })
                  } finally {
                    setSubmittingInterview(false)
                  }
                }}
                disabled={submittingInterview}
              >
                {submittingInterview ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Modal */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Confirm Status Changes</DialogTitle>
          </div>
          
          <div className="px-8 py-6 space-y-4">
            <div className="text-sm text-gray-700">
              Are you sure you want to proceed? Once a status is checked, <strong>it cannot be unchecked.</strong>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowWarningModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={performSave} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm & Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Requirements Modal */}
      {showDocumentRequirements && (
        <DirectHireDocumentRequirements
          applicationId={applicationId}
          currentStatus={currentStatus}
          isOpen={showDocumentRequirements}
          onClose={() => {
            setShowDocumentRequirements(false)
            setPendingEvaluatedStatus(false)
          }}
          onStatusUpdate={(newStatus) => {
            if (newStatus === 'evaluated') {
              handleDocumentRequirementsComplete()
            }
          }}
        />
      )}

      {/* Generate Confirmation Modal */}
      <Dialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Evaluation Checklist</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            This will generate the Evaluation Requirements Checklist and attach it to the application. If a file already exists, you will be asked to override it.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowGenerateConfirm(false)}>Cancel</Button>
            <Button onClick={async ()=>{ setShowGenerateConfirm(false); await handleGenerateChecklist(); }}>Generate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Confirmation Modal */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finish Evaluated Status</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            This will mark Evaluated as completed for this application. Proceed?
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>Cancel</Button>
            <Button onClick={async ()=>{ setShowFinishConfirm(false); await handleFinishEvaluated(); }}>Finish</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate For Interview Documents Confirmation Modal */}
      <Dialog open={showConfirmGenerateInterview} onOpenChange={setShowConfirmGenerateInterview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate For Interview Documents</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            This will generate the For Interview documents and attach them to the application. If files already exist, they will be replaced.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmGenerateInterview(false)}>Cancel</Button>
            <Button onClick={async () => {
              setShowConfirmGenerateInterview(false);
              setLoading(true);
              try {
                const meta: any = (localChecklist as any)?.for_interview_meta || (statusChecklist as any)?.for_interview_meta;
                const res = await fetch(`/api/direct-hire/${applicationId}/interview-docs`, { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ 
                    processed_workers_principal: meta.processed_workers_principal, 
                    processed_workers_las: meta.processed_workers_las 
                  }) 
                });
                if (res.status === 409) {
                  const res2 = await fetch(`/api/direct-hire/${applicationId}/interview-docs?override=true`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                      processed_workers_principal: meta.processed_workers_principal, 
                      processed_workers_las: meta.processed_workers_las 
                    }) 
                  });
                  if (!res2.ok) throw new Error('Failed to override');
                  toast({ title: 'Documents overridden', description: 'Existing For Interview documents were replaced.' });
                } else if (res.ok) {
                  toast({ title: 'Documents generated', description: 'For Interview documents have been attached.' });
                } else {
                  throw new Error('Failed to generate');
                }
              } catch (err) {
                toast({ title: 'Failed to generate', description: 'Could not generate For Interview documents.', variant: 'destructive' });
              } finally {
                setLoading(false);
              }
            }}>Generate</Button>
          </div>
        </DialogContent>
      </Dialog>
     </>
   )
 }
