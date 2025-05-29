"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterPanelProps {
  onClose: () => void
}

export default function FilterPanel({ onClose }: FilterPanelProps) {
  return (
    <div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 w-[280px]">
      <div className="space-y-4">
        {/* Type */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Type</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="household" />
              <Label htmlFor="household" className="text-sm">
                Household
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="professional" />
              <Label htmlFor="professional" className="text-sm">
                Professional
              </Label>
            </div>
          </div>
        </div>

        {/* Sex */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Sex</Label>
          <RadioGroup defaultValue="female" className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="text-sm">
                Female
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="text-sm">
                Male
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Status */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Status</Label>
          <Select>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Approval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Within */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Date Within</Label>
          <Select>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobsite */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Jobsite</Label>
          <Select>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select jobsite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="singapore">Singapore</SelectItem>
              <SelectItem value="japan">Japan</SelectItem>
              <SelectItem value="china">China</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Position */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Position</Label>
          <Select>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="domestic-worker">Domestic Worker</SelectItem>
              <SelectItem value="caregiver">Caregiver</SelectItem>
              <SelectItem value="nurse">Nurse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Evaluator */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Evaluator</Label>
          <Select>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select evaluator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="evaluator1">Evaluator 1</SelectItem>
              <SelectItem value="evaluator2">Evaluator 2</SelectItem>
              <SelectItem value="evaluator3">Evaluator 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" className="flex-1 h-8" onClick={onClose}>
            Clear
          </Button>
          <Button className="flex-1 h-8 bg-[#1976D2] hover:bg-[#1565C0]" onClick={onClose}>
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
