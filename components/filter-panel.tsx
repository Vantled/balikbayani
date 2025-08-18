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
	typeHousehold: boolean
	setTypeHousehold: (value: boolean) => void
	typeProfessional: boolean
	setTypeProfessional: (value: boolean) => void
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
	evaluator: string
	setEvaluator: (value: string) => void
	onClear: () => void
}

export default function FilterPanel(props: FilterPanelProps) {
	const { onClose, onApply, typeHousehold, setTypeHousehold, typeProfessional, setTypeProfessional, sex, setSex, status, setStatus, dateWithin, setDateWithin, jobsite, setJobsite, position, setPosition, evaluator, setEvaluator, onClear } = props

	// Local state for native date inputs
	const [startDate, setStartDate] = useState<string>("")
	const [endDate, setEndDate] = useState<string>("")

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
		const parts: string[] = []
		if (sex) parts.push(`sex:${sex}`)
		if (typeHousehold && !typeProfessional) parts.push("job_type:household")
		if (typeProfessional && !typeHousehold) parts.push("job_type:professional")
		if (status) parts.push(`status:${status}`)
		if (jobsite) parts.push(`jobsite:${jobsite}`)
		if (position) parts.push(`position:${position}`)
		if (evaluator) parts.push(`evaluator:${evaluator}`)
		if (startDate && endDate) {
			parts.push(`date_range:${startDate}|${endDate}`)
			setDateWithin(`${startDate}|${endDate}`)
		}
		onApply(parts.join(","))
		onClose()
	}

	const dateRangeLabel = startDate && endDate
		? `${startDate.replaceAll('-', '/') } - ${endDate.replaceAll('-', '/')}`
		: (dateWithin ? dateWithin.replace('|', ' - ').replaceAll('-', '/') : 'Select date range')

	return (
		<div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 w-[360px]">
			<div className="space-y-4">
				{/* Type */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Type</Label>
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<Checkbox id="household" checked={typeHousehold} onCheckedChange={(v) => setTypeHousehold(Boolean(v))} />
							<Label htmlFor="household" className="text-sm">Household</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox id="professional" checked={typeProfessional} onCheckedChange={(v) => setTypeProfessional(Boolean(v))} />
							<Label htmlFor="professional" className="text-sm">Professional</Label>
						</div>
					</div>
				</div>

				{/* Sex */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Sex</Label>
					<RadioGroup value={sex} onValueChange={setSex} className="flex space-x-4">
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

				{/* Date Range (Native inputs) */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Date Range</Label>
					<div className="flex items-center gap-2">
						<input type="date" className="w-0 flex-1 min-w-0 border rounded px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						<span className="text-gray-500 shrink-0">-</span>
						<input type="date" className="w-0 flex-1 min-w-0 border rounded px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
				<div>
					<Label className="text-sm font-medium mb-2 block">Evaluator</Label>
					<input 
						type="text" 
						className="w-full border rounded px-3 py-2 text-sm" 
						placeholder="Type evaluator"
						value={evaluator}
						onChange={(e) => setEvaluator(e.target.value)}
					/>
				</div>

				{/* Action Buttons */}
				<div className="flex space-x-2 pt-2">
					<Button variant="outline" className="flex-1 h-8" onClick={handleClear}>Clear</Button>
					<Button className="flex-1 h-8 bg-[#1976D2] hover:bg-[#1565C0]" onClick={handleApply}>Search</Button>
				</div>
			</div>
		</div>
	)
}
