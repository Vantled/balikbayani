"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, FileText } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface CreateApplicationModalProps {
  onClose: () => void
}

export default function CreateApplicationModal({ onClose }: CreateApplicationModalProps) {
  const [activeTab, setActiveTab] = useState("form1")

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">Fill Out Form</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="form1">Form 1</TabsTrigger>
              <TabsTrigger value="form2">Form 2</TabsTrigger>
            </TabsList>

            <TabsContent value="form1" className="space-y-4">
              {/* Control No */}
              <div>
                <Label className="text-sm font-medium">Control No.</Label>
                <Input value="DHPSW-ROIVA-MMDD-2025-000" disabled className="mt-1 bg-gray-50" />
              </div>

              {/* Name of Worker */}
              <div>
                <Label className="text-sm font-medium">Name of Worker:</Label>
                <Input className="mt-1" placeholder="Enter worker name" />
              </div>

              {/* Sex */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Sex:</Label>
                <RadioGroup defaultValue="male" className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Type */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Type:</Label>
                <RadioGroup defaultValue="household" className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="household" id="household" />
                    <Label htmlFor="household">Household</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional">Professional</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Contact Number */}
              <div>
                <Label className="text-sm font-medium">Contact Number:</Label>
                <Input className="mt-1" placeholder="Enter contact number" />
              </div>

              {/* Email Address */}
              <div>
                <Label className="text-sm font-medium">Email Address:</Label>
                <Input className="mt-1" type="email" placeholder="Enter email address" />
              </div>

              {/* Jobsite */}
              <div>
                <Label className="text-sm font-medium">Jobsite:</Label>
                <Select>
                  <SelectTrigger className="mt-1">
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
                <Label className="text-sm font-medium">Position:</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic-worker">Domestic Worker</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Salary */}
              <div>
                <Label className="text-sm font-medium">Salary: Based on contract per month converted to USD:</Label>
                <div className="flex space-x-2 mt-1">
                  <Select defaultValue="php">
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="php">PHP</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" placeholder="Enter amount" />
                  <Select defaultValue="daily">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employer */}
              <div>
                <Label className="text-sm font-medium">Employer:</Label>
                <Input className="mt-1" placeholder="Enter employer name" />
              </div>

              {/* Evaluator */}
              <div>
                <Label className="text-sm font-medium">Evaluator:</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select evaluator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evaluator1">Evaluator 1</SelectItem>
                    <SelectItem value="evaluator2">Evaluator 2</SelectItem>
                    <SelectItem value="evaluator3">Evaluator 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button className="bg-[#1976D2] hover:bg-[#1565C0]" onClick={() => setActiveTab("form2")}>
                  Next
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="form2" className="space-y-6">
              {/* Passport */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Passport:</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Button variant="outline" className="mb-2">
                    Choose files
                  </Button>
                  <p className="text-sm text-gray-500">No file chosen</p>
                </div>
              </div>

              {/* Visa/Work Permit */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Visa/Work Permit:</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Button variant="outline" className="mb-2">
                    Choose files
                  </Button>
                  <p className="text-sm text-gray-500">No file chosen</p>
                </div>
              </div>

              {/* Employment Contract */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Employment Contract/ Offer of Employment:</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Button variant="outline" className="mb-2">
                    Choose files
                  </Button>
                  <p className="text-sm text-gray-500">No file chosen</p>
                </div>
              </div>

              {/* TESDA License */}
              <div>
                <Label className="text-sm font-medium mb-2 block">TESDA NC/IPRC License:</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Button variant="outline" className="mb-2">
                    Choose files
                  </Button>
                  <p className="text-sm text-gray-500">No file chosen</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onClose}>
                  Save as Draft
                </Button>
                <Button className="bg-[#1976D2] hover:bg-[#1565C0]" onClick={onClose}>
                  Create
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
