"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Trash2, FileText, Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

type DirectHireApplication = {
  id: number
  controlNumber: string
  name: string
  sex: string
  salary: string
  status:
    | "evaluated"
    | "for confirmation"
    | "emailed to dhad"
    | "received from dhad"
    | "for interview"
    | "for appointment"
}

interface DirectHireApplicationsTableProps {
  search: string
}

export default function DirectHireApplicationsTable({ search }: DirectHireApplicationsTableProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<DirectHireApplication | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [formData, setFormData] = useState<any>({
    controlNumber: "",
    name: "",
    sex: "Male",
    type: "Professional",
    contact: "",
    email: "",
    jobsite: "",
    position: "",
    salary: "",
    salaryCurrency: "PHP",
    salaryUSD: "",
    salaryFrequency: "Daily",
    employer: "",
    evaluator: "",
    passport: null,
    visa: null,
    contract: null,
    tesda: null,
  })
  const [applications, setApplications] = useState<DirectHireApplication[]>([
    {
      id: 1,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-001",
      name: "Delos Santos, Patricia Mae",
      sex: "Female",
      salary: "$690",
      status: "evaluated",
    },
    {
      id: 2,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-002",
      name: "Santos, Juan Dela Cruz",
      sex: "Male",
      salary: "$1,200",
      status: "for confirmation",
    },
    {
      id: 3,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-003",
      name: "Reyes, Maria Clara",
      sex: "Female",
      salary: "$2,000",
      status: "emailed to dhad",
    },
    {
      id: 4,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-004",
      name: "Lim, Roberto",
      sex: "Male",
      salary: "$1,500",
      status: "received from dhad",
    },
    {
      id: 5,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-005",
      name: "Gomez, Ana",
      sex: "Female",
      salary: "$1,800",
      status: "for interview",
    },
    {
      id: 6,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-006",
      name: "Torres, Michael",
      sex: "Male",
      salary: "$950",
      status: "for appointment",
    },
    {
      id: 7,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-007",
      name: "Navarro, Jose",
      sex: "Male",
      salary: "$1,100",
      status: "evaluated",
    },
    {
      id: 8,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-008",
      name: "Cruz, Angela",
      sex: "Female",
      salary: "$1,300",
      status: "for confirmation",
    },
    {
      id: 9,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-009",
      name: "Dela Cruz, Mark",
      sex: "Male",
      salary: "$1,400",
      status: "emailed to dhad",
    },
    {
      id: 10,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-010",
      name: "Villanueva, Carla",
      sex: "Female",
      salary: "$1,600",
      status: "received from dhad",
    },
    {
      id: 11,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-011",
      name: "Santiago, Paul",
      sex: "Male",
      salary: "$1,700",
      status: "for interview",
    },
    {
      id: 12,
      controlNumber: "DHPSW-ROIVA-2025-0319-013-012",
      name: "Lopez, Maria",
      sex: "Female",
      salary: "$1,800",
      status: "for appointment",
    },
  ])

  const filteredApplications = applications.filter(application =>
    Object.values(application).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  const getStatusBadge = (status: string) => {
    const capitalizeWords = (str: string) => {
      return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    switch (status) {
      case "evaluated":
        return <div className="bg-[#E3F2FD] text-[#1976D2] text-xs px-2 py-1 rounded">Evaluated</div>
      case "for confirmation":
        return <div className="bg-[#F5F5F5] text-[#424242] text-xs px-2 py-1 rounded">For Confirmation</div>
      case "emailed to dhad":
        return <div className="bg-[#FFF3E0] text-[#F57C00] text-xs px-2 py-1 rounded">Emailed To DHAD</div>
      case "received from dhad":
        return <div className="bg-[#E8F5E9] text-[#2E7D32] text-xs px-2 py-1 rounded">Received From DHAD</div>
      case "for interview":
        return <div className="bg-[#FCE4EC] text-[#C2185B] text-xs px-2 py-1 rounded">For Interview</div>
      case "for appointment":
        return <div className="bg-[#F3E5F5] text-[#7B1FA2] text-xs px-2 py-1 rounded">For Appointment</div>
      default:
        return null
    }
  }

  return (
    <>
      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                <th className="py-3 px-4 font-medium text-center">Control #</th>
                <th className="py-3 px-4 font-medium text-center">Name</th>
                <th className="py-3 px-4 font-medium text-center">Sex</th>
                <th className="py-3 px-4 font-medium text-center">Salary</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">{application.controlNumber}</td>
                  <td className="py-3 px-4 text-center">{application.name}</td>
                  <td className="py-3 px-4 text-center">{application.sex}</td>
                  <td className={`py-3 px-4 text-center font-medium ${parseInt(application.salary.replace(/[^0-9]/g, '')) < 1000 ? 'text-red-500' : ''}`}>
                    {application.salary}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(application.status)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(application)
                              setOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Compliance Form
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Applicant Details Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Applicant Details</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selected && (
            <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
              {/* Personal Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Personal Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Control No.:</div>
                    <div className="font-medium">{selected.controlNumber}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Name:</div>
                    <div className="font-medium">{selected.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium">{selected.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Type of Worker:</div>
                    <div className="font-medium">Professional</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Contact No.:</div>
                    <div className="font-medium">(+63) 9999999999</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email Address:</div>
                    <div className="font-medium">evangelistafatima@gmail.com</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Employment Details */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Employment Details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Jobsite:</div>
                    <div className="font-medium">Singapore</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Position:</div>
                    <div className="font-medium">Teacher</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Salary:</div>
                    <div className="font-medium">{selected.salary}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Employer:</div>
                    <div className="font-medium">ABC Company</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Application Status */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Application Status</div>
                <ul className="text-sm">
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-green-600 text-lg">●</span>
                    <span className="font-semibold text-green-700">Evaluated</span>
                    <span className="ml-auto text-xs text-green-700">(Feb 10, 2025) 2:10 PM</span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-lg">●</span>
                    <span className="font-semibold text-gray-700">For Confirmation (MWO/PE/PCG)</span>
                    <span className="ml-auto text-xs text-gray-500">N/A</span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-lg">●</span>
                    <span className="font-semibold text-gray-700">Emailed to DHAD</span>
                    <span className="ml-auto text-xs text-gray-500">N/A</span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-lg">●</span>
                    <span className="font-semibold text-gray-700">Received from DHAD</span>
                    <span className="ml-auto text-xs text-gray-500">N/A</span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-lg">●</span>
                    <span className="font-semibold text-gray-700">For Appointment</span>
                    <span className="ml-auto text-xs text-gray-500">...</span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-lg">●</span>
                    <span className="font-semibold text-gray-700">For Interview</span>
                    <span className="ml-auto text-xs text-gray-500">N/A</span>
                  </li>
                </ul>
              </div>
              <hr className="my-4" />
              {/* Documents */}
              <div>
                <div className="font-semibold text-gray-700 mb-2">Documents</div>
                <div className="flex gap-2 mb-2">
                  <Button variant="outline" className="text-xs">+ Merge</Button>
                  <Button className="bg-[#1976D2] text-white text-xs">+ New</Button>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="accent-[#1976D2]" />
                    <span>Clearance</span>
                    <span className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Update/Replace</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="accent-[#1976D2]" />
                    <span>Memorandum</span>
                    <span className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Update/Replace</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="accent-[#1976D2]" />
                    <span>MWO/PE/PCG Confirmation</span>
                    <span className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Update/Replace</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" readOnly className="accent-[#1976D2]" />
                    <span>Checklist of Requirements</span>
                    <span className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Update/Replace</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" readOnly className="accent-[#1976D2]" />
                    <span>Interview Form</span>
                    <span className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Update/Replace</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Create Applicant Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span>📝</span> Fill Out Form
            </DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="px-8 py-6">
            <Tabs value={`form${formStep}`} className="w-full">
              <TabsList className="w-full flex mb-6">
                <TabsTrigger value="form1" className={`flex-1 ${formStep === 1 ? '!bg-white !text-[#1976D2]' : ''}`}>Form 1</TabsTrigger>
                <TabsTrigger value="form2" className={`flex-1 ${formStep === 2 ? '!bg-white !text-[#1976D2]' : ''}`}>Form 2</TabsTrigger>
              </TabsList>
              <TabsContent value="form1">
                {/* Form 1 Fields */}
                <form className="space-y-4">
                  <div>
                    <label className="text-xs font-medium flex items-center gap-2"><span>Control No.</span></label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.controlNumber} onChange={e => setFormData({ ...formData, controlNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium flex items-center gap-2"><span>Name of Worker:</span></label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Sex:</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'Male'} onChange={() => setFormData({ ...formData, sex: 'Male' })} /> Male</label>
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'Female'} onChange={() => setFormData({ ...formData, sex: 'Female' })} /> Female</label>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Type:</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-1"><input type="radio" name="type" checked={formData.type === 'Household'} onChange={() => setFormData({ ...formData, type: 'Household' })} /> Household</label>
                        <label className="flex items-center gap-1"><input type="radio" name="type" checked={formData.type === 'Professional'} onChange={() => setFormData({ ...formData, type: 'Professional' })} /> Professional</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Contact Number:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Email Address:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Jobsite:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.jobsite} onChange={e => setFormData({ ...formData, jobsite: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Position:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Salary: Based on contract per month (converted to USD):</label>
                      <div className="flex gap-2 mt-1">
                        <select className="border rounded px-2" value={formData.salaryCurrency} onChange={e => setFormData({ ...formData, salaryCurrency: e.target.value })}>
                          <option>PHP</option>
                          <option>USD</option>
                        </select>
                        <input className="border rounded px-2 w-24" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                        <span>/</span>
                        <select className="border rounded px-2" value={formData.salaryFrequency} onChange={e => setFormData({ ...formData, salaryFrequency: e.target.value })}>
                          <option>Daily</option>
                          <option>Monthly</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">USD:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.salaryUSD} onChange={e => setFormData({ ...formData, salaryUSD: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Employer:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.employer} onChange={e => setFormData({ ...formData, employer: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Evaluator:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.evaluator} onChange={e => setFormData({ ...formData, evaluator: e.target.value })} />
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={() => setFormStep(2)}>Next</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="form2">
                {/* Form 2 Fields */}
                <form className="space-y-4">
                  <div>
                    <label className="text-xs font-medium">Passport:</label>
                    <input type="file" className="w-full border rounded px-3 py-2 mt-1" onChange={e => setFormData({ ...formData, passport: e.target.files?.[0] })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Visa/Work Permit:</label>
                    <input type="file" className="w-full border rounded px-3 py-2 mt-1" onChange={e => setFormData({ ...formData, visa: e.target.files?.[0] })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Employment Contract/ Offer of Employment:</label>
                    <input type="file" className="w-full border rounded px-3 py-2 mt-1" onChange={e => setFormData({ ...formData, contract: e.target.files?.[0] })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">TESDA NCII/PRC License:</label>
                    <input type="file" className="w-full border rounded px-3 py-2 mt-1" onChange={e => setFormData({ ...formData, tesda: e.target.files?.[0] })} />
                  </div>
                  <div className="flex justify-between mt-6 gap-2">
                    <Button variant="outline" className="flex-1" type="button" onClick={() => { setCreateOpen(false); toast.success('Draft saved!') }}>Save as Draft</Button>
                    <Button className="bg-[#1976D2] text-white flex-1" type="button" onClick={() => {
                      setApplications([
                        ...applications,
                        {
                          id: applications.length + 1,
                          controlNumber: formData.controlNumber,
                          name: formData.name,
                          sex: formData.sex,
                          salary: formData.salaryUSD ? `$${formData.salaryUSD}` : `$${formData.salary}`,
                          status: "evaluated",
                        },
                      ])
                      setCreateOpen(false)
                      toast.success('Applicant created successfully!')
                    }}>Create</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
