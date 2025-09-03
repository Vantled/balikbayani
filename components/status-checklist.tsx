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
          toast({ title: 'Checklist overridden', description: 'Existing checklist has been replaced.' })
        } else {
          toast({ title: 'Generation cancelled', description: 'Existing checklist was kept.' })
        }
      } else if (res.ok) {
        toast({ title: 'Checklist generated', description: 'The evaluation requirements checklist has been generated and attached.' })
      } else {
        throw new Error('Failed to generate')
      }
    } catch {
      toast({ title: 'Failed to generate', description: 'Could not generate the checklist.', variant: 'destructive' })
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
          <DialogTitle className="text-lg font-bold">Update Application Status</DialogTitle>
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
                          className={`flex items-center space-x-3 p-3 rounded-lg transition-colors border ${
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
                            className={`text-sm font-medium leading-none flex items-center gap-2 ${
                              isPreviouslyChecked && option.key !== 'evaluated' ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {option.label}
                            {option.key === 'evaluated' && !status.checked && (
                              <span className="text-xs text-gray-600">{` ${docCounts.requiredCompleted}/${docCounts.requiredTotal} required documents | ${docCounts.optionalCompleted}/${docCounts.optionalTotal} optional documents`}</span>
                            )}
                          </label>
                          <div className="ml-auto flex items-center gap-2">
                            {status.checked && status.timestamp && (
                              <span className="text-xs text-gray-500">
                                {new Date(status.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {option.key === 'evaluated' && (
                                <Button size="sm" variant="outline" disabled={!canGenerateChecklist || loading} onClick={(e) => { e.stopPropagation(); setShowGenerateConfirm(true); }}>
                                  Generate
                                </Button>
                              )}
                              {option.key === 'evaluated' && !status.checked && (
                                <Button size="sm" disabled={!canGenerateChecklist || loading} onClick={(e) => { e.stopPropagation(); setShowFinishConfirm(true); }}>
                                  Finish
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

      {/* Warning Modal */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#B91C1C] text-white px-8 py-4 flex items-center justify-between">
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
     </>
   )
 }
