"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"

interface FilterPanelProps {
	onClose: () => void
	onApply: (query: string) => void
	// Controlled values
	typeHousehold?: boolean
	setTypeHousehold?: (value: boolean) => void
	typeProfessional?: boolean
	setTypeProfessional?: (value: boolean) => void
	sex: string
	setSex: (value: string) => void
	status: string
	setStatus: (value: string) => void
	dateWithin: string // kept to persist applied value
	setDateWithin: (value: string) => void // kept for clear/reset
	jobsite: string
	setJobsite: (value: string) => void
	position: string
	setPosition: (value: string) => void
	evaluator?: string
	setEvaluator?: (value: string) => void
	category?: string
	setCategory?: (value: string) => void
	// Optional toggles
	showFinishedOnly?: boolean
	setShowFinishedOnly?: (value: boolean) => void
	showDeletedOnly?: boolean
	setShowDeletedOnly?: (value: boolean) => void
	onClear: () => void
}

export default function FilterPanel(props: FilterPanelProps) {
	const {
		onClose,
		onApply,
		typeHousehold,
		setTypeHousehold,
		typeProfessional,
		setTypeProfessional,
		sex,
		setSex,
		status,
		setStatus,
		dateWithin,
		setDateWithin,
		jobsite,
		setJobsite,
		position,
		setPosition,
		evaluator,
		setEvaluator,
		category,
		setCategory,
		showFinishedOnly,
		setShowFinishedOnly,
		showDeletedOnly,
		setShowDeletedOnly,
		onClear
	} = props

	const [startDate, setStartDate] = useState("")
	const [endDate, setEndDate] = useState("")
	const todayStr = new Date().toISOString().slice(0,10)

	// Local toggles to apply on submit
	const [localShowFinishedOnly, setLocalShowFinishedOnly] = useState<boolean>(Boolean(showFinishedOnly))
	const [localShowDeletedOnly, setLocalShowDeletedOnly] = useState<boolean>(Boolean(showDeletedOnly))

	useEffect(() => {
		setLocalShowFinishedOnly(Boolean(showFinishedOnly))
	}, [showFinishedOnly])

	useEffect(() => {
		setLocalShowDeletedOnly(Boolean(showDeletedOnly))
	}, [showDeletedOnly])

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
		if (sex) parts.push(`sex:${sex}`)
		if (typeHousehold && !typeProfessional) parts.push("job_type:household")
		if (typeProfessional && !typeHousehold) parts.push("job_type:professional")
		if (status) parts.push(`status:${status}`)
		if (category) parts.push(`category:${category}`)
		if (jobsite) parts.push(`jobsite:${jobsite}`)
		if (position) parts.push(`position:${position}`)
		if (evaluator) parts.push(`evaluator:${evaluator}`)
		if (startDate && endDate) {
			const toDate = endDate > todayStr ? todayStr : endDate
			parts.push(`date_range:${startDate}|${toDate}`)
			setDateWithin(`${startDate}|${toDate}`)
		}
		// Apply toggles
		if (typeof setShowFinishedOnly === 'function') setShowFinishedOnly(Boolean(localShowFinishedOnly))
		if (typeof setShowDeletedOnly === 'function') setShowDeletedOnly(Boolean(localShowDeletedOnly))
		onApply(parts.join(","))
		onClose()
	}

	const dateRangeLabel = startDate && endDate
		? `${startDate.replaceAll('-', '/') } - ${endDate.replaceAll('-', '/')}`
		: (dateWithin ? dateWithin.replace('|', ' - ').replaceAll('-', '/') : 'Select date range')

	return (
		<div className="bg-white border border-gray-200 rounded-md shadow-lg p-4 w-[360px] max-h-[80vh] overflow-y-auto">
			<div className="space-y-4">
				{/* Type */}
				{typeof setTypeHousehold === 'function' && typeof setTypeProfessional === 'function' && (
				<div>
					<Label className="text-sm font-medium mb-2 block">Type</Label>
					<div className="flex items-center space-x-6">
						<div className="flex items-center space-x-2">
							<Checkbox id="household" checked={Boolean(typeHousehold)} onCheckedChange={(v) => setTypeHousehold && setTypeHousehold(Boolean(v))} />
							<Label htmlFor="household" className="text-sm">Household</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox id="professional" checked={Boolean(typeProfessional)} onCheckedChange={(v) => setTypeProfessional && setTypeProfessional(Boolean(v))} />
							<Label htmlFor="professional" className="text-sm">Professional</Label>
						</div>
					</div>
				</div>
				)}

				{/* Sex */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Sex</Label>
					<RadioGroup value={sex} onValueChange={setSex} className="flex space-x-4">
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="" id="none" />
							<Label htmlFor="none" className="text-sm">None</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="female" id="female" />
							<Label htmlFor="female" className="text-sm">Female</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="male" id="male" />
							<Label htmlFor="male" className="text-sm">Male</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Status */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Status</Label>
					<Select onValueChange={setStatus} value={status}>
						<SelectTrigger className="w-full h-8">
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="approved">Approved</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="rejected">Rejected</SelectItem>
							<SelectItem value="evaluated">Evaluated</SelectItem>
							<SelectItem value="for_confirmation">For Confirmation</SelectItem>
							<SelectItem value="emailed_to_dhad">Emailed to DHAD</SelectItem>
							<SelectItem value="received_from_dhad">Received from DHAD</SelectItem>
							<SelectItem value="for_interview">For Interview</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Category */}
				{typeof setCategory === 'function' && (
					<div>
						<Label className="text-sm font-medium mb-2 block">Category</Label>
						<Select onValueChange={setCategory} value={category || ""}>
							<SelectTrigger className="w-full h-8">
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Direct Hire">Direct Hire</SelectItem>
								<SelectItem value="Balik Manggagawa">Balik Manggagawa</SelectItem>
								<SelectItem value="Gov to Gov">Gov to Gov</SelectItem>
								<SelectItem value="Information Sheet">Information Sheet</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}

				{/* Date Range (Native inputs) */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Date Range</Label>
					<div className="flex items-center gap-2">
						<input type="date" className="w-0 flex-1 min-w-0 border rounded px-3 py-2 text-sm" value={startDate} max={todayStr} onChange={(e) => setStartDate(e.target.value)} />
						<span className="text-gray-500 shrink-0">-</span>
						<input type="date" className="w-0 flex-1 min-w-0 border rounded px-3 py-2 text-sm" value={endDate} max={todayStr} onChange={(e) => setEndDate(e.target.value)} />
					</div>
				</div>

				{/* Jobsite */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Jobsite</Label>
					<input 
						type="text" 
						className="w-full border rounded px-3 py-2 text-sm" 
						placeholder="Type jobsite"
						value={jobsite}
						onChange={(e) => setJobsite(e.target.value)}
					/>
				</div>

				{/* Position */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Position</Label>
					<input 
						type="text" 
						className="w-full border rounded px-3 py-2 text-sm" 
						placeholder="Type position"
						value={position}
						onChange={(e) => setPosition(e.target.value)}
					/>
				</div>

				{/* Evaluator */}
				{typeof setEvaluator === 'function' && (
				<div>
					<Label className="text-sm font-medium mb-2 block">Evaluator</Label>
					<input 
						type="text" 
						className="w-full border rounded px-3 py-2 text-sm" 
						placeholder="Type evaluator"
						value={evaluator || ""}
						onChange={(e) => setEvaluator && setEvaluator(e.target.value)}
					/>
				</div>
				)}

			{/* Toggles (optional) */}
			{(typeof setShowFinishedOnly === 'function' || typeof setShowDeletedOnly === 'function') && (
			  <div className="space-y-2 pt-1">
				{typeof setShowFinishedOnly === 'function' && (
				  <label className="flex items-center gap-2 text-xs text-gray-700">
					<input type="checkbox" className="h-3 w-3" checked={Boolean(localShowFinishedOnly)} onChange={(e)=> setLocalShowFinishedOnly(e.target.checked)} />
					Show finished only
				  </label>
				)}
				{typeof setShowDeletedOnly === 'function' && (
				  <label className="flex items-center gap-2 text-xs text-gray-700">
					<input type="checkbox" className="h-3 w-3" checked={Boolean(localShowDeletedOnly)} onChange={(e)=> setLocalShowDeletedOnly(e.target.checked)} />
					Show deleted only
				  </label>
				)}
			  </div>
			)}

				{/* Action Buttons */}
				<div className="flex space-x-2 pt-2">
					<Button variant="outline" className="flex-1 h-8" onClick={handleClear}>Clear</Button>
					<Button className="flex-1 h-8 bg-[#1976D2] hover:bg-[#1565C0]" onClick={handleApply}>Search</Button>
				</div>
			</div>
		</div>
	)
}
