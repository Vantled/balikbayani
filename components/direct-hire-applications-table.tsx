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
import { Document } from "@/lib/types"

interface DirectHireApplicationsTableProps {
  search: string
}

interface ApplicantDocumentsTabProps {
  applicationId: string
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
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
                  <Button 
                    className="bg-[#1976D2] text-white text-xs"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    + New
                  </Button>
                </div>
                <ApplicantDocumentsList applicationId={selected.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          <DocumentUploadForm 
            applicationId={selected?.id || ''}
            applicationType="direct_hire"
            onSuccess={() => {
              setUploadModalOpen(false)
              // Refresh the documents list by triggering a re-render
              setSelected({ ...selected! })
              toast({
                title: 'Document uploaded',
                description: 'Document has been uploaded successfully',
              })
            }}
            onError={(error) => {
              toast({
                title: 'Upload Error',
                description: error,
                variant: 'destructive'
              })
            }}
          />
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
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, passport: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Visa/Work Permit:</label>
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, visa: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium">TESDA NCII/PRC License:</label>
                    <input 
                      type="file" 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setFormData({ ...formData, tesda: e.target.files?.[0] })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
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

                        // Create FormData for file upload
                        const formDataToSend = new FormData();
                        formDataToSend.append('name', formData.name);
                        formDataToSend.append('sex', formData.sex);
                        formDataToSend.append('salary', salaryInUSD.toString());
                        formDataToSend.append('jobsite', formData.jobsite);
                        formDataToSend.append('position', formData.position);
                        formDataToSend.append('evaluator', formData.evaluator);
                        formDataToSend.append('status', 'pending');

                        // Add files if they exist
                        if (formData.passport) {
                          formDataToSend.append('passport', formData.passport);
                        }
                        if (formData.visa) {
                          formDataToSend.append('visa', formData.visa);
                        }
                        if (formData.tesda) {
                          formDataToSend.append('tesda', formData.tesda);
                        }

                        const response = await fetch('/api/direct-hire', {
                          method: 'POST',
                          body: formDataToSend,
                        });

                        const result = await response.json();
                                                  if (result.success) {
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
                        } else {
                          throw new Error(result.error || 'Failed to create application');
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

// Applicant Documents List Component
function ApplicantDocumentsList({ applicationId }: ApplicantDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch documents for this application
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=direct_hire`)
        const result = await response.json()
        
        if (result.success) {
          setDocuments(result.data)
        } else {
          console.error('Failed to fetch documents:', result.error)
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
        toast({
          title: 'Error',
          description: 'Failed to load documents',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    if (applicationId) {
      fetchDocuments()
    }
  }, [applicationId, toast])

  // Handle document view/download
  const handleView = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('View failed')
      }
    } catch (error) {
      toast({
        title: 'View Error',
        description: 'Failed to view document',
        variant: 'destructive'
      })
    }
  }

  // Handle document delete
  const handleDelete = async (document: Document) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${document.file_name}?`)
    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        setDocuments(docs => docs.filter(doc => doc.id !== document.id))
        toast({
          title: 'Document deleted',
          description: `${document.file_name} has been removed`,
        })
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error) {
      toast({
        title: 'Delete Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading documents...
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No documents uploaded yet
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-2">
          <input type="checkbox" checked readOnly className="accent-[#1976D2]" />
          <span className="flex-1 text-sm">{document.file_name}</span>
          <span className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(document)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(document)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Document Upload Form Component
interface DocumentUploadFormProps {
  applicationId: string
  applicationType: string
  onSuccess: () => void
  onError: (error: string) => void
}

function DocumentUploadForm({ applicationId, applicationType, onSuccess, onError }: DocumentUploadFormProps) {
  const [uploading, setUploading] = useState(false)
  const [documentType, setDocumentType] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const documentTypes = [
    'passport',
    'visa',
    'tesda',
    'clearance',
    'memorandum',
    'employment_contract',
    'interview_form',
    'other'
  ]

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      onError('Please select a file and document type')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('applicationId', applicationId)
      formData.append('applicationType', applicationType)
      formData.append('documentType', documentType)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Document Type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1"
        >
          <option value="">Select document type</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">File</label>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          accept=".jpg,.jpeg,.png,.pdf"
          className="w-full border rounded px-3 py-2 mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => onError('Upload cancelled')}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !documentType}
          className="bg-[#1976D2] hover:bg-[#1565C0]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </div>
    </div>
  )
}

