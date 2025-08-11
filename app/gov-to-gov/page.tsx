"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MoreHorizontal, Plus, Download, Search, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/shared/header"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

const initialRows = [
  { lastName: "Reyes", firstName: "Maria", middleName: "Clara", sex: "Female", taiwanExp: "Yes" },
  { lastName: "Lim", firstName: "Roberto", middleName: "Santos", sex: "Male", taiwanExp: "No" },
  { lastName: "Gomez", firstName: "Ana", middleName: "Lopez", sex: "Female", taiwanExp: "Yes" },
  { lastName: "Torres", firstName: "Michael", middleName: "Dela Cruz", sex: "Male", taiwanExp: "No" },
  { lastName: "Navarro", firstName: "Jose", middleName: "Ramos", sex: "Male", taiwanExp: "Yes" },
  { lastName: "Cruz", firstName: "Angela", middleName: "Villanueva", sex: "Female", taiwanExp: "No" },
  { lastName: "Delos Santos", firstName: "Patricia", middleName: "Mae", sex: "Female", taiwanExp: "Yes" },
]

export default function GovToGovPage() {
  // Handle login success toast
  useLoginSuccessToast()
  
  const { toast } = useToast()
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [formData, setFormData] = useState<any>({
    lastName: "",
    firstName: "",
    middleName: "",
    sex: "",
    dob: "",
    age: "",
    height: "",
    weight: "",
    education: "",
    address: "",
    email: "",
    contact: "",
    passportNo: "",
    passportValidity: "",
    idPresented: "",
    idNumber: "",
    withTaiwanExp: "",
    taiwanExpDetails: "",
    withJobExp: "",
    jobExpDetails: "",
    remarks: "",
    dateReceived: "",
  })

  const filteredRows = rows.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      {/* Main Content */}
      <main className="p-6 pt-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Government to Government Monitoring Table</h2>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white border-gray-300 h-9">
                  <Download className="h-4 w-4 mr-2" />
                  Export Sheet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={() => { setModalOpen(true); setFormStep(1); setFormData({ lastName: '', firstName: '', middleName: '', sex: '', dob: '', age: '', height: '', weight: '', education: '', address: '', email: '', contact: '', passportNo: '', passportValidity: '', idPresented: '', idNumber: '', withTaiwanExp: '', taiwanExpDetails: '', withJobExp: '', jobExpDetails: '', remarks: '', dateReceived: '' }) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
        <div className="bg-white rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                  <th className="py-3 px-4 font-medium text-center">Last Name</th>
                  <th className="py-3 px-4 font-medium text-center">First Name</th>
                  <th className="py-3 px-4 font-medium text-center">Middle Name</th>
                  <th className="py-3 px-4 font-medium text-center">Sex</th>
                  <th className="py-3 px-4 font-medium text-center">With Taiwan Working Experience</th>
                  <th className="py-3 px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-center">{row.lastName}</td>
                    <td className="py-3 px-4 text-center">{row.firstName}</td>
                    <td className="py-3 px-4 text-center">{row.middleName}</td>
                    <td className="py-3 px-4 text-center">{row.sex}</td>
                    <td className="py-3 px-4 text-center">{row.taiwanExp}</td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Government to Government Form</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
            <Tabs value={`form${formStep}`} className="w-full">
              <TabsList className="w-full flex mb-6">
                <TabsTrigger value="form1" className={`flex-1 ${formStep === 1 ? '!bg-white !text-[#1976D2]' : ''}`}>Basic Information</TabsTrigger>
                <TabsTrigger value="form2" className={`flex-1 ${formStep === 2 ? '!bg-white !text-[#1976D2]' : ''}`}>Other Information</TabsTrigger>
              </TabsList>
              <TabsContent value="form1">
                <form className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Last Name:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">First Name:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Middle Name:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.middleName} onChange={e => setFormData({ ...formData, middleName: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Sex:</label>
                      <select className="w-full border rounded px-3 py-2 mt-1" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Date of Birth (mm/dd/yyyy):</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Age:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Height (cm):</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Weight (kg):</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Educational Attainment:</label>
                    <select className="w-full border rounded px-3 py-2 mt-1" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })}>
                      <option value="">Select</option>
                      <option>High School Graduate</option>
                      <option>College Graduate</option>
                      <option>Vocational</option>
                      <option>Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Present Address:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Email Address:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Contact No.:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={() => setFormStep(2)}>Next</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="form2">
                <form className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Passport Number:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.passportNo} onChange={e => setFormData({ ...formData, passportNo: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">Passport Validity:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.passportValidity} onChange={e => setFormData({ ...formData, passportValidity: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium">ID Presented:</label>
                      <select className="w-full border rounded px-3 py-2 mt-1" value={formData.idPresented} onChange={e => setFormData({ ...formData, idPresented: e.target.value })}>
                        <option value="">Select</option>
                        <option>Passport</option>
                        <option>UMID</option>
                        <option>SSS</option>
                        <option>Driver's License</option>
                        <option>Others</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium">ID Number:</label>
                      <input className="w-full border rounded px-3 py-2 mt-1" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">With Taiwan Work Experience:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.withTaiwanExp} onChange={e => setFormData({ ...formData, withTaiwanExp: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Taiwan Work Experience (Name of company with year started and ended):</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.taiwanExpDetails} onChange={e => setFormData({ ...formData, taiwanExpDetails: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">With Job Experience (Aside from Taiwan):</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.withJobExp} onChange={e => setFormData({ ...formData, withJobExp: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Name of company with year started and ended:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.jobExpDetails} onChange={e => setFormData({ ...formData, jobExpDetails: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Remarks:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Date Received by Region:</label>
                    <input className="w-full border rounded px-3 py-2 mt-1" value={formData.dateReceived} onChange={e => setFormData({ ...formData, dateReceived: e.target.value })} />
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={() => {
                      setRows([
                        ...rows,
                        {
                          lastName: formData.lastName,
                          firstName: formData.firstName,
                          middleName: formData.middleName,
                          sex: formData.sex,
                          taiwanExp: formData.withTaiwanExp,
                        },
                      ])
                      setModalOpen(false)
                      toast({
                        title: 'Applicant created successfully!',
                        description: 'The new Gov-to-Gov applicant has been added to the system.',
                      })
                    }}>Create</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 