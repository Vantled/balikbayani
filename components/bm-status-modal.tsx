// components/bm-status-modal.tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type BmStatus = '' | 'for_clearance' | 'for_approval' | 'finished' | 'rejected'
type BmType = '' | 'critical_skill' | 'for_assessment_country' | 'non_compliant_country' | 'no_verified_contract' | 'seafarer_position' | 'watchlisted_employer' | 'watchlisted_similar_name'

interface BMStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: { id: string; name_of_worker?: string; status?: BmStatus; clearance_type?: BmType }
  onSaved?: () => void
}

export default function BMStatusModal({ open, onOpenChange, application, onSaved }: BMStatusModalProps) {
  const [status, setStatus] = useState<BmStatus>(application?.status || '')
  const [type, setType] = useState<BmType>(application?.clearance_type || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus((application?.status as BmStatus) || '')
    setType((application?.clearance_type as BmType) || '')
  }, [application])

  const save = async () => {
    if (!application?.id) return
    setSaving(true)
    try {
      // Persist status
      const res = await fetch(`/api/balik-manggagawa/clearance/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status_update', status, clearanceType: status === 'for_clearance' ? (type || null) : null })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update status')

      // Generate when applicable
      if (status === 'for_clearance' && type) {
        const gen = await fetch(`/api/balik-manggagawa/clearance/${application.id}/generate`, { method: 'POST' })
        const gj = await gen.json()
        if (!gj.success) {
          toast({ title: 'Generation failed', description: gj.error || 'Failed to generate document', variant: 'destructive' })
        } else {
          toast({ title: 'Clearance generated', description: 'BM clearance document attached' })
        }
      }

      toast({ title: 'Saved', description: 'Status updated' })
      onOpenChange(false)
      onSaved && onSaved()
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message || 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Update Status</DialogTitle>
        <div className="bg-[#1976D2] text-white px-6 py-4">
          <h2 className="text-lg font-semibold">{application?.name_of_worker ? `${application.name_of_worker}'s BM Status` : 'Update BM Status'}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="bm_status" value="for_clearance" checked={status==='for_clearance'} onChange={()=> setStatus('for_clearance')} />
                <span>For Clearance</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="bm_status" value="for_approval" checked={status==='for_approval'} onChange={()=> setStatus('for_approval')} />
                <span>For Approval</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="bm_status" value="rejected" checked={status==='rejected'} onChange={()=> setStatus('rejected')} />
                <span>Rejected/Denied</span>
              </label>
            </div>
          </div>
          {status === 'for_clearance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clearance Type</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm h-10"
                value={type}
                onChange={(e) => setType(e.target.value as BmType)}
              >
                <option value="">Select type</option>
                <option value="critical_skill">Critical Skill</option>
                <option value="for_assessment_country">For Assessment Country</option>
                <option value="non_compliant_country">Non Compliant Country</option>
                <option value="no_verified_contract">No Verified Contract</option>
                <option value="seafarer_position">Seaferer's Position</option>
                <option value="watchlisted_employer">Watchlisted Employer</option>
                <option value="watchlisted_similar_name">Watchlisted OFW</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-[#1976D2] text-white" onClick={save} disabled={saving || (status === 'for_clearance' && !type)}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


