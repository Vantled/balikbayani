"use client"

import { useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MoreHorizontal, Plus, Download, Search, X, BadgeCheck, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

const initialRecords = [
  {
    familyName: "Reyes",
    firstName: "Maria",
    middleName: "Clara",
    gender: "Female",
    jobsite: "UAE",
    agency: "GlobalCare Inc.",
    purpose: "Employment",
    workerCategory: "Landbased (Newhire)",
    requestedRecord: "Information Sheet",
    documents: ["Passport", "Company ID"],
    actionsTaken: "Print-Out",
    timeReceived: "09:00",
    timeReleased: "09:10",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Lim",
    firstName: "Roberto",
    middleName: "Santos",
    gender: "Male",
    jobsite: "Qatar",
    agency: "QatarWorks",
    purpose: "Legal",
    workerCategory: "Rehire (Balik Manggagawa)",
    requestedRecord: "OEC",
    documents: ["Passport", "NBI"],
    actionsTaken: "Copy of Original",
    timeReceived: "10:00",
    timeReleased: "10:15",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Gomez",
    firstName: "Ana",
    middleName: "Lopez",
    gender: "Female",
    jobsite: "Kuwait",
    agency: "Kuwait Solutions",
    purpose: "Loan",
    workerCategory: "Seafarer",
    requestedRecord: "Employment Contract",
    documents: ["Passport", "SSS"],
    actionsTaken: "Digital Image",
    timeReceived: "11:00",
    timeReleased: "11:20",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Torres",
    firstName: "Michael",
    middleName: "Dela Cruz",
    gender: "Male",
    jobsite: "Hong Kong",
    agency: "HK Domestic",
    purpose: "VISA",
    workerCategory: "Landbased (Newhire)",
    requestedRecord: "Information Sheet",
    documents: ["Passport", "Company ID"],
    actionsTaken: "Print-Out",
    timeReceived: "12:00",
    timeReleased: "12:10",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Navarro",
    firstName: "Jose",
    middleName: "Ramos",
    gender: "Male",
    jobsite: "Greece",
    agency: "Greek Shipping",
    purpose: "Employment",
    workerCategory: "Seafarer",
    requestedRecord: "OEC",
    documents: ["Passport", "Company ID"],
    actionsTaken: "Print-Out",
    timeReceived: "13:00",
    timeReleased: "13:10",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Cruz",
    firstName: "Angela",
    middleName: "Villanueva",
    gender: "Female",
    jobsite: "Canada",
    agency: "Canada Health",
    purpose: "Philhealth",
    workerCategory: "Landbased (Newhire)",
    requestedRecord: "Employment Contract",
    documents: ["Passport", "Company ID"],
    actionsTaken: "Print-Out",
    timeReceived: "14:00",
    timeReleased: "14:10",
    totalPct: "100%",
    remarks: "",
  },
  {
    familyName: "Delos Santos",
    firstName: "Patricia",
    middleName: "Mae",
    gender: "Female",
    jobsite: "Singapore",
    agency: "ABC Agency",
    purpose: "Employment",
    workerCategory: "Landbased (Newhire)",
    requestedRecord: "Information Sheet",
    documents: ["Passport", "Company ID"],
    actionsTaken: "Print-Out",
    timeReceived: "09:00",
    timeReleased: "09:10",
    totalPct: "100%",
    remarks: "",
  },
]

export default function InformationSheetPage() {
  // Handle login success toast
  useLoginSuccessToast()
  
  const { toast } = useToast()
  const [tab, setTab] = useState("today")
  const [records, setRecords] = useState(initialRecords)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    familyName: "",
    firstName: "",
    middleName: "",
    gender: "",
    jobsite: "",
    agency: "",
    purpose: "",
    purposeOther: "",
    workerCategory: "",
    requestedRecord: "",
    documents: [],
    documentsOther: "",
    actionsTaken: "",
    timeReceived: "",
    timeReleased: "",
    totalPct: "",
    remarks: "",
    remarksOther: "",
  })
  const [selected, setSelected] = useState<any>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [summaryMonth, setSummaryMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Statistics (simple demo, real logic would aggregate from records)
  const totalRequest = records.length
  const totalMale = records.filter(r => r.gender === "Male").length
  const totalFemale = records.filter(r => r.gender === "Female").length

  // For demo, assign all records to today
  const today = new Date()
  const daysInMonth = new Date(Number(summaryMonth.split('-')[0]), Number(summaryMonth.split('-')[1]), 0).getDate()
  const summaryData = Array.from({ length: daysInMonth }, (_, i) => {
    // For demo, all records are on today
    const day = i + 1
    const recordsForDay = records.filter(() => day === today.getDate())
    return {
      total: recordsForDay.length,
      male: recordsForDay.filter(r => r.gender === 'Male').length,
      female: recordsForDay.filter(r => r.gender === 'Female').length,
      pct: recordsForDay.map(r => parseInt(r.totalPct)).filter(Boolean),
      employment: recordsForDay.filter(r => r.purpose === 'Employment').length,
      owwa: recordsForDay.filter(r => r.purpose === 'OWWA').length,
      legal: recordsForDay.filter(r => r.purpose === 'Legal').length,
      loan: recordsForDay.filter(r => r.purpose === 'Loan').length,
      visa: recordsForDay.filter(r => r.purpose === 'VISA').length,
      bm: recordsForDay.filter(r => r.purpose === 'Balik Manggagawa').length,
      rtt: recordsForDay.filter(r => r.purpose === 'Reduced Travel Tax').length,
      philhealth: recordsForDay.filter(r => r.purpose === 'Philhealth').length,
      others: recordsForDay.filter(r => !['Employment','OWWA','Legal','Loan','VISA','Balik Manggagawa','Reduced Travel Tax','Philhealth'].includes(r.purpose)).length,
      landbased: recordsForDay.filter(r => r.workerCategory === 'Landbased (Newhire)').length,
      rehire: recordsForDay.filter(r => r.workerCategory === 'Rehire (Balik Manggagawa)').length,
      seafarer: recordsForDay.filter(r => r.workerCategory === 'Seafarer').length,
      infoSheet: recordsForDay.filter(r => r.requestedRecord === 'Information Sheet').length,
      oec: recordsForDay.filter(r => r.requestedRecord === 'OEC').length,
      contract: recordsForDay.filter(r => r.requestedRecord === 'Employment Contract').length,
    }
  })

  // Filter records based on search
  const filteredRecords = records.filter(record =>
    Object.values(record).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="px-6 pt-24">
        <div>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full flex mb-6">
              <TabsTrigger value="today" className={`flex-1 ${tab === 'today' ? '!bg-white !text-[#1976D2]' : ''}`}>Today</TabsTrigger>
              <TabsTrigger value="summary" className={`flex-1 ${tab === 'summary' ? '!bg-white !text-[#1976D2]' : ''}`}>This Month</TabsTrigger>
            </TabsList>
            <TabsContent value="today">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                  <div className="text-2xl font-bold text-[#1976D2]">{filteredRecords.length}</div>
                  <div className="text-xs text-gray-500">Total Request</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                  <div className="text-2xl font-bold text-[#1976D2]">{filteredRecords.filter(r => r.gender === "Male").length}</div>
                  <div className="text-xs text-gray-500">Total Male</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                  <div className="text-2xl font-bold text-[#1976D2]">{filteredRecords.filter(r => r.gender === "Female").length}</div>
                  <div className="text-xs text-gray-500">Total Female</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                  <div className="text-2xl font-bold text-[#1976D2]">{filteredRecords.filter(r => r.purpose === 'Employment').length}</div>
                  <div className="text-xs text-gray-500">Employment Purpose</div>
                </div>
              </div>
              {/* Actions Bar */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-[#1976D2]">Information Sheet Requests</h2>
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value" 
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
                  <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
              {/* Table */}
              <div className="bg-white rounded-md border overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                        <th className="py-3 px-4 font-medium text-center">Family Name</th>
                        <th className="py-3 px-4 font-medium text-center">First Name</th>
                        <th className="py-3 px-4 font-medium text-center">Gender</th>
                        <th className="py-3 px-4 font-medium text-center">Purpose</th>
                        <th className="py-3 px-4 font-medium text-center">Requested Record</th>
                        <th className="py-3 px-4 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredRecords.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-center">{row.familyName}</td>
                          <td className="py-3 px-4 text-center">{row.firstName}</td>
                          <td className="py-3 px-4 text-center">{row.gender}</td>
                          <td className="py-3 px-4 text-center">{row.purpose}</td>
                          <td className="py-3 px-4 text-center">{row.requestedRecord}</td>
                          <td className="py-3 px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelected(row); setViewOpen(true) }}>View</DropdownMenuItem>
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
            </TabsContent>
            <TabsContent value="summary">
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Month:</label>
                <input type="month" className="border rounded px-2 py-1" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} />
              </div>
              <div className="bg-white rounded-md border overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full min-w-[900px] text-xs">
                  <thead>
                    <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                      <th className="py-2 px-3 font-medium text-center w-48">Metric</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="py-2 px-3 font-medium text-center">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50">
                      <td className="py-2 px-3 font-semibold text-gray-700">Total Request</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.total}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-gray-700">Male</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.male}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-gray-700">Female</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.female}</td>)}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 px-3 font-semibold text-gray-700">Highest PCT</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.pct.length ? Math.max(...d.pct) + '%' : '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-gray-700">Lowest PCT</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.pct.length ? Math.min(...d.pct) + '%' : '-'}</td>)}
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan={daysInMonth + 1} className="text-left font-bold text-[#1976D2] py-2 px-3">Purpose Breakdown</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Employment</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.employment}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">OWWA</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.owwa}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Legal</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.legal}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Loan</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.loan}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">VISA</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.visa}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Balik Manggagawa</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.bm}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Reduced Travel Tax</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.rtt}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Philhealth</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.philhealth}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Others</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.others}</td>)}
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan={daysInMonth + 1} className="text-left font-bold text-[#1976D2] py-2 px-3">Worker Category</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Land Based</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.landbased}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Rehire</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.rehire}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Seafarer</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.seafarer}</td>)}
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan={daysInMonth + 1} className="text-left font-bold text-[#1976D2] py-2 px-3">Requested Records</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Information Sheet</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.infoSheet}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">OEC</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.oec}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Employment Contract</td>
                      {summaryData.map((d, i) => <td key={i} className="text-center">{d.contract}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Create Information Sheet Request</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
            <form className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium">Family Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.familyName} 
                    onChange={e => setFormData({ ...formData, familyName: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">First Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.firstName} 
                    onChange={e => setFormData({ ...formData, firstName: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Middle Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.middleName} 
                    onChange={e => setFormData({ ...formData, middleName: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium">Gender:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Jobsite:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.jobsite} 
                    onChange={e => setFormData({ ...formData, jobsite: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Name of Agency:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.agency} 
                    onChange={e => setFormData({ ...formData, agency: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium">Purpose:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}>
                    <option value="">Select</option>
                    <option>Employment</option>
                    <option>OWWA</option>
                    <option>Legal</option>
                    <option>Loan</option>
                    <option>VISA</option>
                    <option>Balik Manggagawa</option>
                    <option>Reduced Travel Tax</option>
                    <option>Philhealth</option>
                    <option>Others</option>
                  </select>
                  {formData.purpose === "Others" && (
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      placeholder="Specify purpose" 
                      value={formData.purposeOther} 
                      onChange={e => setFormData({ ...formData, purposeOther: e.target.value.toUpperCase() })} 
                    />
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Worker Category:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.workerCategory} onChange={e => setFormData({ ...formData, workerCategory: e.target.value })}>
                    <option value="">Select</option>
                    <option>Landbased (Newhire)</option>
                    <option>Rehire (Balik Manggagawa)</option>
                    <option>Seafarer</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Requested Record:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.requestedRecord} onChange={e => setFormData({ ...formData, requestedRecord: e.target.value })}>
                    <option value="">Select</option>
                    <option>Information Sheet</option>
                    <option>OEC</option>
                    <option>Employment Contract</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Documents Presented:</label>
                <select multiple className="w-full border rounded px-3 py-2 mt-1" value={formData.documents} onChange={e => setFormData({ ...formData, documents: Array.from(e.target.selectedOptions, option => option.value) })}>
                  <option>Company ID</option>
                  <option>Passport</option>
                  <option>SSRB</option>
                  <option>NBI</option>
                  <option>SSS</option>
                  <option>Marriage Certificate</option>
                  <option>Birth Certificate</option>
                  <option>Authorization</option>
                  <option>Special Power of Attorney</option>
                  <option>Letter Request</option>
                  <option>Others</option>
                </select>
                {formData.documents.includes("Others") && (
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    placeholder="Specify document" 
                    value={formData.documentsOther} 
                    onChange={e => setFormData({ ...formData, documentsOther: e.target.value.toUpperCase() })} 
                  />
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium">Actions Taken:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.actionsTaken} 
                    onChange={e => setFormData({ ...formData, actionsTaken: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Time Received:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.timeReceived} 
                    onChange={e => setFormData({ ...formData, timeReceived: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Time Released:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.timeReleased} 
                    onChange={e => setFormData({ ...formData, timeReleased: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium">TOTAL PCT:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.totalPct} 
                    onChange={e => setFormData({ ...formData, totalPct: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Remarks:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })}>
                    <option value="">Select</option>
                    <option>Server error</option>
                    <option>Printer Error</option>
                    <option>Re-verification</option>
                    <option>Photocopy ID/Requirements</option>
                    <option>Others</option>
                  </select>
                  {formData.remarks === "Others" && (
                    <input 
                      className="w-full border rounded px-3 py-2 mt-1" 
                      placeholder="Specify remark" 
                      value={formData.remarksOther} 
                      onChange={e => setFormData({ ...formData, remarksOther: e.target.value.toUpperCase() })} 
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={() => {
                  setRecords([
                    ...records,
                    {
                      ...formData,
                      documents: formData.documents,
                      purpose: formData.purpose === "Others" ? formData.purposeOther : formData.purpose,
                      remarks: formData.remarks === "Others" ? formData.remarksOther : formData.remarks,
                    },
                  ])
                  setModalOpen(false)
                  toast({
                    title: "Information sheet request created!",
                    description: "Your request has been submitted successfully.",
                  })
                }}>Create</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 