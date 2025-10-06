"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"

interface JobFairFilterPanelProps {
	onClose: () => void
	onApply: (query: string) => void
	// Controlled values
	venue: string
	setVenue: (value: string) => void
	officeHead: string
	setOfficeHead: (value: string) => void
	dateWithin: string // kept to persist applied value
	setDateWithin: (value: string) => void // kept for clear/reset
	isRescheduled: string
	setIsRescheduled: (value: string) => void
	yearFilter: string
	setYearFilter: (value: string) => void
	monthFilter: string
	setMonthFilter: (value: string) => void
	showDeletedOnly?: boolean
	setShowDeletedOnly?: (value: boolean) => void
	onClear: () => void
}

export default function JobFairFilterPanel(props: JobFairFilterPanelProps) {
    const { onClose, onApply, venue, setVenue, officeHead, setOfficeHead, dateWithin, setDateWithin, isRescheduled, setIsRescheduled, yearFilter, setYearFilter, monthFilter, setMonthFilter, showDeletedOnly, setShowDeletedOnly, onClear } = props
    const [localShowDeletedOnly, setLocalShowDeletedOnly] = useState<boolean>(Boolean(showDeletedOnly))
    useEffect(() => { setLocalShowDeletedOnly(Boolean(showDeletedOnly)) }, [showDeletedOnly])

	// Local state for native date inputs
	const [startDate, setStartDate] = useState<string>("")
	const [endDate, setEndDate] = useState<string>("")
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
		if (officeHead) parts.push(`office_head:${officeHead}`)
		if (isRescheduled) parts.push(`is_rescheduled:${isRescheduled}`)
		if (yearFilter && yearFilter !== "all") parts.push(`year:${yearFilter}`)
		if (monthFilter && monthFilter !== "all") parts.push(`month:${monthFilter}`)
		if (startDate && endDate) {
			const toDate = endDate > todayStr ? todayStr : endDate
			parts.push(`date_range:${startDate}|${toDate}`)
			setDateWithin(`${startDate}|${toDate}`)
		}
        if (typeof setShowDeletedOnly === 'function') setShowDeletedOnly(Boolean(localShowDeletedOnly))
        onApply(parts.join(","))
		onClose()
	}

	const dateRangeLabel = startDate && endDate
		? `${startDate.replaceAll('-', '/') } - ${endDate.replaceAll('-', '/')}`
		: (dateWithin ? dateWithin.replace('|', ' - ').replaceAll('-', '/') : 'Select date range')

	return (
		<div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 w-[360px]">
			<div className="space-y-4">
				{/* Venue */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Venue</Label>
					<Input
						placeholder="Enter venue name"
						value={venue}
						onChange={(e) => setVenue(e.target.value)}
						className="w-full"
					/>
				</div>

				{/* Office Head */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Office Head</Label>
					<Input
						placeholder="Enter office head name"
						value={officeHead}
						onChange={(e) => setOfficeHead(e.target.value)}
						className="w-full"
					/>
				</div>

				{/* Date Range */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Date Range</Label>
					<div className="grid grid-cols-2 gap-2">
						<Input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							max={todayStr}
							className="w-full"
						/>
						<Input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							max={todayStr}
							className="w-full"
						/>
					</div>
					<div className="text-xs text-gray-500 mt-1">{dateRangeLabel}</div>
				</div>

				{/* Year Filter */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Year</Label>
					<Select value={yearFilter} onValueChange={setYearFilter}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select year" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Years</SelectItem>
							{Array.from({ length: 10 }, (_, i) => {
								const year = new Date().getFullYear() - i;
								return (
									<SelectItem key={year} value={year.toString()}>
										{year}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				</div>

				{/* Month Filter */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Month</Label>
					<Select value={monthFilter} onValueChange={setMonthFilter}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select month" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Months</SelectItem>
							<SelectItem value="1">January</SelectItem>
							<SelectItem value="2">February</SelectItem>
							<SelectItem value="3">March</SelectItem>
							<SelectItem value="4">April</SelectItem>
							<SelectItem value="5">May</SelectItem>
							<SelectItem value="6">June</SelectItem>
							<SelectItem value="7">July</SelectItem>
							<SelectItem value="8">August</SelectItem>
							<SelectItem value="9">September</SelectItem>
							<SelectItem value="10">October</SelectItem>
							<SelectItem value="11">November</SelectItem>
							<SelectItem value="12">December</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Rescheduled Status */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Rescheduled Status</Label>
					<RadioGroup value={isRescheduled} onValueChange={setIsRescheduled}>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="all" id="all" />
							<Label htmlFor="all" className="text-sm">All</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="true" id="rescheduled" />
							<Label htmlFor="rescheduled" className="text-sm">Rescheduled</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="false" id="not-rescheduled" />
							<Label htmlFor="not-rescheduled" className="text-sm">Not Rescheduled</Label>
						</div>
					</RadioGroup>
				</div>

                {/* Show deleted only */}
                {typeof setShowDeletedOnly === 'function' && (
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" className="h-3 w-3" checked={Boolean(localShowDeletedOnly)} onChange={(e)=> setLocalShowDeletedOnly(e.target.checked)} />
                    Show deleted only
                  </label>
                )}

				{/* Action Buttons */}
				<div className="flex gap-2 pt-2">
					<Button variant="outline" onClick={handleClear} className="flex-1">
						Clear
					</Button>
					<Button onClick={handleApply} className="flex-1">
						Apply
					</Button>
				</div>
			</div>
		</div>
	)
}
