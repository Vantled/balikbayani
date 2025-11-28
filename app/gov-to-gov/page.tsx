"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MoreHorizontal, Plus, Download, Search, X, FileText, Eye, Edit, Trash2, File, Image as ImageIcon, FileArchive, Loader2, RotateCcw, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/shared/header"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"
import PermissionGuard from "@/components/permission-guard"
import { useGovToGov } from "@/hooks/use-gov-to-gov"
import DocumentViewerModal from "@/components/pdf-viewer-modal"
import { TransactionHistory } from "@/components/transaction-history"

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
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{id: string, name: string} | null>(null)
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState("")
  const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false)
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("")
  const [applicationToDelete, setApplicationToDelete] = useState<any | null>(null)
  const [releaseCardConfirmOpen, setReleaseCardConfirmOpen] = useState(false)
  
  // Filter states
  const [sexFilter, setSexFilter] = useState("")
  const [dateWithin, setDateWithin] = useState("")
  const [educationFilter, setEducationFilter] = useState("")
  const [taiwanExpFilter, setTaiwanExpFilter] = useState("")
  const [includeActive, setIncludeActive] = useState(true)
  const [appliedFilters, setAppliedFilters] = useState<any>({})
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  
  const { items, loading, pagination, refresh, create, update, remove } = useGovToGov(appliedFilters)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit] = useState(10)
  
  // Update applied filters with pagination
  useEffect(() => {
    setAppliedFilters(prev => ({
      ...prev,
      page: currentPage,
      limit: pageLimit
    }))
  }, [currentPage, pageLimit])
  
  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    setCurrentPage(1)
  }, [appliedFilters.search, appliedFilters.sex, appliedFilters.educational_attainment, appliedFilters.with_taiwan_work_experience, appliedFilters.date_from, appliedFilters.date_to, appliedFilters.include_deleted, appliedFilters.include_active])
  
  // Refresh data when filters change
  useEffect(() => {
    refresh()
  }, [appliedFilters, refresh])

  // Update applied filters when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppliedFilters(prev => ({
        ...prev,
        search: search.trim() || undefined
      }))
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
  }, [search])

  // Set time_received automatically when modal opens (for new applications only)
  useEffect(() => {
    if (modalOpen && !editingId) {
      // Set time_received to current timestamp when modal opens
      const timeReceived = new Date().toISOString();
      setFormData(prev => ({
        ...prev,
        time_received: prev.time_received || timeReceived,
        // Don't set time_released here - it will be set when application is submitted
        time_released: ""
      }));
    }
  }, [modalOpen, editingId])
  const [formStep, setFormStep] = useState(1)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    lastName: "",
    firstName: "",
    middleName: "",
    sex: "",
    dob: "",
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
    time_received: "",
    time_released: "",
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // Validate Basic Information step
  const validateBasicInfo = (notify: boolean) => {
    const missing: string[] = []
    const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === ''
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')
    const phoneValid = /^09\d{9}$/.test(formData.contact || '')
    if (isEmpty(formData.lastName)) missing.push('Last Name')
    if (isEmpty(formData.firstName)) missing.push('First Name')
    if (isEmpty(formData.middleName)) missing.push('Middle Name')
    if (isEmpty(formData.sex)) missing.push('Sex')
    if (isEmpty(formData.dob)) missing.push('Date of Birth')
    if (isEmpty(formData.height)) missing.push('Height')
    if (isEmpty(formData.weight)) missing.push('Weight')
    if (isEmpty(formData.education)) missing.push('Educational Attainment')
    if (isEmpty(formData.address)) missing.push('Present Address')
    if (!emailValid) missing.push('Valid Email Address')
    if (!phoneValid) missing.push('Valid Cellphone No.')
    if (missing.length > 0 && notify) {
      toast({ title: 'Incomplete Basic Information', description: `Please complete: ${missing[0]}`, variant: 'destructive' })
    }
    return missing.length === 0
  }

  // Search is now handled by backend through appliedFilters

  return (
    <PermissionGuard permission="gov_to_gov" fallback={<div className="min-h-screen bg-[#eaf3fc]"><Header /></div>}>
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      {/* Main Content */}
      <main className="p-6 pt-24 flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Government to Government Monitoring Table</h2>
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
                    {/* Educational Attainment */}
                    <div>
                      <div className="text-sm font-medium mb-1">Educational Attainment</div>
                      <select className="w-full border rounded px-2 py-1 text-sm" value={educationFilter} onChange={e=>setEducationFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="POST GRADUATE">POST GRADUATE</option>
                        <option value="COLLEGE GRADUATE">COLLEGE GRADUATE</option>
                        <option value="VOCATIONAL GRADUATE">VOCATIONAL GRADUATE</option>
                        <option value="COLLEGE LEVEL">COLLEGE LEVEL</option>
                        <option value="HIGH SCHOOL GRADUATE">HIGH SCHOOL GRADUATE</option>
                      </select>
                    </div>
                    {/* Taiwan Work Experience */}
                    <div>
                      <div className="text-sm font-medium mb-1">Taiwan Work Experience</div>
                      <div className="flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="taiwanExp" checked={taiwanExpFilter===""} onChange={()=>setTaiwanExpFilter("")} />All</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="taiwanExp" checked={taiwanExpFilter==="true"} onChange={()=>setTaiwanExpFilter("true")} />Yes</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="taiwanExp" checked={taiwanExpFilter==="false"} onChange={()=>setTaiwanExpFilter("false")} />No</label>
                      </div>
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
                    {/* Include deleted */}
                    <div className="flex items-center gap-2 text-sm">
                      <input id="include-deleted" type="checkbox" checked={showDeletedOnly} onChange={e=>setShowDeletedOnly(e.target.checked)} />
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
                        setEducationFilter(""); 
                        setTaiwanExpFilter("");
                        setDateWithin(""); 
                        setShowDeletedOnly(false); 
                        setIncludeActive(true);
                        setAppliedFilters({});
                        setFilterMenuOpen(false);
                      }}>Clear</Button>
                      <Button className="flex-1 h-8 bg-[#1976D2] hover:bg-[#1565C0]" onClick={()=>{
                        const filters: any = {}
                        if (sexFilter) filters.sex = sexFilter
                        if (educationFilter) filters.educational_attainment = educationFilter
                        if (taiwanExpFilter) filters.with_taiwan_work_experience = taiwanExpFilter === 'true'
                        
                        // Handle the include_active and include_deleted logic
                        if (!includeActive && !showDeletedOnly) {
                          // Both unchecked - show nothing
                          filters.include_active = false
                          filters.include_deleted = false
                        } else if (!includeActive && showDeletedOnly) {
                          // Only deleted checked - show only deleted
                          filters.include_active = false
                          filters.include_deleted = true
                        } else if (includeActive && showDeletedOnly) {
                          // Both checked - show all
                          filters.include_deleted = true
                        } else {
                          // Only active checked (default) - show only active
                          // No need to set anything, defaults to active only
                        }
                        
                        if (dateWithin && dateWithin.includes('|')) {
                          const [from, to] = dateWithin.split('|')
                          if (from) filters.date_from = from
                          if (to) filters.date_to = to
                        }
                        setAppliedFilters(filters)
                        setFilterMenuOpen(false)
                      }}>Apply</Button>
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
                    if (appliedFilters.sex) params.append('sex', appliedFilters.sex);
                    if (appliedFilters.educational_attainment) params.append('educational_attainment', appliedFilters.educational_attainment);
                    if (appliedFilters.with_taiwan_work_experience !== undefined) params.append('with_taiwan_work_experience', String(appliedFilters.with_taiwan_work_experience));
                    if (appliedFilters.date_from) params.append('date_from', appliedFilters.date_from);
                    if (appliedFilters.date_to) params.append('date_to', appliedFilters.date_to);
                    if (showDeletedOnly) params.append('include_deleted', 'true');
                    if (!includeActive) params.append('include_active', 'false');
                    
                    const response = await fetch(`/api/gov-to-gov/export?${params.toString()}`);
                    if (!response.ok) throw new Error('Export failed');
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'gov-to-gov.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Export successful",
                      description: "Gov-to-Gov data exported to Excel",
                    });
                  } catch (error) {
                    console.error('Export failed:', error);
                    toast({
                      title: "Export failed",
                      description: "Failed to export gov-to-gov data",
                      variant: "destructive",
                    });
                  }
                }}>Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={() => { setModalOpen(true); setFormStep(1); setFormData({ lastName: '', firstName: '', middleName: '', sex: '', dob: '', height: '', weight: '', education: '', address: '', email: '', contact: '', passportNo: '', passportValidity: '', idPresented: '', idNumber: '', withTaiwanExp: '', taiwanExpDetails: '', withJobExp: '', jobExpDetails: '', remarks: '', dateReceived: '' }) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
        
        {/* Pagination Controls - Outside table container */}
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <div>
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total || 0} total records)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(() => {
              const pages: any[] = []
              const totalPages = pagination.totalPages || 1
              const currentPageNum = pagination.page || 1
              const go = (p: number) => {
                setCurrentPage(p)
              }

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <Button 
                      key={i} 
                      variant={i === currentPageNum ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => go(i)} 
                      className="min-w-[40px] h-8"
                      disabled={loading}
                    >
                      {i}
                    </Button>
                  )
                }
              } else {
                let startPage = Math.max(1, currentPageNum - 2)
                let endPage = Math.min(totalPages, currentPageNum + 2)

                if (startPage > 1) {
                  pages.push(
                    <Button key={1} variant="outline" size="sm" onClick={() => go(1)} className="min-w-[40px] h-8" disabled={loading}>1</Button>
                  )
                  if (startPage > 2) {
                    pages.push(<span key="ellipsis1" className="px-2">...</span>)
                  }
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button 
                      key={i} 
                      variant={i === currentPageNum ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => go(i)} 
                      className="min-w-[40px] h-8"
                      disabled={loading}
                    >
                      {i}
                    </Button>
                  )
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(<span key="ellipsis2" className="px-2">...</span>)
                  }
                  pages.push(
                    <Button key={totalPages} variant="outline" size="sm" onClick={() => go(totalPages)} className="min-w-[40px] h-8" disabled={loading}>{totalPages}</Button>
                  )
                }
              }

              return pages
            })()}
          </div>
        </div>
        
        <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  items.map((row: any) => (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-gray-150 transition-colors duration-75 select-none ${row.deleted_at ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    onDoubleClick={() => {
                      if (row.deleted_at) return; // disable double click for deleted
                      setSelected(row)
                      setViewOpen(true)
                    }}
                    >
                    <td className="py-3 px-4 text-center">
                      {row.last_name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.first_name}
                      {row.applicant_user_id && (
                        <div className="mt-1 inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Applicant
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{row.middle_name}</td>
                    <td className="py-3 px-4 text-center">{String(row.sex).toUpperCase()}</td>
                    <td className="py-3 px-4 text-center">{row.with_taiwan_work_experience ? 'YES' : 'NO'}</td>
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
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { 
                                setApplicationToDelete(row)
                                setPermanentDeleteConfirmOpen(true)
                                setPermanentDeleteConfirmText("")
                              }}>
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
                                setEditingId(row.id)
                                setFormData({
                                  lastName: row.last_name || '',
                                  firstName: row.first_name || '',
                                  middleName: row.middle_name || '',
                                  sex: String(row.sex || '').toLowerCase() === 'female' ? 'Female' : 'Male',
                                  dob: row.date_of_birth ? String(row.date_of_birth).slice(0,10) : '',
                                  height: row.height ?? '',
                                  weight: row.weight ?? '',
                                  education: row.educational_attainment || '',
                                  address: row.present_address || '',
                                  email: row.email_address || '',
                                  contact: row.contact_number || '',
                                  passportNo: row.passport_number || '',
                                  passportValidity: row.passport_validity ? String(row.passport_validity).slice(0,10) : '',
                                  idPresented: row.id_presented || '',
                                  idNumber: row.id_number || '',
                                  withTaiwanExp: row.with_taiwan_work_experience ? 'YES' : 'NO',
                                  taiwanCompany: row.taiwan_company || '',
                                  taiwanYearStarted: row.taiwan_year_started || '',
                                  taiwanYearEnded: row.taiwan_year_ended || '',
                                  withJobExp: row.with_job_experience ? 'YES' : 'NO',
                                  otherCompany: row.other_company || '',
                                  otherYearStarted: row.other_year_started || '',
                                  otherYearEnded: row.other_year_ended || '',
                                  remarks: row.remarks || '',
                                })
                                setFormStep(1)
                                setModalOpen(true)
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => { setSelected(row); setDeleteConfirmOpen(true) }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent onInteractOutside={(e)=> e.preventDefault()} className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-medium flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {editingId ? 'Edit Application' : 'Fill Out Form'}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <div className="max-h-[80vh] overflow-y-auto">
            {/** Validation helpers */}
            {(() => null)()}
            {/* Sticky tabs */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
              <Tabs value={`form${formStep}`} onValueChange={(v) => {
                if (v === 'form2') { if (validateBasicInfo(true)) setFormStep(2) } else { setFormStep(1) }
              }} className="w-full">
                <TabsList className="w-full flex px-6 bg-transparent rounded-none p-0 gap-0 shadow-none border-0">
                  <TabsTrigger value="form1" className={`flex-1 ${formStep === 1 ? '!text-[#1976D2] border-b-2 border-[#1976D2]' : 'text-gray-600'}`}>Basic Information</TabsTrigger>
                  <TabsTrigger value="form2" disabled={!validateBasicInfo(false)} className={`flex-1 ${formStep === 2 ? '!text-[#1976D2] border-b-2 border-[#1976D2]' : 'text-gray-600'} ${!validateBasicInfo(false) ? 'opacity-60 cursor-not-allowed' : ''}`}>Other Information</TabsTrigger>
              </TabsList>
              </Tabs>
            </div>
            <Tabs value={`form${formStep}`} onValueChange={(v) => { if (v === 'form2') { if (validateBasicInfo(true)) setFormStep(2) } else { setFormStep(1) } }} className="w-full">
              <TabsContent value="form1">
                <form className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Last Name:</Label>
                      <Input required className={`mt-1 ${formErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.lastName} onChange={e => { setFormData({ ...formData, lastName: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, lastName: undefined as any })) }} placeholder="Enter last name" />
                      {formErrors.lastName && (<div className="text-xs text-red-600 mt-1">{formErrors.lastName}</div>)}
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium">First Name:</Label>
                      <Input required className={`mt-1 ${formErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.firstName} onChange={e => { setFormData({ ...formData, firstName: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, firstName: undefined as any })) }} placeholder="Enter first name" />
                      {formErrors.firstName && (<div className="text-xs text-red-600 mt-1">{formErrors.firstName}</div>)}
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Middle Name:</Label>
                      <Input required className={`mt-1 ${formErrors.middleName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.middleName} onChange={e => { setFormData({ ...formData, middleName: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, middleName: undefined as any })) }} placeholder="Enter middle name" />
                      {formErrors.middleName && (<div className="text-xs text-red-600 mt-1">{formErrors.middleName}</div>)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sex:</Label>
                    <RadioGroup value={formData.sex} onValueChange={(v) => { setFormData({ ...formData, sex: v }); setFormErrors(prev => ({ ...prev, sex: undefined as any })) }} className="flex space-x-6" aria-required="true">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Male" id="sex-male" />
                        <Label htmlFor="sex-male">Male</Label>
                    </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Female" id="sex-female" />
                        <Label htmlFor="sex-female">Female</Label>
                    </div>
                    </RadioGroup>
                    {formErrors.sex && (<div className="text-xs text-red-600 mt-1">{formErrors.sex}</div>)}
                    </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth:</Label>
                    <Input required type="date" className={`mt-1 ${formErrors.dob ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.dob} onChange={e => { setFormData({ ...formData, dob: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, dob: undefined as any })) }} max={new Date().toISOString().split('T')[0]} />
                    {formErrors.dob && (<div className="text-xs text-red-600 mt-1">{formErrors.dob}</div>)}
                  </div>
                  {/* Age removed per requirements */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                    <Label className="text-sm font-medium">Height (cm):</Label>
                    <Input 
                      required
                      className={`mt-1 ${formErrors.height ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={formData.height}
                        onChange={e => {
                          const raw = e.target.value
                          const sanitized = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                          setFormData({ ...formData, height: sanitized })
                        if ((sanitized || '').trim()) setFormErrors(prev => ({ ...prev, height: undefined as any }))
                        }}
                        placeholder="e.g., 160"
                      />
                      {formErrors.height && (<div className="text-xs text-red-600 mt-1">{formErrors.height}</div>)}
                    </div>
                    <div className="flex-1">
                    <Label className="text-sm font-medium">Weight (kg):</Label>
                    <Input 
                      required
                      className={`mt-1 ${formErrors.weight ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={formData.weight}
                        onChange={e => {
                          const raw = e.target.value
                          const sanitized = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                          setFormData({ ...formData, weight: sanitized })
                        if ((sanitized || '').trim()) setFormErrors(prev => ({ ...prev, weight: undefined as any }))
                        }}
                        placeholder="e.g., 55"
                      />
                      {formErrors.weight && (<div className="text-xs text-red-600 mt-1">{formErrors.weight}</div>)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Educational Attainment:</Label>
                    <select required className={`w-full border rounded px-3 py-2.5 text-sm mt-1 h-10 ${formErrors.education ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.education} onChange={e => { setFormData({ ...formData, education: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, education: undefined as any })) }}>
                      <option value="">--</option>
                      <option value="POST GRADUATE">POST GRADUATE</option>
                      <option value="COLLEGE GRADUATE">COLLEGE GRADUATE</option>
                      <option value="VOCATIONAL GRADUATE">VOCATIONAL GRADUATE</option>
                      <option value="COLLEGE LEVEL">COLLEGE LEVEL</option>
                      <option value="HIGH SCHOOL GRADUATE">HIGH SCHOOL GRADUATE</option>
                    </select>
                  </div>
                  {formErrors.education && (<div className="text-xs text-red-600 mt-1">{formErrors.education}</div>)}
                  <div>
                    <Label className="text-sm font-medium">Present Address:</Label>
                    <Input required className={`mt-1 ${formErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.address} onChange={e => { setFormData({ ...formData, address: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, address: undefined as any })) }} placeholder="Enter address" />
                    {formErrors.address && (<div className="text-xs text-red-600 mt-1">{formErrors.address}</div>)}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email Address:</Label>
                    <Input 
                      required 
                      className={`mt-1 ${formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                      type="email" 
                      value={formData.email} 
                      onChange={e => {
                        const value = e.target.value
                        setFormData({ ...formData, email: value })
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')) {
                          setFormErrors(prev => ({ ...prev, email: undefined }))
                        }
                      }} 
                      placeholder="name@example.com" 
                      onBlur={() => {
                        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')
                        if (!emailValid) {
                          setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }))
                        } else {
                          setFormErrors(prev => ({ ...prev, email: undefined }))
                        }
                      }} 
                    />
                    {formErrors.email && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.email}</div>
                    )}
                    </div>
                  <div>
                    <Label className="text-sm font-medium">Cellphone No.:</Label>
                    <Input 
                      required
                      className={`mt-1 ${formErrors.contact ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                      value={formData.contact}
                      inputMode="numeric"
                      pattern="^09\\d{9}$"
                      maxLength={11}
                      onChange={e => {
                        const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, contact: digits })
                        if (/^09\d{9}$/.test(digits || '')) {
                          setFormErrors(prev => ({ ...prev, contact: undefined }))
                        }
                      }}
                      onBlur={() => {
                        const valid = /^09\d{9}$/.test(formData.contact || '')
                        if (!valid) {
                          setFormErrors(prev => ({ ...prev, contact: 'Must start with 09 and be exactly 11 digits.' }))
                        } else {
                          setFormErrors(prev => ({ ...prev, contact: undefined }))
                        }
                      }}
                      placeholder="09XXXXXXXXX" 
                    />
                    {formErrors.contact && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.contact}</div>
                    )}
                    </div>
                  <div className="flex justify-end pt-4">
                    <Button 
                      className="bg-[#1976D2] hover:bg-[#1565C0]" 
                      type="button"
                      onClick={() => {
                      const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === ''
                      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')
                      const phoneValid = /^09\d{9}$/.test(formData.contact || '')
                      const errors: { [key: string]: string } = {}
                      if (isEmpty(formData.lastName)) errors.lastName = 'Last Name is required.'
                      if (isEmpty(formData.firstName)) errors.firstName = 'First Name is required.'
                      if (isEmpty(formData.middleName)) errors.middleName = 'Middle Name is required.'
                      if (isEmpty(formData.sex)) errors.sex = 'Please select sex.'
                      if (isEmpty(formData.dob)) errors.dob = 'Date of Birth is required.'
                      if (isEmpty(formData.height)) errors.height = 'Height is required.'
                      if (isEmpty(formData.weight)) errors.weight = 'Weight is required.'
                      if (isEmpty(formData.education)) errors.education = 'Educational Attainment is required.'
                      if (isEmpty(formData.address)) errors.address = 'Present Address is required.'
                      if (!emailValid) errors.email = 'Please enter a valid email address.'
                      if (!phoneValid) errors.contact = 'Must start with 09 and be exactly 11 digits.'
                      setFormErrors(prev => ({ ...prev, ...errors }))
                      if (Object.keys(errors).length > 0) return
                      setFormStep(2)
                    }}>Next</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="form2">
                <form className="p-6 space-y-4">
                  {/* Other information fields */}
                  <div>
                    <Label className="text-sm font-medium">Passport Number:</Label>
                    <Input required className={`mt-1 ${formErrors.passportNo ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.passportNo} onChange={e => { setFormData({ ...formData, passportNo: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, passportNo: undefined as any })) }} />
                    {formErrors.passportNo && (<div className="text-xs text-red-600 mt-1">{formErrors.passportNo}</div>)}
                    </div>
                  <div>
                    <Label className="text-sm font-medium">Passport Validity:</Label>
                    <Input required type="date" className={`mt-1 ${formErrors.passportValidity ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.passportValidity} onChange={e => { setFormData({ ...formData, passportValidity: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, passportValidity: undefined as any })) }} min={new Date().toISOString().split('T')[0]} />
                    {formErrors.passportValidity && (<div className="text-xs text-red-600 mt-1">{formErrors.passportValidity}</div>)}
                    </div>
                  <div>
                    <Label className="text-sm font-medium">ID Presented:</Label>
                    <select required className={`w-full border rounded px-3 py-2.5 text-sm mt-1 h-10 ${formErrors.idPresented ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.idPresented} onChange={e => { setFormData({ ...formData, idPresented: e.target.value.toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, idPresented: undefined as any })) }}>
                      <option value="">--</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="UMID">UMID</option>
                      <option value="SSS">SSS</option>
                      <option value="DRIVER'S LICENSE">Driver's License</option>
                      <option value="OTHERS">Others</option>
                      </select>
                    {formErrors.idPresented && (<div className="text-xs text-red-600 mt-1">{formErrors.idPresented}</div>)}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">ID Number:</Label>
                    <Input required className={`mt-1 ${formErrors.idNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}`} value={formData.idNumber} onChange={e => { setFormData({ ...formData, idNumber: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, idNumber: undefined as any })) }} />
                    {formErrors.idNumber && (<div className="text-xs text-red-600 mt-1">{formErrors.idNumber}</div>)}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">With Taiwan Work Experience:</Label>
                    <RadioGroup value={formData.withTaiwanExp} onValueChange={(v) => { setFormData({ ...formData, withTaiwanExp: v }); setFormErrors(prev => ({ ...prev, withTaiwanExp: undefined as any })) }} className="mt-1 flex space-x-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="YES" id="twexp-yes" />
                        <Label htmlFor="twexp-yes">Yes</Label>
                  </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NO" id="twexp-no" />
                        <Label htmlFor="twexp-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {formData.withTaiwanExp === 'YES' && (
                  <div>
                      <Label className="text-sm font-medium">Taiwan Work Experience (Name of company with year started and ended):</Label>
                      <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          required
                          placeholder="COMPANY NAME"
                          value={formData.taiwanCompany || ''}
                          onChange={e => { setFormData({ ...formData, taiwanCompany: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, taiwanCompany: undefined as any })) }}
                          className={`${formErrors.taiwanCompany ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        <select
                          required
                          className="w-full border rounded px-3 py-2.5 text-sm h-10"
                          value={formData.taiwanYearStarted || ''}
                          onChange={e => { setFormData({ ...formData, taiwanYearStarted: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, taiwanYearStarted: undefined as any })) }}
                          aria-invalid={!!formErrors.taiwanYearStarted}
                        >
                          <option value="">Year Started</option>
                          {Array.from({ length: 51 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          required
                          className="w-full border rounded px-3 py-2.5 text-sm h-10"
                          value={formData.taiwanYearEnded || ''}
                          onChange={e => { setFormData({ ...formData, taiwanYearEnded: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, taiwanYearEnded: undefined as any })) }}
                          aria-invalid={!!formErrors.taiwanYearEnded}
                        >
                          <option value="">Year Ended</option>
                          {Array.from({ length: 51 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                  </div>
                    {(formErrors.taiwanCompany || formErrors.taiwanYearStarted || formErrors.taiwanYearEnded) && (
                      <div className="text-xs text-red-600 mt-1">
                        {formErrors.taiwanCompany || formErrors.taiwanYearStarted || formErrors.taiwanYearEnded}
                      </div>
                    )}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">With Job Experience (Aside from Taiwan):</Label>
                    <RadioGroup value={formData.withJobExp} onValueChange={(v) => { setFormData({ ...formData, withJobExp: v }); setFormErrors(prev => ({ ...prev, withJobExp: undefined as any })) }} className="mt-1 flex space-x-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="YES" id="jobexp-yes" />
                        <Label htmlFor="jobexp-yes">Yes</Label>
                  </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NO" id="jobexp-no" />
                        <Label htmlFor="jobexp-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {formData.withJobExp === 'YES' && (
                  <div>
                      <Label className="text-sm font-medium">Name of company with year started and ended:</Label>
                      <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          required
                          placeholder="COMPANY NAME"
                          value={formData.otherCompany || ''}
                          onChange={e => { setFormData({ ...formData, otherCompany: (e.target.value || '').toUpperCase() }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, otherCompany: undefined as any })) }}
                          className={`${formErrors.otherCompany ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        <select
                          required
                          className="w-full border rounded px-3 py-2.5 text-sm h-10"
                          value={formData.otherYearStarted || ''}
                          onChange={e => { setFormData({ ...formData, otherYearStarted: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, otherYearStarted: undefined as any })) }}
                          aria-invalid={!!formErrors.otherYearStarted}
                        >
                          <option value="">Year Started</option>
                          {Array.from({ length: 51 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          required
                          className="w-full border rounded px-3 py-2.5 text-sm h-10"
                          value={formData.otherYearEnded || ''}
                          onChange={e => { setFormData({ ...formData, otherYearEnded: e.target.value }); if ((e.target.value || '').trim()) setFormErrors(prev => ({ ...prev, otherYearEnded: undefined as any })) }}
                          aria-invalid={!!formErrors.otherYearEnded}
                        >
                          <option value="">Year Ended</option>
                          {Array.from({ length: 51 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                  </div>
                    {(formErrors.otherCompany || formErrors.otherYearStarted || formErrors.otherYearEnded) && (
                      <div className="text-xs text-red-600 mt-1">
                        {formErrors.otherCompany || formErrors.otherYearStarted || formErrors.otherYearEnded}
                      </div>
                    )}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Remarks:</Label>
                    <Input className="mt-1" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: (e.target.value || '').toUpperCase() })} />
                  </div>
                  {/* Processing Times Info - Automatically generated */}
                  {formData.time_received && !editingId && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium text-blue-800 mb-2">Processing Times (Automatically Generated)</div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Time Received:</span>{' '}
                            {new Date(formData.time_received).toLocaleString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </div>
                          <div className="text-gray-500 italic">
                            Time Released will be set automatically when the application is submitted.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" type="button" onClick={() => setFormStep(1)}>Previous</Button>
                    <Button className="bg-[#1976D2] hover:bg-[#1565C0]" type="button" onClick={async () => {
                      const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === ''
                      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')
                      const phoneValid = /^09\d{9}$/.test(formData.contact || '')
                      const errors: { [key: string]: string } = {}
                      if (isEmpty(formData.lastName)) errors.lastName = 'Last Name is required.'
                      if (isEmpty(formData.firstName)) errors.firstName = 'First Name is required.'
                      if (isEmpty(formData.middleName)) errors.middleName = 'Middle Name is required.'
                      if (isEmpty(formData.sex)) errors.sex = 'Please select sex.'
                      if (isEmpty(formData.dob)) errors.dob = 'Date of Birth is required.'
                      if (isEmpty(formData.height)) errors.height = 'Height is required.'
                      if (isEmpty(formData.weight)) errors.weight = 'Weight is required.'
                      if (isEmpty(formData.education)) errors.education = 'Educational Attainment is required.'
                      if (isEmpty(formData.address)) errors.address = 'Present Address is required.'
                      if (!emailValid) errors.email = 'Please enter a valid email address.'
                      if (!phoneValid) errors.contact = 'Must start with 09 and be exactly 11 digits.'
                      if (isEmpty(formData.passportNo)) errors.passportNo = 'Passport Number is required.'
                      if (isEmpty(formData.passportValidity)) errors.passportValidity = 'Passport Validity is required.'
                      if (isEmpty(formData.idPresented)) errors.idPresented = 'ID Presented is required.'
                      if (isEmpty(formData.idNumber)) errors.idNumber = 'ID Number is required.'
                      if (isEmpty(formData.withTaiwanExp)) errors.withTaiwanExp = 'Please choose Yes/No.'
                      if (formData.withTaiwanExp === 'YES') {
                        if (isEmpty(formData.taiwanCompany)) errors.taiwanCompany = 'Company name is required.'
                        if (isEmpty(formData.taiwanYearStarted)) errors.taiwanYearStarted = 'Year started is required.'
                        if (isEmpty(formData.taiwanYearEnded)) errors.taiwanYearEnded = 'Year ended is required.'
                      }
                      if (isEmpty(formData.withJobExp)) errors.withJobExp = 'Please choose Yes/No.'
                      if (formData.withJobExp === 'YES') {
                        if (isEmpty(formData.otherCompany)) errors.otherCompany = 'Company name is required.'
                        if (isEmpty(formData.otherYearStarted)) errors.otherYearStarted = 'Year started is required.'
                        if (isEmpty(formData.otherYearEnded)) errors.otherYearEnded = 'Year ended is required.'
                      }

                      setFormErrors(prev => ({ ...prev, ...errors }))
                      if (Object.keys(errors).length > 0) return
                      // Open confirm dialog instead of immediate create
                      setCreateConfirmOpen(true)
                    }}>{editingId ? 'Save' : 'Create'}</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirm Create Dialog */}
      <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingId ? 'Confirm Save' : 'Confirm Create'}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingId ? 'Save changes to this applicant?' : 'Create this new Gov-to-Gov applicant?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreateConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              setCreateConfirmOpen(false)
              const payload = {
                last_name: formData.lastName,
                first_name: formData.firstName,
                middle_name: formData.middleName,
                sex: String(formData.sex).toLowerCase(),
                date_of_birth: formData.dob,
                height: Number(formData.height || 0),
                weight: Number(formData.weight || 0),
                educational_attainment: formData.education,
                present_address: formData.address,
                email_address: formData.email,
                contact_number: formData.contact,
                passport_number: formData.passportNo,
                passport_validity: formData.passportValidity,
                id_presented: formData.idPresented,
                id_number: formData.idNumber,
                with_taiwan_work_experience: formData.withTaiwanExp === 'YES',
                with_job_experience: formData.withJobExp === 'YES',
                // Metadata for future extension
                taiwan_company: formData.taiwanCompany || '',
                taiwan_year_started: formData.taiwanYearStarted || '',
                taiwan_year_ended: formData.taiwanYearEnded || '',
                other_company: formData.otherCompany || '',
                other_year_started: formData.otherYearStarted || '',
                other_year_ended: formData.otherYearEnded || '',
                remarks: formData.remarks || '',
                // time_received is already set when modal opens (ISO timestamp)
                time_received: formData.time_received || new Date().toISOString(),
                // time_released is set automatically on submission (not for edits)
                time_released: editingId ? formData.time_released : new Date().toISOString(),
              } as any
              let res
              const applicantName = `${formData.firstName} ${formData.lastName}${formData.middleName ? ` ${formData.middleName}` : ''}`.trim().toUpperCase()
              const passportNumber = formData.passportNo?.toUpperCase() || 'N/A'
              
              if (editingId) {
                res = await update(editingId, payload)
              } else {
                res = await create(payload)
              }
              if (res?.success) {
                setModalOpen(false)
                await refresh()
                
                const timestamp = new Date().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                
                toast({
                  title: editingId ? 'Applicant updated successfully!' : 'Applicant created successfully!',
                  description: editingId 
                    ? `Updated: ${applicantName}\nPassport: ${passportNumber}\nUpdated at ${timestamp}`
                    : `Created: ${applicantName}\nPassport: ${passportNumber}\nEducational Attainment: ${formData.education}\nCreated at ${timestamp}`,
                })
              } else {
                toast({
                  title: editingId ? 'Update failed' : 'Create failed',
                  description: res?.error || 'Unable to save application',
                  variant: 'destructive',
                })
              }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{selected?.first_name} {selected?.last_name}'s Application</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selected && (
            <>
            <div className="px-8 py-6 overflow-y-auto flex-1">
              {/* Personal Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Applicant Information</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Last Name:</div>
                    <div className="font-medium">{selected.last_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">First Name:</div>
                    <div className="font-medium">{selected.first_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Middle Name:</div>
                    <div className="font-medium">{selected.middle_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sex:</div>
                    <div className="font-medium capitalize">{selected.sex}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email:</div>
                    <div className="font-medium">{selected.email_address || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Contact No.:</div>
                    <div className="font-medium">{selected.contact_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Height:</div>
                    <div className="font-medium">{selected.height ? `${selected.height} cm` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Weight:</div>
                    <div className="font-medium">{selected.weight ? `${selected.weight} kg` : 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Present Address:</div>
                    <div className="font-medium">{selected.present_address || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Educational Attainment:</div>
                    <div className="font-medium">{selected.educational_attainment || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Passport Details */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Passport Details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <div className="text-gray-500">Passport Number:</div>
                    <div className="font-medium">{selected.passport_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Passport Validity:</div>
                    <div className="font-medium">
                      {selected.passport_validity ? 
                        new Date(selected.passport_validity).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }).toUpperCase() : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">ID Presented:</div>
                    <div className="font-medium">{selected.id_presented || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">ID Number:</div>
                    <div className="font-medium">{selected.id_number || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Work Experience */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Work Experience</div>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Taiwan Work Experience:</div>
                    <div className="font-medium">{selected.with_taiwan_work_experience ? 'YES' : 'NO'}</div>
                    {selected.with_taiwan_work_experience && (
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Company:</div>
                          <div className="font-medium">{selected.taiwan_company || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Year Started:</div>
                          <div className="font-medium">{selected.taiwan_year_started || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Year Ended:</div>
                          <div className="font-medium">{selected.taiwan_year_ended || 'N/A'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Other Job Experience:</div>
                    <div className="font-medium">{selected.with_job_experience ? 'YES' : 'NO'}</div>
                    {selected.with_job_experience && (
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Company:</div>
                          <div className="font-medium">{selected.other_company || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Year Started:</div>
                          <div className="font-medium">{selected.other_year_started || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Year Ended:</div>
                          <div className="font-medium">{selected.other_year_ended || 'N/A'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Additional Information */}
              <div className="mb-6">
                <div className="font-semibold text-gray-700 mb-2">Additional Information</div>
                <div className="text-sm">
                  <div>
                    <div className="text-gray-500">Remarks:</div>
                    <div className="font-medium">{selected.remarks || 'N/A'}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-gray-500">Date Received by Region:</div>
                    <div className="font-medium">
                      {selected.date_received_by_region ? 
                        new Date(selected.date_received_by_region).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }).toUpperCase() : 'Not yet received'
                      }
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-gray-500">Date Card Released:</div>
                    <div className="font-medium">
                      {selected.date_card_released ? 
                        new Date(selected.date_card_released).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }).toUpperCase() : 'Not yet released'
                      }
                    </div>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              {/* Documents */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-gray-700">Documents</div>
                  <Button 
                    className="bg-[#1976D2] hover:bg-[#1565C0] text-white h-8 px-3 text-sm"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
                <GovToGovDocumentsList 
                  applicationId={selected.id}
                  refreshTrigger={documentsRefreshTrigger}
                  onRefresh={() => setDocumentsRefreshTrigger(prev => prev + 1)}
                  onViewPDF={(doc) => {
                    setSelectedDocument({ id: doc.id, name: doc.file_name })
                    setPdfViewerOpen(true)
                  }}
                  setSelectedDocument={setSelectedDocument}
                  setPdfViewerOpen={setPdfViewerOpen}
                />
              </div>
              <hr className="my-4" />
              {/* Transaction History */}
              <div className="mb-6">
                <TransactionHistory
                  applicationType="gov-to-gov"
                  recordId={selected?.id ?? null}
                  refreshKey={documentsRefreshTrigger}
                />
              </div>
            </div>
            </>
          )}
          {/* Action Buttons */}
          <div className="px-8 py-4 border-t bg-gray-50 flex justify-end gap-3">
            {/* Release Card Button */}
            <Button 
              className={selected?.date_card_released ? "bg-gray-500 hover:bg-gray-600 text-white cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}
              disabled={selected?.date_card_released}
              onClick={() => {
                if (!selected) return
                if (selected.date_card_released) {
                  toast({ 
                    title: 'Card Already Released', 
                    description: `This card was already released on ${new Date(selected.date_card_released).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }).toUpperCase()}` 
                  })
                  return
                }
                setReleaseCardConfirmOpen(true)
              }}
            >
              {selected?.date_card_released ? 'Card Already Released' : 'Release Card'}
            </Button>
            
            {/* Received by Region Button */}
            <Button 
              className={selected?.date_received_by_region ? "bg-gray-500 hover:bg-gray-600 text-white cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}
              disabled={selected?.date_received_by_region}
              onClick={async () => {
                if (!selected) return
                if (selected.date_received_by_region) {
                  toast({ 
                    title: 'Already Received', 
                    description: `This application was already received on ${new Date(selected.date_received_by_region).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }).toUpperCase()}` 
                  })
                  return
                }
                const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
                const res = await update(selected.id, { date_received_by_region: currentDate })
                if (res?.success) {
                  toast({ 
                    title: 'Marked as Received', 
                    description: `Application marked as received by region on ${new Date(currentDate).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }).toUpperCase()}` 
                  })
                  await refresh()
                  setViewOpen(false)
                } else {
                  toast({ 
                    title: 'Update failed', 
                    description: res?.error || 'Unable to mark as received', 
                    variant: 'destructive' 
                  })
                }
              }}
            >
              {selected?.date_received_by_region ? 'Already Received by Region' : 'Received by Region'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!selected) return
              
              const applicantName = `${selected?.first_name} ${selected?.last_name}${selected?.middle_name ? ` ${selected?.middle_name}` : ''}`.trim().toUpperCase()
              const passportNumber = selected?.passport_number?.toUpperCase() || 'N/A'
              
              const res = await remove(selected.id)
              if (res?.success) {
                const timestamp = new Date().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                
                toast({ 
                  title: 'Application deleted', 
                  description: `Deleted: ${applicantName}\nPassport: ${passportNumber}\nDeleted at ${timestamp}`,
                })
                await refresh()
              } else {
                toast({ 
                  title: 'Delete failed', 
                  description: res?.error || 'Unable to delete application',
                  variant: 'destructive' 
                })
              }
              setDeleteConfirmOpen(false)
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">Restore Application</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold block mb-1">✔ Restore Application</span>
              <span className="block text-sm text-gray-600 mb-3">
                Are you sure you want to restore this application? This will make it active again.
              </span>
              <span className="block text-sm">
                Type <span className="font-mono bg-gray-100 px-1 rounded">RESTORE</span> to confirm:
              </span>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 mt-2"
                placeholder="Type RESTORE here"
                value={restoreConfirmText}
                onChange={(e)=>setRestoreConfirmText(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={()=>setRestoreConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreConfirmText.trim().toUpperCase() !== 'RESTORE'}
              className="bg-green-600 hover:bg-green-700"
              onClick={async () => {
                if (!selected) return
                
                const applicantName = `${selected?.first_name} ${selected?.last_name}${selected?.middle_name ? ` ${selected?.middle_name}` : ''}`.trim().toUpperCase()
                const passportNumber = selected?.passport_number?.toUpperCase() || 'N/A'
                
                const res = await fetch(`/api/gov-to-gov/${selected.id}/restore`, { method: 'PUT' })
                if (res.ok) {
                  const timestamp = new Date().toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                  
                  toast({ 
                    title: 'Application restored', 
                    description: `Restored: ${applicantName}\nPassport: ${passportNumber}\nApplication is now active again\nRestored at ${timestamp}`,
                  })
                  await refresh()
                } else {
                  toast({ 
                    title: 'Restore failed', 
                    description: 'Unable to restore application',
                    variant: 'destructive' 
                  })
                }
                setRestoreConfirmText("")
                setRestoreConfirmOpen(false)
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={permanentDeleteConfirmOpen} onOpenChange={setPermanentDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <span className="flex items-center mb-2">
                  <Trash2 className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-bold text-red-600">Warning: This action cannot be undone</span>
                </span>
                <span className="block text-red-700 text-sm">
                  You are about to permanently delete the application for <span className="font-semibold">{applicationToDelete?.first_name} {applicationToDelete?.last_name}</span>. This will permanently remove all data including documents, processing records, and cannot be recovered.
                </span>
              </span>
              <span className="block font-bold text-gray-900 mb-3">Are you absolutely sure you want to proceed?</span>
              <span className="block text-sm text-gray-600 mb-2">
                To confirm, please type <span className="font-mono bg-gray-100 px-1 rounded font-bold">DELETE</span> in the field below:
              </span>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Type DELETE to confirm"
                value={permanentDeleteConfirmText}
                onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPermanentDeleteConfirmText("")
              setApplicationToDelete(null)
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={permanentDeleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                if (!applicationToDelete) return
                
                const applicantName = `${applicationToDelete?.first_name} ${applicationToDelete?.last_name}${applicationToDelete?.middle_name ? ` ${applicationToDelete?.middle_name}` : ''}`.trim().toUpperCase()
                const passportNumber = applicationToDelete?.passport_number?.toUpperCase() || 'N/A'
                
                const res = await fetch(`/api/gov-to-gov/${applicationToDelete.id}/permanent-delete`, { method: 'DELETE' })
                if (res.ok) {
                  const timestamp = new Date().toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                  
                  toast({ 
                    title: 'Application permanently deleted', 
                    description: `Permanently deleted: ${applicantName}\nPassport: ${passportNumber}\nAll data has been permanently removed\nDeleted at ${timestamp}`,
                  })
                  await refresh()
                } else {
                  toast({ 
                    title: 'Delete failed', 
                    description: 'Unable to permanently delete application',
                    variant: 'destructive' 
                  })
                }
                setPermanentDeleteConfirmText("")
                setApplicationToDelete(null)
                setPermanentDeleteConfirmOpen(false)
              }}
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release Card Confirmation */}
      <AlertDialog open={releaseCardConfirmOpen} onOpenChange={setReleaseCardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-blue-600">Release Card</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block text-sm text-gray-600 mb-3">
                Are you sure you want to mark this card as released?
              </span>
              <span className="block text-sm">
                This action cannot be undone. The card will be marked as released on <span className="font-semibold">{new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }).toUpperCase()}</span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                if (!selected) return
                const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
                const res = await update(selected.id, { date_card_released: currentDate })
                if (res?.success) {
                  toast({ 
                    title: 'Card Released', 
                    description: `Card marked as released on ${new Date(currentDate).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }).toUpperCase()}` 
                  })
                  await refresh()
                  setViewOpen(false)
                } else {
                  toast({ 
                    title: 'Update failed', 
                    description: res?.error || 'Unable to mark card as released', 
                    variant: 'destructive' 
                  })
                }
                setReleaseCardConfirmOpen(false)
              }}
            >
              Release Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl">
          <DialogTitle className="text-lg font-medium mb-4">Upload Document</DialogTitle>
          <GovToGovDocumentUploadForm 
            applicationId={selected?.id || ''}
            applicationType="gov_to_gov"
            onSuccess={() => {
              setUploadModalOpen(false)
              setDocumentsRefreshTrigger(prev => prev + 1)
              toast({
                title: 'Document uploaded successfully!',
                description: 'The document has been added to the application.',
              })
            }}
            onError={(error) => {
              toast({
                title: 'Upload failed',
                description: error,
                variant: 'destructive'
              })
            }}
            onCancel={() => setUploadModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false)
            setSelectedDocument(null)
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
        />
      )}
    </div>
    </PermissionGuard>
  )
}

// Gov-to-Gov Documents List Component
interface GovToGovDocumentsListProps {
  applicationId: string
  refreshTrigger: number
  onRefresh: () => void
  onViewPDF: (doc: any) => void
  setSelectedDocument: (doc: {id: string, name: string} | null) => void
  setPdfViewerOpen: (open: boolean) => void
}

function GovToGovDocumentsList({ applicationId, refreshTrigger, onRefresh, onViewPDF, setSelectedDocument, setPdfViewerOpen }: GovToGovDocumentsListProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<any | null>(null)
  const { toast } = useToast()

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = (fileName.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf' || mimeType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-600" />
    }
    if (['doc', 'docx', 'rtf'].includes(ext) || mimeType.includes('word')) {
      return <FileText className="h-4 w-4 text-blue-600" />
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('spreadsheet')) {
      return <FileText className="h-4 w-4 text-green-600" />
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext) || mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-teal-600" />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="h-4 w-4 text-yellow-600" />
    }
    return <File className="h-4 w-4 text-gray-500" />
  }

  const formatDocumentType = (raw: string, fileName: string): string => {
    if (!raw) return ''
    
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    const key = raw.toLowerCase().trim()
    const map: Record<string, string> = {
      passport: 'Passport',
      visa: 'Visa/Work Permit',
      'visa/work permit': 'Visa/Work Permit',
      'visa work permit': 'Visa/Work Permit',
      tesda: 'TESDA NC/PRC License',
      'tesda nc': 'TESDA NC/PRC License',
      'tesda nc/prc license': 'TESDA NC/PRC License',
      clearance: 'Clearance',
      comprehensive_clearance: 'Gov-to-Gov Clearance',
      confirmation: 'MWO/POLO/PE/PCG Confirmation',
      issuance_of_oec_memorandum: 'Memorandum Issuance of OEC',
      dmw_clearance_request: 'Clearance Request',
    }
    
    let formattedName = ''
    if (map[key]) {
      formattedName = map[key]
    } else {
      formattedName = raw
        .replace(/[_-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    
    return fileExtension ? `${formattedName}.${fileExtension}` : formattedName
  }

  const isImportantDocument = (doc: any) => {
    const importantTypes = ['passport', 'visa', 'tesda', 'clearance', 'comprehensive_clearance']
    return importantTypes.some(type => doc.document_type.toLowerCase().includes(type))
  }

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=gov_to_gov`)
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
  }, [applicationId, refreshTrigger, toast])

  const handleView = async (document: any) => {
    try {
      setSelectedDocument({
        id: document.id,
        name: document.file_name
      })
      setPdfViewerOpen(true)
    } catch (error) {
      console.error('View error:', error)
      toast({
        title: 'View Error',
        description: `Failed to view document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (document: any) => {
    setEditingDocument(document.id)
    setEditName(document.document_type)
  }

  const handleSaveEdit = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentName: editName })
      })

      const result = await response.json()
      if (result.success) {
        setDocuments(docs => docs.map(doc => 
          doc.id === documentId ? { ...doc, document_type: editName } : doc
        ))
        setEditingDocument(null)
        toast({
          title: 'Document renamed',
          description: 'Document name has been updated successfully',
        })
      } else {
        throw new Error(result.error || 'Failed to update document')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename document',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteClick = (document: any) => {
    setDocumentToDelete(document)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        setDocuments(docs => docs.filter(doc => doc.id !== documentToDelete.id))
        toast({
          title: 'Document deleted',
          description: 'Document has been removed successfully',
        })
      } else {
        throw new Error(result.error || 'Failed to delete document')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setDocumentToDelete(null)
    }
  }

  const renderDocumentRow = (document: any) => (
    <div key={document.id} className="bg-green-50 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {getFileIcon(document.file_name, document.mime_type)}
        <div>
          {editingDocument === document.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleSaveEdit(document.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(document.id)
                if (e.key === 'Escape') setEditingDocument(null)
              }}
              className="text-sm font-medium bg-white border rounded px-2 py-1"
              autoFocus
            />
          ) : (
            <div className="text-sm font-medium text-gray-900">
              {formatDocumentType(document.document_type, document.file_name)}
            </div>
          )}
        </div>
      </div>
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
          <DropdownMenuItem onClick={() => handleEdit(document)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit name
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleDeleteClick(document)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

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

  const importantDocs = documents.filter(isImportantDocument)
  const otherDocs = documents.filter(d => !isImportantDocument(d))

  return (
    <div className="space-y-4">
      {importantDocs.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Important Documents</div>
          <div className="space-y-2">
            {importantDocs.map(renderDocumentRow)}
          </div>
        </div>
      )}
      {otherDocs.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Other Documents</div>
          <div className="space-y-2">
            {otherDocs.map(renderDocumentRow)}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.document_type}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Gov-to-Gov Document Upload Form Component
interface GovToGovDocumentUploadFormProps {
  applicationId: string
  applicationType: string
  onSuccess: () => void
  onError: (error: string) => void
  onCancel: () => void
}

function GovToGovDocumentUploadForm({ applicationId, applicationType, onSuccess, onError, onCancel }: GovToGovDocumentUploadFormProps) {
  const [uploading, setUploading] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      onError('Please select a file and enter a document name')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('applicationId', applicationId)
      formData.append('applicationType', applicationType)
      formData.append('documentName', documentName.trim())

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
        <label className="text-sm font-medium">Document Name</label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Enter document name (e.g., Passport, Visa, Employment Contract)"
          className="w-full border rounded px-3 py-2 mt-1"
        />
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
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !documentName.trim()}
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