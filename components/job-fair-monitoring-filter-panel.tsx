// components/job-fair-monitoring-filter-panel.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"

interface JobFairMonitoringFilterPanelProps {
  onClose: () => void
  onApply: (query: string) => void
  // Controlled values
  venue: string
  setVenue: (value: string) => void
  dateWithin: string
  setDateWithin: (value: string) => void
  maleApplicantsMin: string
  setMaleApplicantsMin: (value: string) => void
  maleApplicantsMax: string
  setMaleApplicantsMax: (value: string) => void
  femaleApplicantsMin: string
  setFemaleApplicantsMin: (value: string) => void
  femaleApplicantsMax: string
  setFemaleApplicantsMax: (value: string) => void
  totalApplicantsMin: string
  setTotalApplicantsMin: (value: string) => void
  totalApplicantsMax: string
  setTotalApplicantsMax: (value: string) => void
  dmwStaff: string
  setDmwStaff: (value: string) => void
  onClear: () => void
}

export default function JobFairMonitoringFilterPanel(props: JobFairMonitoringFilterPanelProps) {
  const {
    onClose,
    onApply,
    venue,
    setVenue,
    dateWithin,
    setDateWithin,
    maleApplicantsMin,
    setMaleApplicantsMin,
    maleApplicantsMax,
    setMaleApplicantsMax,
    femaleApplicantsMin,
    setFemaleApplicantsMin,
    femaleApplicantsMax,
    setFemaleApplicantsMax,
    totalApplicantsMin,
    setTotalApplicantsMin,
    totalApplicantsMax,
    setTotalApplicantsMax,
    dmwStaff,
    setDmwStaff,
    onClear
  } = props

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const todayStr = new Date().toISOString().slice(0,10)

  // Sync from applied value (e.g., when reopening panel)
  useEffect(() => {
    if (dateWithin && dateWithin.includes("|")) {
      const [s, e] = dateWithin.split("|")
      setStartDate(s)
      setEndDate(e)
    } else if (!dateWithin) {
      setStartDate("")
      setEndDate("")
    }
  }, [dateWithin])

  const handleClear = () => {
    onClear()
    setStartDate("")
    setEndDate("")
    onApply("")
    onClose()
  }

  const handleApply = () => {
    // Validate dates: both set, start <= end, end <= today
    if ((startDate && !endDate) || (!startDate && endDate)) return
    if (startDate && endDate) {
      if (startDate > endDate) return
      if (endDate > todayStr) return
    }

    const parts: string[] = []
    
    if (venue) parts.push(`venue:${venue}`)
    if (startDate && endDate) {
      parts.push(`date:${startDate}|${endDate}`)
    }
    if (maleApplicantsMin) parts.push(`male_applicants_min:${maleApplicantsMin}`)
    if (maleApplicantsMax) parts.push(`male_applicants_max:${maleApplicantsMax}`)
    if (femaleApplicantsMin) parts.push(`female_applicants_min:${femaleApplicantsMin}`)
    if (femaleApplicantsMax) parts.push(`female_applicants_max:${femaleApplicantsMax}`)
    if (totalApplicantsMin) parts.push(`total_applicants_min:${totalApplicantsMin}`)
    if (totalApplicantsMax) parts.push(`total_applicants_max:${totalApplicantsMax}`)
    if (dmwStaff) parts.push(`dmw_staff:${dmwStaff}`)

    const query = parts.join(" ")
    onApply(query)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filter Options</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          ×
        </Button>
      </div>

      <div className="space-y-4">
        {/* Venue Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Venue</Label>
          <Input
            placeholder="Enter venue name"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Date Range Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Date Range</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={todayStr}
            />
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={todayStr}
            />
          </div>
        </div>

        {/* Male Applicants Range */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Male Applicants</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input
              type="number"
              placeholder="Min"
              value={maleApplicantsMin}
              onChange={(e) => setMaleApplicantsMin(e.target.value)}
              min="0"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maleApplicantsMax}
              onChange={(e) => setMaleApplicantsMax(e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Female Applicants Range */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Female Applicants</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input
              type="number"
              placeholder="Min"
              value={femaleApplicantsMin}
              onChange={(e) => setFemaleApplicantsMin(e.target.value)}
              min="0"
            />
            <Input
              type="number"
              placeholder="Max"
              value={femaleApplicantsMax}
              onChange={(e) => setFemaleApplicantsMax(e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Total Applicants Range */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Total Applicants</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input
              type="number"
              placeholder="Min"
              value={totalApplicantsMin}
              onChange={(e) => setTotalApplicantsMin(e.target.value)}
              min="0"
            />
            <Input
              type="number"
              placeholder="Max"
              value={totalApplicantsMax}
              onChange={(e) => setTotalApplicantsMax(e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* DMW Staff Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700">DMW Staff</Label>
          <Input
            placeholder="Enter staff name"
            value={dmwStaff}
            onChange={(e) => setDmwStaff(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={handleClear} className="flex-1">
          Clear
        </Button>
        <Button onClick={handleApply} className="flex-1 bg-[#1976D2] hover:bg-[#1565C0]">
          Apply
        </Button>
      </div>
    </div>
  )
}
