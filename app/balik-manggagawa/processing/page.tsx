"use client"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { Filter, Plus, Download, Search, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBalikManggagawaProcessing } from "@/hooks/use-balik-manggagawa-processing"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const processingRows = [
  {
    orNo: "OR-2025-0001",
    name: "Reyes, Maria Clara",
    sex: "Female",
    address: "Makati, Metro Manila",
    destination: "UAE",
  },
  {
    orNo: "OR-2025-0002",
    name: "Lim, Roberto",
    sex: "Male",
    address: "Cebu City, Cebu",
    destination: "Qatar",
  },
  {
    orNo: "OR-2025-0003",
    name: "Gomez, Ana",
    sex: "Female",
    address: "Davao City, Davao del Sur",
    destination: "Kuwait",
  },
  {
    orNo: "OR-2025-0004",
    name: "Torres, Michael",
    sex: "Male",
    address: "Baguio City, Benguet",
    destination: "Hong Kong",
  },
  {
    orNo: "OR-2025-0005",
    name: "Navarro, Jose",
    sex: "Male",
    address: "Iloilo City, Iloilo",
    destination: "Greece",
  },
  {
    orNo: "OR-2025-0006",
    name: "Cruz, Angela",
    sex: "Female",
    address: "Quezon City, Metro Manila",
    destination: "Canada",
  },
  {
    orNo: "OR-2025-0007",
    name: "Delos Santos, Patricia Mae",
    sex: "Female",
    address: "Calamba, Laguna",
    destination: "Singapore",
  },
]

export default function BalikManggagawaProcessingPage() {
  const [showFilter, setShowFilter] = useState(false)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState(processingRows)
  const { records, loading, error, pagination, fetchRecords, createRecord, deleteRecord } = useBalikManggagawaProcessing()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formSex, setFormSex] = useState<'male' | 'female' | ''>("")
  const [formAddress, setFormAddress] = useState("")
  const [formDestination, setFormDestination] = useState("")
  const [orPreview, setOrPreview] = useState("")
  const [activeTab, setActiveTab] = useState("form1")
  const [validationErrors, setValidationErrors] = useState<{[k:string]: string}>({})

  const resetForm = () => { setFormName(""); setFormSex(""); setFormAddress(""); setFormDestination("") }

  useEffect(() => {
    if (isCreateOpen) {
      fetch('/api/balik-manggagawa/processing/preview').then(r=>r.json()).then(res=>{
        if (res?.success) setOrPreview(res.data.preview)
        else setOrPreview('')
      }).catch(()=> setOrPreview(''))
    }
  }, [isCreateOpen])

  const filteredRows = rows.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa - Processing</h2>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setShowFilter(!showFilter)}
                aria-label="Show filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
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
            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
              Create <Plus className="h-4 w-4" />
            </Button>
            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-1">Sex:</div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2"><input type="checkbox" /> Female</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Male</label>
                </div>
                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" />
                <div className="font-semibold mb-1">Destination</div>
                <Input type="text" className="mb-2" />
                <div className="font-semibold mb-1">Address</div>
                <Input type="text" className="mb-2" />
                <div className="flex justify-between gap-2 mt-2">
                  <Button variant="outline" className="w-1/2">Clear</Button>
                  <Button className="w-1/2 bg-[#1976D2] text-white">Search</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1976D2] text-white">
                <th className="py-3 px-4 font-medium">O.R. No.</th>
                <th className="py-3 px-4 font-medium">Name of Worker</th>
                <th className="py-3 px-4 font-medium">Sex</th>
                <th className="py-3 px-4 font-medium">Address</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="py-8 text-center text-red-500">{error}</td></tr>
              ) : (records.length ? records : []).map((row: any, i: number) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">{row.or_number}</td>
                  <td className="py-3 px-4 text-center">{row.name_of_worker}</td>
                  <td className="py-3 px-4 text-center capitalize">{row.sex}</td>
                  <td className="py-3 px-4 text-center">{row.address}</td>
                  <td className="py-3 px-4 text-center">{row.destination}</td>
                  <td className="py-3 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Download PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Processing Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) { resetForm(); setValidationErrors({}) } }}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl w-[95vw]">
          <DialogTitle className="sr-only">Processing Form</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Processing Form</h2>
          </div>
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="form1">Form 1</TabsTrigger>
                <TabsTrigger value="review">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="form1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>O.R. No. (Preview)</Label>
                    <Input value={orPreview || ''} disabled className="bg-gray-50 font-mono text-sm mt-1" />
                    <p className="text-xs text-gray-500 mt-1">This is a preview. The actual O.R. number will be generated upon creation.</p>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <Input value={formDestination} onChange={(e)=> setFormDestination(e.target.value.toUpperCase())} className="mt-1" placeholder="COUNTRY" />
                  </div>
                  <div>
                    <Label>Name of Worker</Label>
                    <Input value={formName} onChange={(e)=> setFormName(e.target.value.toUpperCase())} className="mt-1" placeholder="LAST, FIRST MIDDLE" />
                  </div>
                  <div>
                    <Label>Sex</Label>
                    <Select value={formSex} onValueChange={(v)=> setFormSex(v as 'male' | 'female')}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select sex" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Input value={formAddress} onChange={(e)=> setFormAddress(e.target.value.toUpperCase())} className="mt-1" placeholder="ADDRESS" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <Button variant="outline" onClick={() => {
                    try {
                      const key = `bm_processing_draft`
                      const payload = { formName, formSex, formAddress, formDestination }
                      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(payload))
                      toast({ title: 'Draft saved', description: 'Draft saved locally in this browser.' })
                    } catch {}
                  }}>Save as Draft</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm() }}>Cancel</Button>
                    <Button className="bg-[#1976D2] text-white px-8" onClick={() => {
                      if (!formName || !formSex || !formAddress || !formDestination) {
                        toast({ title: 'Missing fields', description: 'Please complete all fields.', variant: 'destructive' });
                        return;
                      }
                      setActiveTab('review')
                    }}>Next</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="review">
                <div className="grid gap-2 py-2 text-sm">
                  {orPreview && (<div className="flex justify-between"><span className="text-gray-600">O.R. No. (Preview)</span><span className="font-mono">{orPreview}</span></div>)}
                  <div className="flex justify-between"><span className="text-gray-600">Name</span><span>{formName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Sex</span><span className="capitalize">{formSex}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Address</span><span>{formAddress}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Destination</span><span>{formDestination}</span></div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('form1')}>Back</Button>
                    <Button className="bg-[#1976D2] text-white px-8" onClick={async () => {
                      const res = await createRecord({ nameOfWorker: formName, sex: formSex as any, address: formAddress, destination: formDestination })
                      if ((res as any).success) {
                        toast({ title: 'Created', description: 'Processing record created successfully.' })
                        setIsCreateOpen(false)
                        resetForm()
                      } else {
                        toast({ title: 'Error', description: (res as any).error || 'Failed to create', variant: 'destructive' })
                      }
                    }}>Create</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 