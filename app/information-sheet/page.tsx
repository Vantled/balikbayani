"use client"

import { useEffect, useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { MoreHorizontal, Plus, Download, Search, X, Eye, FileText, Image as ImageIcon, FileArchive, File as FileIcon, Edit, Trash2, Filter, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"
import { useInformationSheet } from "@/hooks/use-information-sheet"
import DocumentViewerModal from "@/components/pdf-viewer-modal"
import FilterPanel from "@/components/filter-panel"
import PermissionGuard from "@/components/permission-guard"
import { uploadToS3 } from "@/lib/s3-client"
import ProcessingStatusCard from "@/components/processing-status-card";
import { TransactionHistory } from "@/components/transaction-history"

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
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<any | null>(null)
  // Handle login success toast
  useLoginSuccessToast()
  
  const { toast } = useToast()
  const { records, pagination, fetchRecords } = useInformationSheet()
  const [search, setSearch] = useState("")
  
  const [sexFilter, setSexFilter] = useState("")
  const [dateWithin, setDateWithin] = useState("")
  const [jobsiteFilter, setJobsiteFilter] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [includeDeleted, setShowDeletedOnly] = useState(false)
  const [purposeFilter, setPurposeFilter] = useState("")
  const [requestedRecordFilter, setRequestedRecordFilter] = useState("")
  const [appliedFilters, setAppliedFilters] = useState<any>({})
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [includeActive, setIncludeActive] = useState(true)
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
    documents: "",
    documentsOther: "",
    time_received: "",
    time_released: "",
  })
  const [selected, setSelected] = useState<any>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [documents, setDocuments] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string, name: string } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocType, setUploadDocType] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [editDocName, setEditDocName] = useState<string>("")
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<any>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState("")
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  

  // Fetch via hook - only when search text or applied filters change
  useEffect(() => {
    const filters = { search, ...appliedFilters }
    fetchRecords(filters)
  }, [search, appliedFilters, fetchRecords])

  // Load documents when opening view modal
  useEffect(() => {
    const load = async () => {
      if (!viewOpen || !selected?.id) return
      try {
        setDocsLoading(true)
        const res = await fetch(`/api/documents?applicationId=${selected.id}&applicationType=information_sheet`)
        const json = await res.json()
        if (json?.success) setDocuments(json.data)
      } finally {
        setDocsLoading(false)
      }
    }
    load()
  }, [viewOpen, selected])

  // Prefill time_received and time_released when form opens
  useEffect(() => {
    if (modalOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData(prev => ({
        ...prev,
        time_received: prev.time_received || localDateTime,
        time_released: prev.time_released || localDateTime
      }));
    }
  }, [modalOpen])

  return (
    <PermissionGuard permission="information_sheet" fallback={<div className="min-h-screen bg-[#eaf3fc]"><Header /></div>}>
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="px-6 pt-24 flex-1">
        <div>
              {/* Actions Bar */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-[#1976D2]">Information Sheet Requests</h2>
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                className="pl-8 pr-10 h-9 w-[20rem] bg-white" 
                placeholder="Search or key:value (e.g. name:John)" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
                    {/* Filter dropdown inside search input */}
                    <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          aria-label="Toggle filters"
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="p-0">
                        <div className="p-3 w-[360px] space-y-3">
                          {/* Sex */}
                          <div>
                            <div className="text-sm font-medium mb-1">Sex</div>
                            <div className="flex items-center gap-4 text-sm">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sex" checked={sexFilter===""} onChange={()=>setSexFilter("")} />All</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sex" checked={sexFilter==="female"} onChange={()=>setSexFilter("female")} />Female</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sex" checked={sexFilter==="male"} onChange={()=>setSexFilter("male")} />Male</label>
                            </div>
                          </div>
                          {/* Purpose */}
                          <div>
                            <div className="text-sm font-medium mb-1">Purpose</div>
                            <select className="w-full border rounded px-2 py-1 text-sm" value={purposeFilter} onChange={e=>setPurposeFilter(e.target.value)}>
                              <option value="">All</option>
                              <option value="employment">Employment</option>
                              <option value="owwa">OWWA</option>
                              <option value="legal">Legal</option>
                              <option value="loan">Loan</option>
                              <option value="visa">VISA</option>
                              <option value="balik_manggagawa">Balik Manggagawa</option>
                              <option value="reduced_travel_tax">Reduced Travel Tax</option>
                              <option value="philhealth">Philhealth</option>
                              <option value="others">Others</option>
                            </select>
                          </div>
                          {/* Requested Record */}
                          <div>
                            <div className="text-sm font-medium mb-1">Requested Record</div>
                            <select className="w-full border rounded px-2 py-1 text-sm" value={requestedRecordFilter} onChange={e=>setRequestedRecordFilter(e.target.value)}>
                              <option value="">All</option>
                              <option value="information_sheet">Information Sheet</option>
                              <option value="oec">OEC</option>
                              <option value="employment_contract">Employment Contract</option>
                            </select>
                          </div>
                          {/* Date Range */}
                          <div>
                            <div className="text-sm font-medium mb-1">Date Range</div>
                            <div className="flex items-center gap-2">
                              <input type="date" className="w-0 flex-1 min-w-0 border rounded px-2 py-1 text-sm" value={dateWithin.split('|')[0]||""} onChange={e=>setDateWithin(`${e.target.value}|${dateWithin.split('|')[1]||""}`)} />
                              <span className="text-gray-500">-</span>
                              <input type="date" className="w-0 flex-1 min-w-0 border rounded px-2 py-1 text-sm" value={dateWithin.split('|')[1]||""} onChange={e=>setDateWithin(`${dateWithin.split('|')[0]||""}|${e.target.value}`)} />
                            </div>
                          </div>
                          {/* Jobsite */}
                          <div>
                            <div className="text-sm font-medium mb-1">Jobsite</div>
                            <input className="w-full border rounded px-2 py-1 text-sm" value={jobsiteFilter} onChange={e=>setJobsiteFilter(e.target.value)} placeholder="Type jobsite" />
                          </div>
                          {/* Include deleted */}
                          <div className="flex items-center gap-2 text-sm">
                            <input id="include-deleted" type="checkbox" checked={includeDeleted} onChange={e=>setShowDeletedOnly(e.target.checked)} />
                            <label htmlFor="include-deleted">Include deleted</label>
                          </div>
                          {/* Include active */}
                          <div className="flex items-center gap-2 text-sm">
                            <input id="include-active" type="checkbox" checked={includeActive} onChange={e=>setIncludeActive(e.target.checked)} />
                            <label htmlFor="include-active">Include active/present</label>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 h-8" onClick={()=>{ 
                              setSexFilter(""); 
                              setPurposeFilter(""); 
                              setRequestedRecordFilter(""); 
                              setDateWithin(""); 
                              setJobsiteFilter(""); 
                              setShowDeletedOnly(false); 
                              setIncludeActive(true);
                              setAppliedFilters({});
                              setFilterMenuOpen(false);
                            }}>Clear</Button>
                            <Button className="flex-1 h-8 bg-[#1976D2] hover:bg-[#1565C0]" onClick={()=>{
                              const filters: any = {}
                              if (sexFilter) filters.sex = sexFilter
                              if (purposeFilter) filters.purpose = purposeFilter
                              if (requestedRecordFilter) filters.requested_record = requestedRecordFilter
                              if (includeDeleted) filters.include_deleted = true
                              if (includeActive === false) filters.include_active = false
                              if (jobsiteFilter) filters.jobsite = jobsiteFilter
                              if (positionFilter) filters.position = positionFilter
                              if (dateWithin && dateWithin.includes('|')) {
                                const [from, to] = dateWithin.split('|')
                                if (from) filters.date_from = from
                                if (to) filters.date_to = to
                              }
                              setAppliedFilters(filters)
                              setFilterMenuOpen(false)
                            }}>Search</Button>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white border-gray-300 h-9">
                        <Download className="h-4 w-4 mr-2" />
                        Export Sheet
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={async () => {
                        try {
                          const params = new URLSearchParams();
                          if (search) params.append('search', search);
                          if (appliedFilters.purpose) params.append('purpose', appliedFilters.purpose);
                          if (appliedFilters.worker_category) params.append('worker_category', appliedFilters.worker_category);
                          if (appliedFilters.sex) params.append('sex', appliedFilters.sex);
                          if (appliedFilters.jobsite) params.append('jobsite', appliedFilters.jobsite);
                          if (appliedFilters.requested_record) params.append('requested_record', appliedFilters.requested_record);
                          if (appliedFilters.date_from) params.append('date_from', appliedFilters.date_from);
                          if (appliedFilters.date_to) params.append('date_to', appliedFilters.date_to);
                          if (includeDeleted) params.append('include_deleted', 'true');
                          if (!includeActive) params.append('include_active', 'false');
                          
                          const response = await fetch(`/api/information-sheet/export?${params.toString()}`);
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
                            throw new Error(errorData.error || 'Export failed');
                          }
                          
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'information-sheet.xlsx';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Export successful",
                            description: "Information sheet exported to Excel",
                          });
                        } catch (error) {
                          console.error('Export failed:', error);
                          const errorMessage = error instanceof Error ? error.message : 'Failed to export information sheet';
                          toast({
                            title: "Export failed",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      }}>Export as Excel</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
              {/* Pagination (outside container) */}
              {pagination.total > 0 && (
                <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages: JSX.Element[] = []
                      const totalPages = pagination.totalPages
                      const currentPage = pagination.page

                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={i === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchRecords({ page: i, limit: pagination.limit, search })}
                              className="min-w-[40px] h-8"
                            >
                              {i}
                            </Button>
                          )
                        }
                      } else {
                        let startPage = Math.max(1, currentPage - 2)
                        let endPage = Math.min(totalPages, startPage + 4)
                        if (endPage - startPage < 4) {
                          startPage = Math.max(1, endPage - 4)
                        }

                        if (startPage > 1) {
                          pages.push(
                            <Button
                              key={1}
                              variant={1 === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchRecords({ page: 1, limit: pagination.limit, search })}
                              className="min-w-[40px] h-8"
                            >
                              1
                            </Button>
                          )
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipses-start" className="px-2 text-gray-500">...</span>
                            )
                          }
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={i === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchRecords({ page: i, limit: pagination.limit, search })}
                              className="min-w-[40px] h-8"
                            >
                              {i}
                            </Button>
                          )
                        }

                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <span key="ellipses-end" className="px-2 text-gray-500">...</span>
                            )
                          }
                          pages.push(
                            <Button
                              key={totalPages}
                              variant={totalPages === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchRecords({ page: totalPages, limit: pagination.limit, search })}
                              className="min-w-[40px] h-8"
                            >
                              {totalPages}
                            </Button>
                          )
                        }
                      }
                      return pages
                    })()}
                  </div>
                </div>
              )}
              

              {/* Table */}
                              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                        <th className="py-3 px-4 font-medium text-center">Last Name</th>
                        <th className="py-3 px-4 font-medium text-center">First Name</th>
                        <th className="py-3 px-4 font-medium text-center">Gender</th>
                        <th className="py-3 px-4 font-medium text-center">Purpose</th>
                        <th className="py-3 px-4 font-medium text-center">Requested Record</th>
                        <th className="py-3 px-4 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((row, i) => (
                        <tr 
                          key={i} 
                          className={`hover:bg-gray-150 transition-colors duration-75 select-none ${row.deleted_at ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          onDoubleClick={(e) => {
                            if (row.deleted_at) return; // disable double click for deleted
                            e.preventDefault();
                            setSelected(row);
                            setViewOpen(true);
                          }}
                        >
                          <td className="py-3 px-4 text-center">{row.family_name}</td>
                          <td className="py-3 px-4 text-center">{row.first_name}</td>
                          <td className="py-3 px-4 text-center">{String(row.gender || '').toUpperCase()}</td>
                          <td className="py-3 px-4 text-center">{String(row.purpose || '').toUpperCase()}</td>
                          <td className="py-3 px-4 text-center">{String(row.requested_record || '').replaceAll('_', ' ').toUpperCase()}</td>
                          <td className="py-3 px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-150">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {row.deleted_at ? (
                                  <>
                                    <DropdownMenuItem onClick={() => { setSelected(row); setRestoreConfirmOpen(true); setRestoreConfirmText("") }} className="text-green-600 focus:text-green-600">
                                      <RotateCcw className="h-4 w-4 mr-2 text-green-600" />
                                      Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={async () => { await fetch(`/api/information-sheet/${row.id}/permanent-delete`, { method: 'DELETE' }); fetchRecords({ ...appliedFilters, search }); }}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Permanently Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem onClick={() => { setSelected(row); setViewOpen(true) }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { 
                                      setSelected(row);
                                      const purposeMap: Record<string, string> = {
                                        employment: 'Employment',
                                        owwa: 'OWWA',
                                        legal: 'Legal',
                                        loan: 'Loan',
                                        visa: 'VISA',
                                        balik_manggagawa: 'Balik Manggagawa',
                                        reduced_travel_tax: 'Reduced Travel Tax',
                                        philhealth: 'Philhealth',
                                        others: 'Others',
                                      }
                                      const workerCategoryMap: Record<string, string> = {
                                        landbased_newhire: 'Landbased (Newhire)',
                                        rehire_balik_manggagawa: 'Rehire (Balik Manggagawa)',
                                        seafarer: 'Seafarer',
                                      }
                                      const requestedRecordMap: Record<string, string> = {
                                        information_sheet: 'Information Sheet',
                                        oec: 'OEC',
                                        employment_contract: 'Employment Contract',
                                      }
                                      const norm = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, '_')
                                      const genderLabel = (() => {
                                        const g = String(row.gender || '').toLowerCase()
                                        if (g === 'male' || g === 'female') return g.charAt(0).toUpperCase() + g.slice(1)
                                        return ''
                                      })()
                                      setEditForm({
                                        familyName: row.family_name || '',
                                        firstName: row.first_name || '',
                                        middleName: row.middle_name || '',
                                        gender: genderLabel,
                                        jobsite: row.jobsite || '',
                                        agency: row.name_of_agency || '',
                                        purpose: purposeMap[norm(row.purpose)] || '',
                                        purposeOther: row.purpose_others || '',
                                        workerCategory: workerCategoryMap[norm(row.worker_category)] || '',
                                        requestedRecord: requestedRecordMap[norm(row.requested_record)] || '',
                                        documents: (row.documents_presented && row.documents_presented[0]) || '',
                                        documentsOther: row.documents_others || ''
                                      }); 
                                      setEditOpen(true);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setSelected(row); setDeleteConfirmOpen(true) }}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="w-full md:w-[360px]">
                {(() => {
                  const fetchPurposeItems = async () => {
                    const purposes = [
                      { key: 'employment', label: 'Employment' },
                      { key: 'owwa', label: 'OWWA' },
                      { key: 'legal', label: 'Legal' },
                      { key: 'loan', label: 'Loan' },
                      { key: 'visa', label: 'VISA' },
                      { key: 'balik_manggagawa', label: 'Balik Manggagawa' },
                      { key: 'reduced_travel_tax', label: 'Reduced Travel Tax' },
                      { key: 'philhealth', label: 'Philhealth' },
                    ] as const
                    const resps = await Promise.all(purposes.map(p => fetch(`/api/information-sheet?purpose=${p.key}&page=1&limit=1`)))
                    const jsons = await Promise.all(resps.map(r => r.json()))
                    return purposes.map((p, idx) => ({
                      label: p.label,
                      value: jsons[idx]?.data?.pagination?.total ?? (jsons[idx]?.data?.data?.length ?? 0)
                    }))
                  }
                  const fetchRequestedRecordItems = async () => {
                    const records = [
                      { key: 'information_sheet', label: 'Information Sheet' },
                      { key: 'oec', label: 'OEC' },
                      { key: 'employment_contract', label: 'Employment Contract' },
                    ] as const
                    const resps = await Promise.all(records.map(r => fetch(`/api/information-sheet?requested_record=${r.key}&page=1&limit=1`)))
                    const jsons = await Promise.all(resps.map(r => r.json()))
                    return records.map((r, idx) => ({
                      label: r.label,
                      value: jsons[idx]?.data?.pagination?.total ?? (jsons[idx]?.data?.data?.length ?? 0)
                    }))
                  }
                  return (
                    <div className="flex flex-col gap-6">
                      <ProcessingStatusCard 
                        title="Overall Purpose"
                        verticalLayout={true}
                        chartHeight={200}
                        legendColumns={2}
                        fetchCustomItems={fetchPurposeItems}
                      />
                      <ProcessingStatusCard 
                        title="Overall Requested Records"
                        verticalLayout={true}
                        chartHeight={180}
                        fetchCustomItems={fetchRequestedRecordItems}
                      />
                    </div>
                  )
                })()}
              </div>
            </div>
          
        </div>
      </main>
      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent onInteractOutside={(e)=> e.preventDefault()} className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Information Sheet Fill Out Form</DialogTitle>
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
                  <label className="text-sm font-medium">Last Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.familyName} 
                    onChange={e => setFormData({ ...formData, familyName: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">First Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.firstName} 
                    onChange={e => setFormData({ ...formData, firstName: e.target.value.toUpperCase() })} 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Middle Name:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.middleName} 
                    onChange={e => setFormData({ ...formData, middleName: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Gender:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">---</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Jobsite:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.jobsite} 
                    onChange={e => setFormData({ ...formData, jobsite: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Name of Agency:</label>
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    value={formData.agency} 
                    onChange={e => setFormData({ ...formData, agency: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Purpose:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}>
                    <option value="">---</option>
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
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Worker Category:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.workerCategory} onChange={e => setFormData({ ...formData, workerCategory: e.target.value })}>
                    <option value="">---</option>
                    <option>Landbased (Newhire)</option>
                    <option>Rehire (Balik Manggagawa)</option>
                    <option>Seafarer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Requested Record:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={formData.requestedRecord} onChange={e => setFormData({ ...formData, requestedRecord: e.target.value })}>
                    <option value="">---</option>
                    <option>Information Sheet</option>
                    <option>OEC</option>
                    <option>Employment Contract</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Documents Presented:</label>
                <select className="w-full border rounded px-3 py-2 mt-1" value={formData.documents} onChange={e => setFormData({ ...formData, documents: e.target.value })}>
                  <option value="">---</option>
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
                {formData.documents === "Others" && (
                  <input 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    placeholder="Specify document" 
                    value={formData.documentsOther} 
                    onChange={e => setFormData({ ...formData, documentsOther: e.target.value.toUpperCase() })} 
                  />
                )}
              </div>
              {/* Time Received and Time Released */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Time Received:</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={formData.time_received}
                    onChange={(e) => setFormData({ ...formData, time_received: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time Released:</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={formData.time_released}
                    onChange={(e) => setFormData({ ...formData, time_released: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" className="px-6" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={async () => {
                  const payload = {
                    family_name: formData.familyName,
                    first_name: formData.firstName,
                    middle_name: formData.middleName || null,
                    gender: formData.gender?.toLowerCase(),
                    jobsite: formData.jobsite,
                    name_of_agency: formData.agency,
                    purpose: (formData.purpose === 'Others' ? 'others' : formData.purpose)?.toLowerCase().replaceAll(' ', '_'),
                    purpose_others: formData.purpose === 'Others' ? formData.purposeOther : undefined,
                    worker_category: formData.workerCategory?.toLowerCase().replaceAll(' ', '_').replace('(newhire)', 'newhire').replace('rehire_(balik_manggagawa)', 'rehire_balik_manggagawa'),
                    requested_record: formData.requestedRecord?.toLowerCase().replaceAll(' ', '_'),
                    documents_presented: formData.documents ? [formData.documents] : [],
                    documents_others: formData.documents === 'Others' ? formData.documentsOther : undefined,
                    time_received: formData.time_received || null,
                    time_released: formData.time_released || null,
                    // removed fields are omitted by backend defaults
                  } as any
                  // open confirm dialog before posting
                  setPendingPayload(payload as any)
                  setCreateConfirmOpen(true)
                }}>Create</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* View Modal */}

      {/* Confirm Create Dialog */}
      <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Create</AlertDialogTitle>
            <AlertDialogDescription>
              Create this new Information Sheet request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreateConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              setCreateConfirmOpen(false)
              const payload = pendingPayload || {}
              const res = await fetch('/api/information-sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
              const json = await res.json()
              if (json?.success) {
                setModalOpen(false)
                await fetchRecords({ page: pagination.page, limit: pagination.limit, search })
                toast({ title: 'Information sheet request created!', description: 'Your request has been submitted successfully.' })
              } else {
                toast({ title: 'Failed to create', description: json?.error || 'Please try again.', variant: 'destructive' as any })
              }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{selected ? `${selected.first_name} ${selected.family_name}` : 'Record'}'s Info Sheet Details</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selected && (
            <div className="px-8 py-6 overflow-y-auto flex-1">
              {/* Applicant Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Applicant Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Name:</div>
                    <div className="font-medium">{selected.family_name}, {selected.first_name} {selected.middle_name || ''}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Gender:</div>
                    <div className="font-medium">{String(selected.gender||'').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Jobsite:</div>
                    <div className="font-medium">{(selected.jobsite || '').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Agency:</div>
                    <div className="font-medium">{selected.name_of_agency}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Request Details */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Request Details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Purpose:</div>
                    <div className="font-medium">{String(selected.purpose||'').replaceAll('_',' ').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Worker Category:</div>
                    <div className="font-medium">{String(selected.worker_category||'').replaceAll('_',' ').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Requested Record:</div>
                    <div className="font-medium">{String(selected.requested_record||'').replaceAll('_',' ').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Documents Presented:</div>
                    <div className="font-medium">{(selected.documents_presented||[]).join(', ') || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Documents */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-700">Documents</div>
                  <Button size="sm" className="bg-[#1976D2] text-white" onClick={() => { setUploadDocType(""); setUploadFile(null); setUploadOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
                <div className="text-sm space-y-2">
                  {docsLoading ? (
                    <div className="text-gray-500">Loading documents...</div>
                  ) : (documents && documents.length ? (
                    documents.map((doc:any) => {
                      const extRaw = String(doc.file_name || '').split('.').pop()?.toLowerCase() || ''
                      const ext = extRaw.toUpperCase()
                      const extLower = String(doc.file_name || '').toLowerCase()
                      const isImage = /(\.jpg|\.jpeg|\.png|\.gif|\.bmp|\.webp)$/.test(extLower)
                      const isPdf = extLower.endsWith('.pdf')
                      const isDocx = extLower.endsWith('.docx') || String(doc.mime_type||'').includes('word')
                      const isZip = /(\.zip|\.rar|\.7z|\.tar|\.gz)$/.test(extLower)
                      const IconEl = isPdf ? FileText : isImage ? ImageIcon : isZip ? FileArchive : FileIcon
                      const displayName = (() => {
                        const raw = String(doc.document_type || '')
                        if (!raw) return String(doc.file_name || '')
                        const words = raw.replace(/[_-]/g,' ').split(' ').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
                        return extRaw ? `${words}.${extRaw}` : words
                      })()
                      return (
                        <div key={doc.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                          <div className="flex items-center gap-2">
                            <IconEl className={`h-4 w-4 ${isPdf ? 'text-red-600' : isImage ? 'text-teal-600' : isZip ? 'text-yellow-600' : 'text-gray-500'}`} />
                            {editingDocumentId === doc.id ? (
                              <div className="flex items-center gap-2">
                  <input 
                                  type="text"
                                  value={editDocName}
                                  onChange={e=>setEditDocName(e.target.value)}
                                  className="text-sm border rounded px-2 py-1"
                                  onKeyDown={async (e)=>{
                                    if(e.key==='Enter'){
                                      if(!editDocName.trim()) return
                                      const res = await fetch(`/api/documents/${doc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentName: editDocName.trim() }) })
                                      const json = await res.json()
                                      if(json?.success){
                                        setEditingDocumentId(null)
                                        setEditDocName("")
                                        setDocuments(prev => prev.map((d:any)=> d.id===doc.id ? { ...d, document_type: editDocName.trim() } : d ))
                                        setDocumentsRefreshTrigger(prev => prev + 1)
                                        toast({ title: 'Document updated', description: 'Document name has been updated' })
                                      } else {
                                        toast({ title: 'Update failed', description: json?.error || 'Please try again.', variant: 'destructive' as any })
                                      }
                                    } else if(e.key==='Escape'){
                                      setEditingDocumentId(null); setEditDocName("")
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button size="sm" className="h-7 px-3" onClick={async ()=>{
                                  if(!editDocName.trim()) return
                                  const res = await fetch(`/api/documents/${doc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentName: editDocName.trim() }) })
                                  const json = await res.json()
                                  if(json?.success){
                                    setEditingDocumentId(null)
                                    setEditDocName("")
                                    setDocuments(prev => prev.map((d:any)=> d.id===doc.id ? { ...d, document_type: editDocName.trim() } : d ))
                                    setDocumentsRefreshTrigger(prev => prev + 1)
                                    toast({ title: 'Document updated', description: 'Document name has been updated' })
                                  } else {
                                    toast({ title: 'Update failed', description: json?.error || 'Please try again.', variant: 'destructive' as any })
                                  }
                                }}>Save</Button>
                                <Button size="sm" variant="outline" className="h-7 px-3" onClick={()=>{ setEditingDocumentId(null); setEditDocName("") }}>Cancel</Button>
                </div>
                            ) : (
                              <span className="font-medium text-gray-800">{displayName}</span>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-150">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedDocument({ id: doc.id, name: doc.file_name }); setPdfViewerOpen(true) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/api/documents/${doc.id}/view`} target="_blank" rel="noreferrer" className="flex items-center">
                                  <Download className="h-4 w-4 mr-2" />
                                  {`Download ${ext || ''}`.trim()}
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingDocumentId(doc.id); setEditDocName(doc.document_type || '') }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Change Name
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setDocToDelete(doc); setDeleteDocConfirmOpen(true) }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-gray-500">No documents uploaded.</div>
                  ))}
                </div>
              </div>
              <hr className="my-4" />
              {/* Transaction History */}
              <div className="mb-6">
                <TransactionHistory
                  applicationType="information-sheet"
                  recordId={selected?.id ?? null}
                  refreshKey={documentsRefreshTrigger}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          documentId={selectedDocument?.id}
          documentName={selectedDocument?.name || ''}
        />
      )}

      {/* Delete Document Confirmation */}
      <AlertDialog open={deleteDocConfirmOpen} onOpenChange={setDeleteDocConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{docToDelete?.file_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!docToDelete) return
              const res = await fetch(`/api/documents/${docToDelete.id}`, { method: 'DELETE' })
              const json = await res.json()
              if (json?.success) {
                setDocuments(prev => prev.filter((d:any) => d.id !== docToDelete.id))
                setDocumentsRefreshTrigger(prev => prev + 1)
                setDeleteDocConfirmOpen(false)
                setDocToDelete(null)
                toast({ title: 'Document deleted', description: 'The document has been removed' })
              } else {
                toast({ title: 'Delete failed', description: json?.error || 'Please try again.', variant: 'destructive' as any })
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">Restore Application</AlertDialogTitle>
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 mb-2">
              <div className="font-semibold mb-1">✔ Restore Application</div>
              <div>You are about to restore the application for <strong>{`${String(selected?.first_name || '').toUpperCase()} ${String(selected?.family_name || '').toUpperCase()}`}</strong>.</div>
              <div className="mt-1">This will move the application back to the active applications list and make it available for editing and processing.</div>
            </div>
            <div className="text-sm font-medium text-gray-700 mb-2">Are you sure you want to restore this application?</div>
            <div className="text-sm text-gray-600">To confirm, please type <strong>RESTORE</strong> in the field below:</div>
                  <input 
              className="w-full border rounded px-3 py-2 mt-2"
              placeholder="Type RESTORE to confirm"
              value={restoreConfirmText}
              onChange={(e)=>setRestoreConfirmText(e.target.value)}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={()=>setRestoreConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreConfirmText.trim().toUpperCase() !== 'RESTORE'}
              className="bg-green-600 hover:bg-green-700"
              onClick={async ()=>{
                if (!selected) return
                await fetch(`/api/information-sheet/${selected.id}/restore`, { method: 'PUT' })
                setRestoreConfirmText("")
                setRestoreConfirmOpen(false)
                fetchRecords({ ...appliedFilters, search })
                toast({ title: 'Application restored', description: 'The application has been moved back to active items.' })
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document Name</label>
                  <input 
                type="text"
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                placeholder="Enter document name (e.g., Passport, Visa, Employment Contract)"
                    className="w-full border rounded px-3 py-2 mt-1" 
                  />
                </div>
            <div>
              <label className="text-sm font-medium">File</label>
                  <input 
                type="file"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full border rounded px-3 py-2 mt-1" 
                  />
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or PDF (Max 5MB)</p>
                </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
              <Button onClick={async () => {
                if (!selected?.id || !uploadFile || !uploadDocType.trim()) return
                try {
                  setUploading(true)
                  const fd = new FormData()
                  fd.append('file', uploadFile)
                  fd.append('applicationId', selected.id)
                  fd.append('applicationType', 'information_sheet')
                  // Backend expects 'documentType'; we pass the name here
                  fd.append('documentType', uploadDocType.trim())
                  const res = await fetch('/api/documents', { method: 'POST', body: fd })
                  const json = await res.json()
                  if (json?.success) {
                    setUploadOpen(false)
                    const r = await fetch(`/api/documents?applicationId=${selected.id}&applicationType=information_sheet`)
                    const j = await r.json()
                    if (j?.success) setDocuments(j.data)
                    setDocumentsRefreshTrigger(prev => prev + 1)
                    toast({ title: 'Document uploaded', description: 'Document has been uploaded successfully' })
                  } else {
                    toast({ title: 'Upload Error', description: json?.error || 'Upload failed', variant: 'destructive' as any })
                  }
                } finally {
                  setUploading(false)
                }
              }} disabled={uploading || !uploadFile || !uploadDocType.trim()} className="bg-[#1976D2] hover:bg-[#1565C0]">
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Edit Information Sheet</DialogTitle>
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
                  <label className="text-sm font-medium">Last Name:</label>
                  <input className="w-full border rounded px-3 py-2 mt-1" value={editForm.familyName||''} onChange={e=>setEditForm({...editForm, familyName:e.target.value.toUpperCase()})} />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">First Name:</label>
                  <input className="w-full border rounded px-3 py-2 mt-1" value={editForm.firstName||''} onChange={e=>setEditForm({...editForm, firstName:e.target.value.toUpperCase()})} />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Middle Name:</label>
                  <input className="w-full border rounded px-3 py-2 mt-1" value={editForm.middleName||''} onChange={e=>setEditForm({...editForm, middleName:e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Gender:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={editForm.gender||''} onChange={e=>setEditForm({...editForm, gender:e.target.value})}>
                    <option value="">---</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Jobsite:</label>
                  <input className="w-full border rounded px-3 py-2 mt-1" value={editForm.jobsite||''} onChange={e=>setEditForm({...editForm, jobsite:e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Name of Agency:</label>
                  <input className="w-full border rounded px-3 py-2 mt-1" value={editForm.agency||''} onChange={e=>setEditForm({...editForm, agency:e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Purpose:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={editForm.purpose||''} onChange={e=>setEditForm({...editForm, purpose:e.target.value})}>
                    <option value="">---</option>
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
                  {editForm.purpose === 'Others' && (
                    <input className="w-full border rounded px-3 py-2 mt-1" placeholder="Specify purpose" value={editForm.purposeOther||''} onChange={e=>setEditForm({...editForm, purposeOther:e.target.value.toUpperCase()})} />
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Worker Category:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={editForm.workerCategory||''} onChange={e=>setEditForm({...editForm, workerCategory:e.target.value})}>
                    <option value="">---</option>
                    <option>Landbased (Newhire)</option>
                    <option>Rehire (Balik Manggagawa)</option>
                    <option>Seafarer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Requested Record:</label>
                  <select className="w-full border rounded px-3 py-2 mt-1" value={editForm.requestedRecord||''} onChange={e=>setEditForm({...editForm, requestedRecord:e.target.value})}>
                    <option value="">---</option>
                    <option>Information Sheet</option>
                    <option>OEC</option>
                    <option>Employment Contract</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Documents Presented:</label>
                <select className="w-full border rounded px-3 py-2 mt-1" value={editForm.documents||''} onChange={e=>setEditForm({...editForm, documents:e.target.value})}>
                  <option value="">---</option>
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
                {editForm.documents === 'Others' && (
                  <input className="w-full border rounded px-3 py-2 mt-1" placeholder="Specify document" value={editForm.documentsOther||''} onChange={e=>setEditForm({...editForm, documentsOther:e.target.value.toUpperCase()})} />
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" className="px-6" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button className="bg-[#1976D2] text-white px-8" type="button" onClick={async () => {
                  if (!selected) return
                  const payload = {
                    family_name: editForm.familyName,
                    first_name: editForm.firstName,
                    middle_name: editForm.middleName || null,
                    gender: editForm.gender?.toLowerCase(),
                    jobsite: editForm.jobsite,
                    name_of_agency: editForm.agency,
                    purpose: (editForm.purpose === 'Others' ? 'others' : editForm.purpose)?.toLowerCase().replaceAll(' ', '_'),
                    purpose_others: editForm.purpose === 'Others' ? editForm.purposeOther : undefined,
                    worker_category: editForm.workerCategory?.toLowerCase().replaceAll(' ', '_').replace('(newhire)', 'newhire').replace('rehire_(balik_manggagawa)', 'rehire_balik_manggagawa'),
                    requested_record: editForm.requestedRecord?.toLowerCase().replaceAll(' ', '_'),
                    documents_presented: editForm.documents ? [editForm.documents] : [],
                    documents_others: editForm.documents === 'Others' ? editForm.documentsOther : undefined,
                  } as any
                  const res = await fetch(`/api/information-sheet/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  const json = await res.json()
                  if (json?.success) {
                    setEditOpen(false)
                    await fetchRecords({ page: pagination.page, limit: pagination.limit, search })
                    toast({ title: 'Record updated', description: 'Information sheet updated successfully.' })
                  } else {
                    toast({ title: 'Failed to update', description: json?.error || 'Please try again.', variant: 'destructive' as any })
                  }
                }}>Save</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the application for <strong>{`${String(selected?.first_name || '').toUpperCase()} ${String(selected?.family_name || '').toUpperCase()}`}</strong>? This will move the application to deleted items where it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!selected) return
              const res = await fetch(`/api/information-sheet/${selected.id}`, { method: 'DELETE' })
              const json = await res.json()
              if (json?.success) {
                setDeleteConfirmOpen(false)
                await fetchRecords({ page: pagination.page, limit: pagination.limit, search })
                toast({ title: 'Record deleted', description: 'Information sheet record deleted.' })
              } else {
                toast({ title: 'Failed to delete', description: json?.error || 'Please try again.', variant: 'destructive' as any })
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PermissionGuard>
  )
} 