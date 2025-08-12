"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Trash2, FileText, Plus, BadgeCheck, X, AlertTriangle, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useDirectHireApplications } from "@/hooks/use-direct-hire-applications"
import { DirectHireApplication } from "@/lib/types"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"

interface DirectHireApplicationsTableProps {
  search: string
}

export default function DirectHireApplicationsTable({ search }: DirectHireApplicationsTableProps) {
  const { toast } = useToast()
  const { 
    applications, 
    loading, 
    error, 
    createApplication, 
    deleteApplication,
    fetchApplications 
  } = useDirectHireApplications()
  
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<DirectHireApplication | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [controlNumberPreview, setControlNumberPreview] = useState("")
  const [formData, setFormData] = useState<any>({
    name: "",
    sex: "male",
    jobsite: "",
    position: "",
    salary: "",
    salaryCurrency: "USD" as Currency,
    evaluator: "",
  })

  // Generate control number preview
  const generateControlNumberPreview = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthDay = `${month}${day}`;
    
    // For preview, we'll use a placeholder count that will be updated by the backend
    const monthlyCountStr = "001";
    const yearlyCountStr = "001";
    
    return `DHPSW-ROIVA-${year}-${monthDay}-${monthlyCountStr}-${yearlyCountStr}`;
  };

  // Get converted USD amount for display
  const getUSDEquivalentDisplay = (): string => {
    if (!formData.salary || isNaN(parseFloat(formData.salary))) return "";
    return getUSDEquivalent(parseFloat(formData.salary), formData.salaryCurrency);
  };

  useEffect(() => {
    setControlNumberPreview(generateControlNumberPreview());
  }, []);

  // Filter applications based on search
  const filteredApplications = applications.filter(application =>
    Object.values(application).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
    }
  }, [error, toast])

  const getStatusBadge = (status: string) => {
    const capitalizeWords = (str: string) => {
      return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    switch (status) {
      case "pending":
        return <div className="bg-[#FFF3E0] text-[#F57C00] text-xs px-2 py-1 rounded">Pending</div>
      case "evaluated":
        return <div className="bg-[#E3F2FD] text-[#1976D2] text-xs px-2 py-1 rounded">Evaluated</div>
      case "for_confirmation":
        return <div className="bg-[#F5F5F5] text-[#424242] text-xs px-2 py-1 rounded">For Confirmation</div>
      case "for_interview":
        return <div className="bg-[#FCE4EC] text-[#C2185B] text-xs px-2 py-1 rounded">For Interview</div>
      case "approved":
        return <div className="bg-[#E8F5E9] text-[#2E7D32] text-xs px-2 py-1 rounded">Approved</div>
      case "rejected":
        return <div className="bg-[#FFEBEE] text-[#C62828] text-xs px-2 py-1 rounded">Rejected</div>
      default:
        return <div className="bg-[#F5F5F5] text-[#424242] text-xs px-2 py-1 rounded">{capitalizeWords(status)}</div>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading applications...
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-center">{application.control_number}</td>
                    <td className="py-3 px-4 text-center">{application.name}</td>
                    <td className="py-3 px-4 text-center capitalize">{application.sex}</td>
                    <td className={`py-3 px-4 text-center font-medium ${application.salary < 1000 ? 'text-red-500' : ''}`}>
                      ${application.salary.toLocaleString()}
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
                            <DropdownMenuItem
                              onClick={() => {
                                toast({
                                  title: "Edit functionality coming soon",
                                  description: "This feature will be available in the next update",
                                })
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                const confirmDelete = window.confirm(`Are you sure you want to delete the application for ${application.name}?`)
                                if (confirmDelete) {
                                  const success = await deleteApplication(application.id)
                                  if (success) {
                                    toast({
                                      title: "Application deleted successfully",
                                      description: `${application.name}'s application has been removed`,
                                    })
                                  }
                                }
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                toast({
                                  title: "Compliance form generated",
                                  description: "The document has been prepared and is ready for download",
                                })
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Compliance Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                    <div className="font-medium">{selected.control_number}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Name:</div>
                    <div className="font-medium">{selected.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium capitalize">{selected.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status:</div>
                    <div className="font-medium">{getStatusBadge(selected.status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Jobsite:</div>
                    <div className="font-medium">{selected.jobsite}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Position:</div>
                    <div className="font-medium">{selected.position}</div>
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
                    <div className="font-medium">{selected.jobsite}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Position:</div>
                    <div className="font-medium">{selected.position}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Salary:</div>
                    <div className="font-medium">${selected.salary.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Evaluator:</div>
                    <div className="font-medium">{selected.evaluator || 'Not assigned'}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Application Status */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Application Status</div>
                <ul className="text-sm">
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'pending' ? 'text-orange-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'pending' ? 'text-orange-700' : 'text-gray-700'}`}>Pending</span>
                    <span className={`ml-auto text-xs ${selected.status === 'pending' ? 'text-orange-700' : 'text-gray-500'}`}>
                      {selected.status === 'pending' ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'evaluated' ? 'text-green-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'evaluated' ? 'text-green-700' : 'text-gray-700'}`}>Evaluated</span>
                    <span className={`ml-auto text-xs ${selected.status === 'evaluated' ? 'text-green-700' : 'text-gray-500'}`}>
                      {selected.status === 'evaluated' ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'for_confirmation' ? 'text-blue-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'for_confirmation' ? 'text-blue-700' : 'text-gray-700'}`}>For Confirmation</span>
                    <span className={`ml-auto text-xs ${selected.status === 'for_confirmation' ? 'text-blue-700' : 'text-gray-500'}`}>
                      {selected.status === 'for_confirmation' ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'for_interview' ? 'text-purple-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'for_interview' ? 'text-purple-700' : 'text-gray-700'}`}>For Interview</span>
                    <span className={`ml-auto text-xs ${selected.status === 'for_interview' ? 'text-purple-700' : 'text-gray-500'}`}>
                      {selected.status === 'for_interview' ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'approved' ? 'text-green-700' : 'text-gray-700'}`}>Approved</span>
                    <span className={`ml-auto text-xs ${selected.status === 'approved' ? 'text-green-700' : 'text-gray-500'}`}>
                      {selected.status === 'approved' ? '(Current)' : 'N/A'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${selected.status === 'rejected' ? 'text-red-600' : 'text-gray-400'}`}>●</span>
                    <span className={`font-semibold ${selected.status === 'rejected' ? 'text-red-700' : 'text-gray-700'}`}>Rejected</span>
                    <span className={`ml-auto text-xs ${selected.status === 'rejected' ? 'text-red-700' : 'text-gray-500'}`}>
                      {selected.status === 'rejected' ? '(Current)' : 'N/A'}
                    </span>
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
                    <label className="text-xs font-medium flex items-center gap-2"><span>Control No. (Preview)</span></label>
                    <input className="w-full border rounded px-3 py-2 mt-1 bg-gray-50 font-mono text-sm" value={controlNumberPreview} disabled />
                    <p className="text-xs text-gray-500 mt-1">
                      This is a preview. The actual control number will be generated upon creation.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium flex items-center gap-2"><span>Name of Worker:</span></label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Sex:</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'male'} onChange={() => setFormData({ ...formData, sex: 'male' })} /> Male</label>
                        <label className="flex items-center gap-1"><input type="radio" name="sex" checked={formData.sex === 'female'} onChange={() => setFormData({ ...formData, sex: 'female' })} /> Female</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Jobsite:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.jobsite} onChange={e => setFormData({ ...formData, jobsite: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Position:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Salary:</label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <input 
                          className="w-full border rounded px-3 py-2" 
                          type="number" 
                          step="0.01" 
                          value={formData.salary} 
                          onChange={e => setFormData({ ...formData, salary: e.target.value })} 
                          placeholder="Enter salary amount"
                        />
                      </div>
                      <div className="w-32">
                        <select 
                          className="w-full border rounded px-3 py-2 text-sm"
                          value={formData.salaryCurrency} 
                          onChange={e => setFormData({ ...formData, salaryCurrency: e.target.value as Currency })}
                        >
                          {AVAILABLE_CURRENCIES.map((currency) => (
                            <option key={currency.value} value={currency.value}>
                              {currency.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {formData.salary && formData.salaryCurrency !== "USD" && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-md">
                        <span className="text-xs text-blue-700">
                          USD Equivalent: {getUSDEquivalentDisplay()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium">Evaluator:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.evaluator} onChange={e => setFormData({ ...formData, evaluator: e.target.value })} />
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button 
                      className="bg-[#1976D2] text-white px-8" 
                      type="button" 
                      onClick={() => setFormStep(2)}
                      disabled={!formData.name || !formData.jobsite || !formData.position || !formData.salary}
                    >
                      Next
                    </Button>
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
                    <Button variant="outline" className="flex-1" type="button" onClick={() => { 
                      setCreateOpen(false); 
                      toast({
                        title: 'Draft saved successfully',
                        description: 'You can continue editing this application later',
                      }) 
                    }}>Save as Draft</Button>
                    <Button 
                      className="bg-[#1976D2] text-white flex-1" 
                      type="button" 
                                          onClick={async () => {
                      try {
                        // Convert salary to USD for storage
                        const salaryInUSD = formData.salaryCurrency === "USD" 
                          ? parseFloat(formData.salary)
                          : convertToUSD(parseFloat(formData.salary), formData.salaryCurrency);

                        const applicationData = {
                          name: formData.name,
                          sex: formData.sex,
                          salary: salaryInUSD,
                          jobsite: formData.jobsite,
                          position: formData.position,
                          evaluator: formData.evaluator,
                          status: 'pending'
                        };

                          const result = await createApplication(applicationData);
                          if (result) {
                            setCreateOpen(false);
                            setFormData({
                              name: "",
                              sex: "male",
                              jobsite: "",
                              position: "",
                              salary: "",
                              salaryCurrency: "USD" as Currency,
                              evaluator: "",
                            });
                            setControlNumberPreview(generateControlNumberPreview());
                            setFormStep(1);
                            toast({
                              title: 'Applicant created successfully!',
                              description: `${formData.name} has been added to the system`,
                            });
                          }
                        } catch (error) {
                          toast({
                            title: 'Error creating application',
                            description: 'Failed to create the application. Please try again.',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      Create
                    </Button>
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

