"use client"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { Filter, Plus, Download, Search, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
  const [pendingFilters, setPendingFilters] = useState({
    types: [
      'for_assessment_country',
      'non_compliant_country',
      'watchlisted_similar_name'
    ] as string[],
    sexes: [] as string[],
    dateFrom: '',
    dateTo: '',
    destination: '',
    address: ''
  })
  const [rows, setRows] = useState(processingRows)
  const { records, loading, error, pagination, fetchRecords, createRecord, deleteRecord, getProcessingById } = useBalikManggagawaProcessing()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formSex, setFormSex] = useState<'male' | 'female' | ''>("")
  const [formAddress, setFormAddress] = useState("")
  const [formDestination, setFormDestination] = useState("")
  const [orPreview, setOrPreview] = useState("")
  const [activeTab, setActiveTab] = useState("form1")
  const [validationErrors, setValidationErrors] = useState<{[k:string]: string}>({})
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [documentChecklist, setDocumentChecklist] = useState({
    personalLetter: { checked: false, file: null as File | null },
    validPassport: { checked: false, file: null as File | null },
    workVisa: { checked: false, file: null as File | null },
    employmentContract: { checked: false, file: null as File | null },
    employmentCertificate: { checked: false, file: null as File | null },
    lastArrivalEmail: { checked: false, file: null as File | null },
    flightTicket: { checked: false, file: null as File | null }
  })
  const [verificationDialog, setVerificationDialog] = useState({
    open: false,
    documentType: '',
    file: null as File | null
  })

  const resetForm = () => { setFormName(""); setFormSex(""); setFormAddress(""); setFormDestination("") }

  const handleFileSelect = (documentType: string, file: File) => {
    setVerificationDialog({
      open: true,
      documentType,
      file
    })
  }

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!selectedRecord?.id) {
      toast({ 
        title: 'Error', 
        description: 'No processing record selected.',
        variant: 'destructive'
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('documentType', documentType)
      formData.append('file', file)

      const response = await fetch(`/api/balik-manggagawa/processing/${selectedRecord.id}/documents`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setDocumentChecklist(prev => ({
          ...prev,
          [documentType]: { 
            ...prev[documentType as keyof typeof prev], 
            file,
            checked: true // Automatically check when verified and attached
          }
        }))
        toast({ 
          title: 'Document verified and attached', 
          description: `${file.name} has been verified and attached to the applicant.` 
        })
        
        // Refresh the records to update the status count
        fetchRecords()
      } else {
        toast({ 
          title: 'Upload failed', 
          description: result.error || 'Failed to upload document',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({ 
        title: 'Upload failed', 
        description: 'Failed to upload document',
        variant: 'destructive'
      })
    }
  }

  const handleCheckboxChange = (documentType: string, checked: boolean) => {
    const currentDoc = documentChecklist[documentType as keyof typeof documentChecklist]
    if (checked && !currentDoc.file) {
      toast({ 
        title: 'Document required', 
        description: 'Please attach a document before checking this item.',
        variant: 'destructive'
      })
      return
    }
    
    setDocumentChecklist(prev => ({
      ...prev,
      [documentType]: { ...prev[documentType as keyof typeof prev], checked }
    }))
    
    if (checked) {
      toast({ title: 'Document verified', description: 'Document has been marked as submitted.' })
    }
  }

  const confirmVerification = () => {
    if (verificationDialog.file && verificationDialog.documentType) {
      handleFileUpload(verificationDialog.documentType, verificationDialog.file)
    }
    setVerificationDialog({ open: false, documentType: '', file: null })
  }

  const cancelVerification = () => {
    setVerificationDialog({ open: false, documentType: '', file: null })
  }

  const checkDocumentsCompletion = async () => {
    const completedCount = Object.values(documentChecklist).filter(doc => doc.checked).length
    const requiredCount = selectedRecord?.clearance_type === 'watchlisted_similar_name' ? 1 : 7
    const isCompleted = completedCount >= requiredCount

    if (isCompleted && selectedRecord?.id) {
      try {
        const response = await fetch(`/api/balik-manggagawa/processing/${selectedRecord.id}/documents`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ documentsCompleted: true })
        })

        const result = await response.json()

        if (result.success) {
          toast({ 
            title: 'Processing Complete!', 
            description: 'All documents have been verified. Applicant has been moved to Clearance page.' 
          })
          
          // Close the modal and refresh the records
          setViewOpen(false)
          setSelectedRecord(null)
          fetchRecords()
        } else {
          toast({ 
            title: 'Error', 
            description: result.error || 'Failed to complete processing',
            variant: 'destructive'
          })
        }
      } catch (error) {
        toast({ 
          title: 'Error', 
          description: 'Failed to complete processing',
          variant: 'destructive'
        })
      }
    }
  }

  // Check completion whenever document checklist changes
  useEffect(() => {
    if (selectedRecord?.id) {
      checkDocumentsCompletion()
    }
  }, [documentChecklist])

  // Load existing document data when selectedRecord changes
  useEffect(() => {
    if (selectedRecord) {
      const existingDocuments = {
        personalLetter: { 
          checked: !!selectedRecord.personal_letter_file, 
          file: selectedRecord.personal_letter_file ? { name: selectedRecord.personal_letter_file } as File : null 
        },
        validPassport: { 
          checked: !!selectedRecord.valid_passport_file, 
          file: selectedRecord.valid_passport_file ? { name: selectedRecord.valid_passport_file } as File : null 
        },
        workVisa: { 
          checked: !!selectedRecord.work_visa_file, 
          file: selectedRecord.work_visa_file ? { name: selectedRecord.work_visa_file } as File : null 
        },
        employmentContract: { 
          checked: !!selectedRecord.employment_contract_file, 
          file: selectedRecord.employment_contract_file ? { name: selectedRecord.employment_contract_file } as File : null 
        },
        employmentCertificate: { 
          checked: !!selectedRecord.employment_certificate_file, 
          file: selectedRecord.employment_certificate_file ? { name: selectedRecord.employment_certificate_file } as File : null 
        },
        lastArrivalEmail: { 
          checked: !!selectedRecord.last_arrival_email_file, 
          file: selectedRecord.last_arrival_email_file ? { name: selectedRecord.last_arrival_email_file } as File : null 
        },
        flightTicket: { 
          checked: !!selectedRecord.flight_ticket_file, 
          file: selectedRecord.flight_ticket_file ? { name: selectedRecord.flight_ticket_file } as File : null 
        }
      }
      setDocumentChecklist(existingDocuments)
    }
  }, [selectedRecord])

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
          <div>
            <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa - Processing</h2>
            <p className="text-sm text-gray-600 mt-1">Track applicants who are still submitting required documents</p>
          </div>
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
            
            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-1">Types of Clearance:</div>
                <div className="grid grid-cols-1 gap-1 mb-2">
                  {[
                    { label: 'For Assessment Country', value: 'for_assessment_country' },
                    { label: 'Non Compliant Country', value: 'non_compliant_country' },
                    { label: 'Watchlisted OFW', value: 'watchlisted_similar_name' }
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pendingFilters.types.includes(opt.value)}
                        onChange={(e)=> {
                          setPendingFilters(prev => {
                            const set = new Set(prev.types)
                            if (e.target.checked) set.add(opt.value); else set.delete(opt.value)
                            return { ...prev, types: Array.from(set) }
                          })
                        }}
                      /> {opt.label}
                    </label>
                  ))}
                </div>
                <div className="font-semibold mb-1">Sex:</div>
                <div className="flex gap-4 mb-2">
                  {[
                    { label: 'Female', value: 'female' },
                    { label: 'Male', value: 'male' }
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pendingFilters.sexes.includes(opt.value)}
                        onChange={(e) => {
                          setPendingFilters(prev => {
                            const set = new Set(prev.sexes)
                            if (e.target.checked) set.add(opt.value); else set.delete(opt.value)
                            return { ...prev, sexes: Array.from(set) }
                          })
                        }}
                      /> {opt.label}
                    </label>
                  ))}
                </div>
                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" value={pendingFilters.dateFrom} onChange={(e)=> setPendingFilters(p=>({...p, dateFrom: e.target.value}))} />
                <Input type="date" className="mb-2" value={pendingFilters.dateTo} onChange={(e)=> setPendingFilters(p=>({...p, dateTo: e.target.value}))} />
                <div className="font-semibold mb-1">Destination</div>
                <Input type="text" className="mb-2" value={pendingFilters.destination} onChange={(e)=> setPendingFilters(p=>({...p, destination: e.target.value}))} />
                <div className="font-semibold mb-1">Address</div>
                <Input type="text" className="mb-2" value={pendingFilters.address} onChange={(e)=> setPendingFilters(p=>({...p, address: e.target.value}))} />
                <div className="flex justify-between gap-2 mt-2">
                  <Button variant="outline" className="w-1/2" onClick={() => {
                    setPendingFilters({ types: ['for_assessment_country','non_compliant_country','watchlisted_similar_name'], sexes: [], dateFrom: '', dateTo: '', destination: '', address: '' })
                    fetchRecords(1, pagination.limit, { search, types: ['for_assessment_country','non_compliant_country','watchlisted_similar_name'] })
                    setShowFilter(false)
                  }}>Clear</Button>
                  <Button className="w-1/2 bg-[#1976D2] text-white" onClick={() => {
                    fetchRecords(1, pagination.limit, {
                      search,
                      types: pendingFilters.types,
                      sexes: pendingFilters.sexes,
                      dateFrom: pendingFilters.dateFrom,
                      dateTo: pendingFilters.dateTo,
                      destination: pendingFilters.destination,
                      address: pendingFilters.address
                    })
                    setShowFilter(false)
                  }}>Apply</Button>
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
                <th className="py-3 px-4 font-medium">Control No.</th>
                <th className="py-3 px-4 font-medium">Name of Worker</th>
                <th className="py-3 px-4 font-medium">Sex</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-8 text-center text-red-500">{error}</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No processing records found</td></tr>
              ) : records.map((row: any, i: number) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">{row.clearance_control_number || row.or_number}</td>
                  <td className="py-3 px-4 text-center">{row.name_of_worker}</td>
                  <td className="py-3 px-4 text-center capitalize">{row.sex}</td>
                  <td className="py-3 px-4 text-center">{row.destination}</td>
                  <td className="py-3 px-4 text-center">
                    {row.clearance_type ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {row.clearance_type === 'for_assessment_country' ? 'For Assessment Country' : (row.clearance_type === 'non_compliant_country' ? 'Non Compliant Country' : (row.clearance_type === 'watchlisted_similar_name' ? 'Watchlisted OFW' : row.clearance_type))}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {row.clearance_type === 'watchlisted_similar_name' ? Math.min(1, row.documents_submitted || 0) + '/1' : (row.documents_submitted || 0) + '/7'} Submitted
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={async () => {
                        const result = await getProcessingById(row.id)
                        if (result.success) {
                          setSelectedRecord(result.data)
                          setViewOpen(true)
                        } else {
                          toast({ 
                            title: 'Error', 
                            description: result.error || 'Failed to fetch record details',
                            variant: 'destructive'
                          })
                        }
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
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

      {/* View Processing Modal */}
      <Dialog open={viewOpen} onOpenChange={(open) => { 
        setViewOpen(open); 
        if (!open) {
          setSelectedRecord(null)
          // Reset document checklist when modal is closed
          setDocumentChecklist({
            personalLetter: { checked: false, file: null },
            validPassport: { checked: false, file: null },
            workVisa: { checked: false, file: null },
            employmentContract: { checked: false, file: null },
            employmentCertificate: { checked: false, file: null },
            lastArrivalEmail: { checked: false, file: null },
            flightTicket: { checked: false, file: null }
          })
        }
      }}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {selectedRecord?.clearance_type === 'for_assessment_country' ? 'For Assessment Country Details' : (selectedRecord?.clearance_type === 'non_compliant_country' ? 'Non Compliant Country Details' : (selectedRecord?.clearance_type === 'watchlisted_similar_name' ? 'Watchlisted OFW Details' : 'Processing Details'))}
            </DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selectedRecord && (
            <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
              {/* Personal Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Personal Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <div className="text-gray-500">Control No.:</div>
                    <div className="font-medium">{selectedRecord.clearance_control_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Type:</div>
                    <div className="font-medium">{selectedRecord.clearance_type === 'for_assessment_country' ? 'For Assessment Country' : (selectedRecord.clearance_type === 'non_compliant_country' ? 'Non Compliant Country' : selectedRecord.clearance_type)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Name of Worker:</div>
                    <div className="font-medium">{selectedRecord.name_of_worker}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium capitalize">{selectedRecord.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Employer:</div>
                    <div className="font-medium">{selectedRecord.employer || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Destination:</div>
                    <div className="font-medium">{selectedRecord.destination}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Salary:</div>
                    <div className="font-medium">{selectedRecord.salary ? `$${selectedRecord.salary.toLocaleString()}` : 'N/A'}</div>
                  </div>
                  {selectedRecord.position && (
                    <div>
                      <div className="text-gray-500">Position:</div>
                      <div className="font-medium">{selectedRecord.position}</div>
                    </div>
                  )}
                  {selectedRecord.date_arrival && (
                    <div>
                      <div className="text-gray-500">Date of Arrival:</div>
                      <div className="font-medium">{new Date(selectedRecord.date_arrival).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                  )}
                  {selectedRecord.remarks && (
                    <div className="col-span-2">
                      <div className="text-gray-500">Remarks:</div>
                      <div className="font-medium">{selectedRecord.remarks}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator Line */}
              <hr className="border-gray-300 my-6" />

              {/* Documents Section */}
              <div>
                <div className="font-semibold text-gray-700 mb-2">Documents</div>
                {selectedRecord?.clearance_type === 'watchlisted_similar_name' ? (
                  <div className="space-y-3">
                    {/* Passport / Supporting Document (single requirement) */}
                    <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          checked={documentChecklist.validPassport.checked}
                          onCheckedChange={(checked) => handleCheckboxChange('validPassport', checked as boolean)}
                        />
                        <div>
                          <div className="font-medium">Passport / Supporting Document</div>
                          <div className="text-sm text-gray-500">Attach either a copy of passport or any supporting document</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {documentChecklist.validPassport.file && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <FileText className="h-4 w-4" />
                            <span className="text-xs">{documentChecklist.validPassport.file.name}</span>
                          </div>
                        )}
                      </div>
                      <label className="absolute inset-0 cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect('validPassport', file)
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                <div className="space-y-3">
                  {/* Personal Letter */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.personalLetter.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('personalLetter', checked as boolean)}
                      />
                      <div>
                        <div className="font-medium">Personal Letter requesting for clearance</div>
                        <div className="text-sm text-gray-500">Addressed to Secretary of Department of Migrant Workers</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.personalLetter.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.personalLetter.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('personalLetter', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Valid Passport */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.validPassport.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('validPassport', checked as boolean)}
                      />
                      <div className="font-medium">Valid passport</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.validPassport.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.validPassport.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('validPassport', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Work Visa */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.workVisa.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('workVisa', checked as boolean)}
                      />
                      <div className="font-medium">Work visa</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.workVisa.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.workVisa.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('workVisa', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Employment Contract */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.employmentContract.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('employmentContract', checked as boolean)}
                      />
                      <div className="font-medium">Employment Contract</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.employmentContract.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.employmentContract.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('employmentContract', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Employment Certificate */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.employmentCertificate.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('employmentCertificate', checked as boolean)}
                      />
                      <div className="font-medium">Employment Certificate</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.employmentCertificate.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.employmentCertificate.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('employmentCertificate', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Last Arrival Email */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.lastArrivalEmail.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('lastArrivalEmail', checked as boolean)}
                      />
                      <div>
                        <div className="font-medium">Last arrival in Philippines</div>
                        <div className="text-sm text-gray-500">Email from Bureau of Immigration</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.lastArrivalEmail.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.lastArrivalEmail.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('lastArrivalEmail', file)
                        }}
                      />
                    </label>
                  </div>

                  {/* Flight Ticket */}
                  <div className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={documentChecklist.flightTicket.checked}
                        onCheckedChange={(checked) => handleCheckboxChange('flightTicket', checked as boolean)}
                      />
                      <div className="font-medium">Flight Ticket</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {documentChecklist.flightTicket.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">{documentChecklist.flightTicket.file.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect('flightTicket', file)
                        }}
                      />
                    </label>
                  </div>
                </div>
                )}

                {/* Progress Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Documents submitted:</span>
                    <span className="font-medium">
                      {selectedRecord?.clearance_type === 'watchlisted_similar_name' 
                        ? `${Object.values(documentChecklist).filter(doc => doc.checked).length >= 1 ? 1 : 0} of 1`
                        : `${Object.values(documentChecklist).filter(doc => doc.checked).length} of 7`}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${selectedRecord?.clearance_type === 'watchlisted_similar_name' 
                          ? (Object.values(documentChecklist).filter(doc => doc.checked).length >= 1 ? 100 : 0)
                          : (Object.values(documentChecklist).filter(doc => doc.checked).length / 7) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <AlertDialog open={verificationDialog.open} onOpenChange={() => setVerificationDialog({ open: false, documentType: '', file: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Verify Document
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to attach <strong>{verificationDialog.file?.name}</strong> to the applicant.
              <br /><br />
              Please confirm that you have verified this document and it meets all requirements before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelVerification}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification} className="bg-blue-600 hover:bg-blue-700">
              Verify & Attach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 