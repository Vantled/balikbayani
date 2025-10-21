"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BMFilterPanelProps {
  onClose: () => void
  onApply: (query: string) => void
  // Controlled values
  clearanceType: string
  setClearanceType: (value: string) => void
  sex: string
  setSex: (value: string) => void
  status: string
  setStatus: (value: string) => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
  jobsite: string
  setJobsite: (value: string) => void
  position: string
  setPosition: (value: string) => void
  showDeletedOnly: boolean
  setShowDeletedOnly: (value: boolean) => void
  onClear: () => void
}

export default function BMFilterPanel(props: BMFilterPanelProps) {
  const {
    onClose,
    onApply,
    clearanceType,
    setClearanceType,
    sex,
    setSex,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    jobsite,
    setJobsite,
    position,
    setPosition,
    showDeletedOnly,
    setShowDeletedOnly,
    onClear
  } = props

  const handleApply = () => {
    // Build query string from current filter values
    const queryParts: string[] = []
    
    if (clearanceType) queryParts.push(`clearanceType:${clearanceType}`)
    if (sex) queryParts.push(`sex:${sex}`)
    if (status) queryParts.push(`status:${status}`)
    if (dateFrom) queryParts.push(`dateFrom:${dateFrom}`)
    if (dateTo) queryParts.push(`dateTo:${dateTo}`)
    if (jobsite) queryParts.push(`jobsite:${jobsite}`)
    if (position) queryParts.push(`position:${position}`)
    if (showDeletedOnly) queryParts.push(`showDeletedOnly:true`)
    
    const query = queryParts.join(' ')
    onApply(query)
  }

  return (
    <div className="bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3 w-[380px]">
      <div className="space-y-4">
        <div>
          <Label className="font-semibold mb-2 block">Type of Clearance</Label>
          <Select value={clearanceType || 'all'} onValueChange={setClearanceType}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical_skill">Critical Skills</SelectItem>
              <SelectItem value="for_assessment_country">For Assessment Country</SelectItem>
              <SelectItem value="non_compliant_country">Non Compliant Country</SelectItem>
              <SelectItem value="no_verified_contract">No Verified Contract</SelectItem>
              <SelectItem value="seafarer_position">Seaferer's Position</SelectItem>
              <SelectItem value="watchlisted_employer">Watchlisted Employer</SelectItem>
              <SelectItem value="watchlisted_similar_name">Watchlisted OFW</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold mb-2 block">Sex</Label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bm_sex_filter"
                value=""
                checked={sex === ''}
                onChange={() => setSex('')}
              />
              All
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bm_sex_filter"
                value="female"
                checked={sex === 'female'}
                onChange={() => setSex('female')}
              />
              Female
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bm_sex_filter"
                value="male"
                checked={sex === 'male'}
                onChange={() => setSex('male')}
              />
              Male
            </label>
          </div>
        </div>

        <div>
          <Label className="font-semibold mb-2 block">Status</Label>
          <Select value={status || 'all'} onValueChange={setStatus}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="for_clearance">For Compliance</SelectItem>
              <SelectItem value="for_approval">For Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected/Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold mb-2 block">Date Range</Label>
          <div className="flex gap-2">
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              className="flex-1"
            />
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="font-semibold mb-2 block">Destination</Label>
          <Input 
            type="text" 
            value={jobsite} 
            onChange={(e) => setJobsite(e.target.value)}
            placeholder="Enter destination"
          />
        </div>

        <div>
          <Label className="font-semibold mb-2 block">Position</Label>
          <Input 
            type="text" 
            value={position} 
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Enter position"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="bm_show_deleted_only"
            type="checkbox"
            checked={showDeletedOnly}
            onChange={(e) => setShowDeletedOnly(e.target.checked)}
          />
          <label htmlFor="bm_show_deleted_only" className="text-xs">Show deleted only</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  )
}
