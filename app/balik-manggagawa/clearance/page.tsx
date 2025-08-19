"use client"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { ChevronDown, Filter, Plus, Download, Search, MoreHorizontal, Eye, Edit, Loader2, RefreshCcw, Trash2, CheckCircle, FileText } from "lucide-react"
import { useBalikManggagawaClearance } from "@/hooks/use-balik-manggagawa-clearance"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { convertToUSD, getUSDEquivalent, AVAILABLE_CURRENCIES, type Currency } from "@/lib/currency-converter"
import PDFViewerModal from "@/components/pdf-viewer-modal"
import type { Document } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"



const clearanceTypes = [
  { label: "Critical Skill", value: "critical_skill" },
  { label: "For Assessment Country", value: "for_assessment_country" },
  { label: "No Verified Contract Clearance", value: "no_verified_contract" },
  { label: "Non Compliant Country Clearance", value: "non_compliant_country" },
  { label: "Seafarer's Position", value: "seafarer_position" },
  { label: "Watchlisted Employer Clearance", value: "watchlisted_employer" },
  { label: "Watchlisted OFW", value: "watchlisted_similar_name" },
]

export default function BalikManggagawaClearancePage() {
  const [showFilter, setShowFilter] = useState(false)
  const [showClearanceDropdown, setShowClearanceDropdown] = useState(false)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    clearanceType: '',
    sex: '',
    dateFrom: '',
    dateTo: '',
    jobsite: '',
    position: '',
    includeDeleted: false as boolean
  })
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmingPassword, setConfirmingPassword] = useState(false)
  const [confirmPurpose, setConfirmPurpose] = useState<'deleted' | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>("")
  const [formName, setFormName] = useState("")
  const [formSex, setFormSex] = useState<'male' | 'female' | ''>("")
  const [formEmployer, setFormEmployer] = useState("")
  const [formDestination, setFormDestination] = useState("")
  const [formSalary, setFormSalary] = useState("")
  const [salaryCurrency, setSalaryCurrency] = useState<Currency | ''>('')
  // Type-specific fields
  const [position, setPosition] = useState("")
  const [dateArrival, setDateArrival] = useState("")
  const [dateDeparture, setDateDeparture] = useState("")
  const [remarks, setRemarks] = useState("")
  const [monthsYears, setMonthsYears] = useState("")
  const [withPrincipal, setWithPrincipal] = useState("")
  const [newPrincipalName, setNewPrincipalName] = useState("")
  const [employmentDuration, setEmploymentDuration] = useState("")
  const [employmentDurationStart, setEmploymentDurationStart] = useState("")
  const [employmentDurationEnd, setEmploymentDurationEnd] = useState("")
  const [dateBlacklisting, setDateBlacklisting] = useState("")
  const [reasonBlacklisting, setReasonBlacklisting] = useState("")
  const [placeDateEmployment, setPlaceDateEmployment] = useState("")
  const [totalDeployedOfws, setTotalDeployedOfws] = useState("")
  const [yearsWithPrincipal, setYearsWithPrincipal] = useState("")
  const [employmentStartDate, setEmploymentStartDate] = useState("")
  const [processingDate, setProcessingDate] = useState("")
  const [noOfMonthsYears, setNoOfMonthsYears] = useState("")
  const [dateOfDeparture, setDateOfDeparture] = useState("")
  const [controlPreview, setControlPreview] = useState("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [activeTab, setActiveTab] = useState("form1")
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedClearance, setSelectedClearance] = useState<any>(null)
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{id: string, name: string} | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clearanceToDelete, setClearanceToDelete] = useState<any>(null)
  const isTwoForm = true
  const secondTabKey = 'form2'
  const secondTabLabel = 'Form 2'

  const {
    clearances,
    loading,
    error,
    pagination,
    fetchClearances,
    createClearance,
    updateClearance,
    deleteClearance,
    getClearanceById
  } = useBalikManggagawaClearance()

  // Initial load
  useEffect(() => {
    fetchClearances({
      page: 1,
      limit: 10,
      search,
      ...filters,
      includeDeleted: showDeletedOnly,
      showDeletedOnly: showDeletedOnly
    })
  }, [])

  // Get current user
  useEffect(() => {
    let mounted = true
    import('@/lib/auth').then(mod => {
      const u = mod.getUser()
      if (mounted) {
        setCurrentUser(u)
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setSearch(searchTerm)
    fetchClearances({
      page: 1,
      limit: 10,
      search: searchTerm,
      ...filters,
      includeDeleted: showDeletedOnly,
      showDeletedOnly: showDeletedOnly
    })
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    fetchClearances({
      page: 1,
      limit: 10,
      search,
      ...newFilters,
      includeDeleted: showDeletedOnly,
      showDeletedOnly: showDeletedOnly
    })
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchClearances({
      page,
      limit: 10,
      search,
      ...filters,
      includeDeleted: showDeletedOnly,
      showDeletedOnly: showDeletedOnly
    })
  }

  // Handle show deleted only toggle
  const handleShowDeletedOnly = (show: boolean) => {
    if (show) {
      // Require password confirmation before enabling
      setConfirmPurpose('deleted')
      setConfirmPasswordOpen(true)
    } else {
      setShowDeletedOnly(false)
      fetchClearances({
        page: 1,
        limit: 10,
        search,
        ...filters,
        includeDeleted: false,
        showDeletedOnly: false
      })
    }
  }

  // Handle password confirmation
  const handleConfirmPassword = async () => {
    const username = currentUser?.username || ''
    if (!username || !confirmPassword) return
    
    setConfirmingPassword(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: confirmPassword })
      })
      const data = await res.json()
      if (data.success) {
        if (confirmPurpose === 'deleted') {
          setShowDeletedOnly(true)
          fetchClearances({
            page: 1,
            limit: 10,
            search,
            ...filters,
            includeDeleted: true,
            showDeletedOnly: true
          })
        }
        setConfirmPasswordOpen(false)
        setConfirmPassword("")
        setConfirmPurpose(null)
        toast({ title: 'Access granted', description: 'Password verified successfully' })
      } else {
        toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to verify password', variant: 'destructive' })
    } finally {
      setConfirmingPassword(false)
    }
  }

  const resetForm = () => {
    setFormName("")
    setFormSex("")
    setFormEmployer("")
    setFormDestination("")
    setFormSalary("")
    setSalaryCurrency('')
    setPosition("")
    setDateArrival("")
    setDateDeparture("")
    setRemarks("")
    setMonthsYears("")
    setWithPrincipal("")
    setNewPrincipalName("")
    setEmploymentDuration("")
    setEmploymentDurationStart("")
    setEmploymentDurationEnd("")
    setDateBlacklisting("")
    setReasonBlacklisting("")
    setPlaceDateEmployment("")
    setTotalDeployedOfws("")
    setYearsWithPrincipal("")
    setEmploymentStartDate("")
    setProcessingDate("")
    setNoOfMonthsYears("")
    setDateOfDeparture("")
  }

  const openCreateModal = (typeValue: string) => {
    setSelectedType(typeValue)
    setIsCreateOpen(true)
    // fetch control no preview
    fetch(`/api/balik-manggagawa/clearance/preview?type=${typeValue}`).then(r=>r.json()).then(res=>{
      if (res?.success) setControlPreview(res.data.preview)
      else setControlPreview('')
    }).catch(()=> setControlPreview(''))
  }

  const validateForm1 = (): string[] => {
    const errors: string[] = []
    const fieldErrors: {[k:string]: string} = {}
    if (!formName.trim()) { errors.push('Name is required'); (fieldErrors as any).name = 'Name is required' }
    if (!formEmployer.trim()) { errors.push('Employer is required'); (fieldErrors as any).employer = 'Employer is required' }
    if (!formDestination.trim()) { errors.push('Destination is required'); (fieldErrors as any).destination = 'Destination is required' }
    if (!formSalary.trim() || isNaN(Number(formSalary)) || Number(formSalary) <= 0) { errors.push('Valid salary is required'); (fieldErrors as any).salary = 'Valid salary is required' }
    setValidationErrors(fieldErrors)
    return errors
  }

  const validateCreateForm = (): string[] => {
    const errors: string[] = []
    const fieldErrors: {[k:string]: string} = {}
    if (!formName.trim()) { errors.push('Name is required'); fieldErrors.name = 'Name is required' }
    // Sex not required per type-specific forms
    if (!formEmployer.trim()) { errors.push('Employer is required'); fieldErrors.employer = 'Employer is required' }
    if (!formDestination.trim()) { errors.push('Destination is required'); fieldErrors.destination = 'Destination is required' }
    if (!formSalary.trim() || isNaN(Number(formSalary)) || Number(formSalary) <= 0) { errors.push('Valid salary is required'); fieldErrors.salary = 'Valid salary is required' }
    // Per-type requirements (remarks optional)
    const t = selectedType
    const require = (val: string, key: string, label: string) => { if (!val || !val.trim()) { errors.push(`${label} is required`); (fieldErrors as any)[key] = `${label} is required` } }
    if (t === 'watchlisted_employer') {
      require(dateBlacklisting, 'dateBlacklisting', 'Date of Blacklisting')
      require(reasonBlacklisting, 'reasonBlacklisting', 'Reason of Blacklisting')
      require(placeDateEmployment, 'placeDateEmployment', 'Place and Date of Employment')
      require(totalDeployedOfws, 'totalDeployedOfws', 'Total Deployed OFWs')
      require(dateArrival, 'dateArrival', 'Date of Arrival')
      require(dateDeparture, 'dateDeparture', 'Date of Departure')
      require(yearsWithPrincipal, 'yearsWithPrincipal', 'No. of Years with the Principal')
    } else if (t === 'non_compliant_country') {
      require(monthsYears, 'monthsYears', 'No. of Month(s)/Year(s)')
      require(withPrincipal, 'withPrincipal', 'With the Principal')
      require(dateDeparture, 'dateDeparture', 'Date of Departure')
      require(position, 'position', 'Position')
    } else if (t === 'for_assessment_country') {
      require(noOfMonthsYears, 'noOfMonthsYears', 'No. of Month(s)/Year(s) with the Principal')
      require(dateOfDeparture, 'dateOfDeparture', 'Date of Departure')
      require(employmentStartDate, 'employmentStartDate', 'Employment Start Date')
      require(processingDate, 'processingDate', 'Processing Date')
      require(dateArrival, 'dateArrival', 'Date of Arrival')
    } else if (t === 'no_verified_contract' || t === 'seafarer_position') {
      require(dateArrival, 'dateArrival', 'Date of Arrival')
      require(dateDeparture, 'dateDeparture', 'Date of Departure')
      require(position, 'position', 'Position')
      require(newPrincipalName, 'newPrincipalName', 'Name of the New Principal')
      require(employmentDuration, 'employmentDuration', 'Employment Duration')
    } else if (t === 'critical_skill') {
      require(dateArrival, 'dateArrival', 'Date of Arrival')
      require(dateDeparture, 'dateDeparture', 'Date of Departure')
      require(position, 'position', 'Position')
      require(newPrincipalName, 'newPrincipalName', 'Name of the New Principal')
      require(employmentDurationStart, 'employmentDurationStart', 'Employment Duration (From)')
      require(employmentDurationEnd, 'employmentDurationEnd', 'Employment Duration (To)')
    }
    setValidationErrors(fieldErrors)
    return errors
  }

  const handleDeleteConfirm = async () => {
    if (!clearanceToDelete) return
    
    const result = await deleteClearance(clearanceToDelete.id)
    if (result.success) {
      await fetchClearances({
        page: 1,
        limit: 10,
        search,
        ...filters,
        includeDeleted: false,
        showDeletedOnly: false
      })
      toast({
        title: "Success",
        description: "Clearance deleted successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete clearance",
        variant: "destructive"
      })
    }
    
    setDeleteConfirmOpen(false)
    setClearanceToDelete(null)
  }

  const handleCreate = async () => {
    // Basic validation
    if (!formName || !formSex || !formEmployer || !formDestination || !formSalary || !selectedType) {
      toast({ title: "Missing fields", description: "Please complete all fields.", variant: "destructive" })
      return
    }
    const salaryNumber = Number(formSalary)
    if (Number.isNaN(salaryNumber) || salaryNumber <= 0) {
      toast({ title: "Invalid salary", description: "Enter a valid salary amount.", variant: "destructive" })
      return
    }

    // include extended fields (send only if filled; backend normalizes empties to null)
    const payload: any = {
      nameOfWorker: formName,
      sex: formSex,
      employer: formEmployer,
      destination: formDestination,
      salary: (salaryCurrency && salaryCurrency !== 'USD') ? convertToUSD(salaryNumber, salaryCurrency as Currency) : salaryNumber,
      clearanceType: selectedType,
    }
    if (position) payload.position = position
    if (monthsYears) payload.monthsYears = monthsYears
    if (withPrincipal) payload.withPrincipal = withPrincipal
    if (newPrincipalName) payload.newPrincipalName = newPrincipalName
    if (employmentDurationStart && employmentDurationEnd && selectedType === 'critical_skill') {
      // Format as 'DD MONTH YYYY TO DD MONTH YYYY' (uppercase month)
      const fmt = (d: string) => {
        const date = new Date(d)
        const day = String(date.getDate()).padStart(2, '0')
        const month = date.toLocaleString('en-US', { month: 'long' }).toUpperCase()
        const year = date.getFullYear()
        return `${day} ${month} ${year}`
      }
      payload.employmentDuration = `${fmt(employmentDurationStart)} TO ${fmt(employmentDurationEnd)}`
    } else if (employmentDuration) {
      payload.employmentDuration = employmentDuration
    }
    if (dateArrival) payload.dateArrival = dateArrival
    if (dateDeparture) payload.dateDeparture = dateDeparture
    if (placeDateEmployment) payload.placeDateEmployment = placeDateEmployment
    if (dateBlacklisting) payload.dateBlacklisting = dateBlacklisting
    if (totalDeployedOfws) payload.totalDeployedOfws = Number(totalDeployedOfws)
    if (reasonBlacklisting) payload.reasonBlacklisting = reasonBlacklisting
    if (yearsWithPrincipal) payload.yearsWithPrincipal = Number(yearsWithPrincipal)
    if (employmentStartDate) payload.employmentStartDate = employmentStartDate
    if (processingDate) payload.processingDate = processingDate
    if (noOfMonthsYears) payload.noOfMonthsYears = noOfMonthsYears
    if (dateOfDeparture) payload.dateOfDeparture = dateOfDeparture
    if (remarks) payload.remarks = remarks

    const result = await createClearance(payload)

    if (result.success) {
      toast({ title: "Created", description: "Clearance created successfully." })
      setIsCreateOpen(false)
      resetForm()
    } else {
      toast({ title: "Error", description: result.error || "Failed to create clearance", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa - Clearance</h2>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search" 
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2">
                  Create <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {clearanceTypes.map(type => (
                  <DropdownMenuItem key={type.value} onClick={() => openCreateModal(type.value)}>{type.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-2">Types of Clearance:</div>
                <div className="grid grid-cols-1 gap-1 mb-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      checked={filters.clearanceType === ''}
                      onChange={() => handleFilterChange({ ...filters, clearanceType: '' })}
                    /> All
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="watchlisted_employer"
                      checked={filters.clearanceType === 'watchlisted_employer'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> Watchlisted Employer
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="seafarer_position"
                      checked={filters.clearanceType === 'seafarer_position'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> Seafarer's Position
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="non_compliant_country"
                      checked={filters.clearanceType === 'non_compliant_country'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> Non Compliant Country
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="no_verified_contract"
                      checked={filters.clearanceType === 'no_verified_contract'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> No Verified Contract
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="for_assessment_country"
                      checked={filters.clearanceType === 'for_assessment_country'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> For Assessment Country
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="critical_skill"
                      checked={filters.clearanceType === 'critical_skill'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> Critical Skill
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="clearanceType"
                      value="watchlisted_similar_name"
                      checked={filters.clearanceType === 'watchlisted_similar_name'}
                      onChange={(e) => handleFilterChange({ ...filters, clearanceType: e.target.value })}
                    /> Watchlisted Similar Name
                  </label>
                </div>
                <div className="font-semibold mb-1">Sex:</div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="sex"
                      checked={filters.sex === ''}
                      onChange={() => handleFilterChange({ ...filters, sex: '' })}
                    /> All
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="sex"
                      value="female"
                      checked={filters.sex === 'female'}
                      onChange={(e) => handleFilterChange({ ...filters, sex: e.target.value })}
                    /> Female
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="sex"
                      value="male"
                      checked={filters.sex === 'male'}
                      onChange={(e) => handleFilterChange({ ...filters, sex: e.target.value })}
                    /> Male
                  </label>
                </div>
                <div className="font-semibold mb-1">Date From</div>
                <Input 
                  type="date" 
                  className="mb-2"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ ...filters, dateFrom: e.target.value })}
                />
                <div className="font-semibold mb-1">Date To</div>
                <Input 
                  type="date" 
                  className="mb-2"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange({ ...filters, dateTo: e.target.value })}
                />
                <div className="flex justify-between gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    className="w-1/2"
                    onClick={() => {
                      const clearedFilters = {
                        clearanceType: '',
                        sex: '',
                        dateFrom: '',
                        dateTo: '',
                        jobsite: '',
                        position: ''
                      }
                      setFilters(clearedFilters)
                      fetchClearances({
                        page: 1,
                        limit: 10,
                        search,
                        ...clearedFilters,
                        includeDeleted: showDeletedOnly,
                        showDeletedOnly: showDeletedOnly
                      })
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    className="w-1/2 bg-[#1976D2] text-white"
                    onClick={() => setShowFilter(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="bg-white rounded-md border overflow-hidden">
          {/* Superadmin controls */}
          <div className="flex items-center justify-end px-4 py-2 border-b bg-gray-50 gap-6">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={showDeletedOnly}
                onChange={(e) => handleShowDeletedOnly(e.target.checked)}
              />
              Show deleted only
            </label>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1976D2] text-white">
                <th className="py-3 px-4 font-medium">Control #.</th>
                <th className="py-3 px-4 font-medium">Name of Worker</th>
                <th className="py-3 px-4 font-medium">Sex</th>
                <th className="py-3 px-4 font-medium">Employer</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium">Salary</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : clearances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No clearances found
                  </td>
                </tr>
              ) : (
                clearances.map((clearance) => (
                  <tr key={clearance.id} className={`hover:bg-gray-50 ${(clearance as any).deleted_at ? 'bg-red-50' : ''}`}>
                    <td className="py-3 px-4 text-center">{clearance.control_number}</td>
                    <td className="py-3 px-4 text-center">{clearance.name_of_worker}</td>
                    <td className="py-3 px-4 text-center capitalize">{clearance.sex}</td>
                    <td className="py-3 px-4 text-center">{clearance.employer}</td>
                    <td className="py-3 px-4 text-center">{clearance.destination}</td>
                    <td className="py-3 px-4 text-center">${clearance.salary.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async () => {
                            const result = await getClearanceById((clearance as any).id)
                            if (result.success) {
                              setSelectedClearance(result.data)
                              setViewOpen(true)
                            } else {
                              toast({ title: 'Error', description: result.error || 'Failed to load details', variant: 'destructive' })
                            }
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {showDeletedOnly ? (
                            <DropdownMenuItem 
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/balik-manggagawa/clearance/${clearance.id}`, { 
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'restore' })
                                  })
                                  const result = await res.json()
                                  if (result.success) {
                                                                       await fetchClearances({
                                     page: 1,
                                     limit: 10,
                                     search,
                                     ...filters,
                                     includeDeleted: true,
                                     showDeletedOnly: true
                                   })
                                    toast({ title: 'Clearance restored', description: `${clearance.name_of_worker} has been restored` })
                                  } else {
                                    throw new Error(result.error || 'Restore failed')
                                  }
                                } catch (err) {
                                  toast({ title: 'Restore error', description: 'Failed to restore clearance', variant: 'destructive' })
                                }
                              }}
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                              onClick={() => {
                                setClearanceToDelete(clearance)
                                setDeleteConfirmOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clearance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the clearance for <strong>{clearanceToDelete?.name_of_worker}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false)
              setClearanceToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Clearance Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { resetForm(); setActiveTab('form1'); setValidationErrors({}) } }}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl w-[95vw]" onInteractOutside={(e)=> e.preventDefault()} onEscapeKeyDown={(e)=> e.preventDefault()}>
          <DialogTitle className="sr-only">{clearanceTypes.find(ct => ct.value === selectedType)?.label || 'Clearance'} Form</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{clearanceTypes.find(ct => ct.value === selectedType)?.label || 'Clearance'} Form</h2>
            <DialogClose asChild>
              <button className="h-8 w-8 rounded hover:bg-blue-600 flex items-center justify-center" aria-label="Close">
                <span className="text-xl leading-none">×</span>
              </button>
            </DialogClose>
          </div>
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="form1">Form 1</TabsTrigger>
                <TabsTrigger value={secondTabKey}>{secondTabLabel}</TabsTrigger>
              </TabsList>
              <TabsContent value="form1">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Control No. (Preview)</Label>
                    <Input value={controlPreview || ''} disabled className="bg-gray-50 font-mono text-sm mt-1" />
                    <p className="text-xs text-gray-500 mt-1">This is a preview. The actual control number will be generated upon creation.</p>
                  </div>
                  <div>
                    <Label>Name of Worker</Label>
                    <Input value={formName} onChange={(e)=> { setFormName(e.target.value.toUpperCase()); setValidationErrors(v=>({ ...v, name: '' })) }} className="mt-1" placeholder="First Name M.I Last Name" />
                    {validationErrors.name && <span className="text-xs text-red-500">{validationErrors.name}</span>}
                  </div>
                  <div>
                    <Label className="mb-1 block">Sex</Label>
                    <div className="mt-1.5 h-10 flex items-center px-1">
                      <RadioGroup value={formSex} onValueChange={(v)=> { setFormSex(v as any); setValidationErrors(val=>({ ...val, sex: '' })) }} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="bm-clearance-sex-male" />
                          <Label htmlFor="bm-clearance-sex-male" className="m-0">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="bm-clearance-sex-female" />
                          <Label htmlFor="bm-clearance-sex-female" className="m-0">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {validationErrors.sex && <span className="text-xs text-red-500">{validationErrors.sex}</span>}
                  </div>
                  <div>
                    <Label>Jobsite</Label>
                    <Input value={formDestination} onChange={(e)=> { setFormDestination(e.target.value.toUpperCase()); setValidationErrors(v=>({ ...v, destination: '' })) }} className="mt-1" placeholder="Country" />
                    {validationErrors.destination && <span className="text-xs text-red-500">{validationErrors.destination}</span>}
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input className="mt-1" placeholder="Position" value={position} onChange={(e)=> setPosition(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <Label>Salary</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" min="0" step="0.01" value={formSalary} onChange={(e)=> { setFormSalary(e.target.value); setValidationErrors(v=>({ ...v, salary: '' })) }} placeholder="Enter salary amount" />
                      <select className="w-28 border rounded px-3 py-2 text-sm" value={salaryCurrency} onChange={(e)=> setSalaryCurrency((e.target.value || '') as any)}>
                        <option value="">----</option>
                        {AVAILABLE_CURRENCIES.map(c => (<option key={c.value} value={c.value}>{c.value}</option>))}
                      </select>
                    </div>
                    {validationErrors.salary && <span className="text-xs text-red-500">{validationErrors.salary}</span>}
                    {formSalary && salaryCurrency && salaryCurrency !== 'USD' && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                        USD Equivalent: {getUSDEquivalent(parseFloat(formSalary || '0'), salaryCurrency as any)}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Employer</Label>
                    <Input value={formEmployer} onChange={(e)=> { setFormEmployer(e.target.value.toUpperCase()); setValidationErrors(v=>({ ...v, employer: '' })) }} className="mt-1" placeholder="Employer name" />
                    {validationErrors.employer && <span className="text-xs text-red-500">{validationErrors.employer}</span>}
                  </div>
                  
                </div>
                {/* Type-specific sections */}
                {/* All type-specific fields are moved to Form 2 now */}
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm() }}>Cancel</Button>
                  <Button className="bg-[#1976D2] text-white px-8" onClick={() => {
                    const errs = validateForm1();
                    if (errs.length) { toast({ title: 'Validation Error', description: errs[0], variant: 'destructive' }); return }
                    setActiveTab(secondTabKey)
                  }}>Next</Button>
                </div>
              </TabsContent>
              <TabsContent value={secondTabKey}>
                {selectedType === 'watchlisted_employer' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Date of Arrival</Label>
                        <Input type="date" className="mt-1" value={dateArrival} onChange={(e)=> setDateArrival(e.target.value)} />
                      </div>
                      <div>
                        <Label>Date of Departure</Label>
                        <Input type="date" className="mt-1" value={dateDeparture} onChange={(e)=> setDateDeparture(e.target.value)} />
                      </div>
                      <div>
                        <Label>No. of Years with the Principal</Label>
                        <Input type="number" className="mt-1" placeholder="0" value={yearsWithPrincipal} onChange={(e)=> setYearsWithPrincipal(e.target.value)} />
                      </div>
                      <div>
                        <Label>Remarks</Label>
                        <Textarea className="mt-1" placeholder="Remarks (optional)" value={remarks} onChange={(e)=> setRemarks(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveTab('form1')}>Back</Button>
                        <Button onClick={handleCreate} className="bg-[#1976D2] text-white px-8" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
                      </div>
                    </div>
                  </>
                ) : selectedType === 'critical_skill' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Date of Arrival</Label>
                        <Input type="date" className="mt-1" value={dateArrival} onChange={(e)=> setDateArrival(e.target.value)} />
                      </div>
                      <div>
                        <Label>Name of the New Principal</Label>
                        <Input className="mt-1" placeholder="Name of the new principal" value={newPrincipalName} onChange={(e)=> setNewPrincipalName(e.target.value.toUpperCase())} />
                      </div>
                      <div>
                        <Label>Date of Departure</Label>
                        <Input type="date" className="mt-1" value={dateDeparture} onChange={(e)=> setDateDeparture(e.target.value)} />
                      </div>
                      <div>
                        <Label>Employment Duration</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Input type="date" className="w-auto" value={employmentDurationStart} onChange={(e)=> setEmploymentDurationStart(e.target.value)} />
                          <span className="text-gray-600">to</span>
                          <Input type="date" className="w-auto" value={employmentDurationEnd} onChange={(e)=> setEmploymentDurationEnd(e.target.value)} />
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <Label>Remarks</Label>
                        <Textarea className="mt-1" placeholder="Remarks (optional)" value={remarks} onChange={(e)=> setRemarks(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveTab('form1')}>Back</Button>
                        <Button onClick={handleCreate} className="bg-[#1976D2] text-white px-8" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
                      </div>
                    </div>
                  </>
                ) : selectedType === 'for_assessment_country' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Employment Start Date (based on the Employment Certificate)</Label>
                        <Input type="date" className="mt-1" value={employmentStartDate} onChange={(e)=> setEmploymentStartDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Applicant Processed Date</Label>
                        <Input type="date" className="mt-1" value={processingDate} onChange={(e)=> setProcessingDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Date of Arrival</Label>
                        <Input type="date" className="mt-1" value={dateArrival} onChange={(e)=> setDateArrival(e.target.value)} />
                      </div>
                      <div>
                        <Label>No. of Month(s)/Year(s) with the Principal</Label>
                        <Input className="mt-1" placeholder="e.g., 2 years 6 months" value={noOfMonthsYears} onChange={(e)=> setNoOfMonthsYears(e.target.value)} />
                      </div>
                      <div>
                        <Label>Date of Departure</Label>
                        <Input type="date" className="mt-1" value={dateOfDeparture} onChange={(e)=> setDateOfDeparture(e.target.value)} />
                      </div>
                      <div>
                        <Label>Remarks</Label>
                        <Textarea className="mt-1" placeholder="Remarks (optional)" value={remarks} onChange={(e)=> setRemarks(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveTab('form1')}>Back</Button>
                        <Button onClick={handleCreate} className="bg-[#1976D2] text-white px-8" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Date of Arrival</Label>
                        <Input type="date" className="mt-1" value={dateArrival} onChange={(e)=> setDateArrival(e.target.value)} />
                      </div>
                      <div>
                        <Label>Name of the New Principal</Label>
                        <Input className="mt-1" placeholder="Name of the new principal" value={newPrincipalName} onChange={(e)=> setNewPrincipalName(e.target.value.toUpperCase())} />
                      </div>
                      <div>
                        <Label>Date of Departure</Label>
                        <Input type="date" className="mt-1" value={dateDeparture} onChange={(e)=> setDateDeparture(e.target.value)} />
                      </div>
                      <div>
                        <Label>Employment Duration</Label>
                        <Input className="mt-1" placeholder="Employment duration" value={employmentDuration} onChange={(e)=> setEmploymentDuration(e.target.value.toUpperCase())} />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Remarks</Label>
                        <Textarea className="mt-1" placeholder="Remarks (optional)" value={remarks} onChange={(e)=> setRemarks(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveTab('form1')}>Back</Button>
                        <Button onClick={handleCreate} className="bg-[#1976D2] text-white px-8" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      {/* View Clearance Modal */}
      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setSelectedClearance(null) }}>
        <DialogContent className="max-w-2xl w-full p-0 rounded-2xl overflow-hidden">
          <div className="bg-[#1976D2] text-white px-8 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{selectedClearance ? `${(selectedClearance.clearance_type || '').replace(/_/g,' ').replace(/\b\w/g, (c) => c.toUpperCase())} Details` : 'Clearance Details'}</DialogTitle>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          {selectedClearance && (
            <div className="px-8 py-6 max-h-[80vh] overflow-y-auto">
              <div className="font-semibold text-gray-700 mb-2">Personal Information</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Control No.:</div>
                  <div className="font-medium">{selectedClearance.control_number}</div>
                </div>
                <div>
                  <div className="text-gray-500">Type:</div>
                  <div className="font-medium capitalize">{selectedClearance.clearance_type.replace(/_/g,' ')}</div>
                </div>
                <div>
                  <div className="text-gray-500">Name of Worker:</div>
                  <div className="font-medium">{selectedClearance.name_of_worker}</div>
                </div>
                <div>
                  <div className="text-gray-500">Sex:</div>
                  <div className="font-medium capitalize">{selectedClearance.sex}</div>
                </div>
                <div>
                  <div className="text-gray-500">Employer:</div>
                  <div className="font-medium">{selectedClearance.employer}</div>
                </div>
                <div>
                  <div className="text-gray-500">Destination:</div>
                  <div className="font-medium">{selectedClearance.destination}</div>
                </div>
                <div>
                  <div className="text-gray-500">Salary:</div>
                  <div className="font-medium">${selectedClearance.salary.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Created:</div>
                  <div className="font-medium">{new Date((selectedClearance as any).created_at).toLocaleString()}</div>
                </div>
              </div>
              <hr className="border-gray-300 my-6" />
              {/* Type-specific / additional fields */}
              {(selectedClearance.position || selectedClearance.months_years || selectedClearance.with_principal || selectedClearance.new_principal_name || selectedClearance.employment_duration || selectedClearance.date_arrival || selectedClearance.date_departure || selectedClearance.place_date_employment || selectedClearance.date_blacklisting || selectedClearance.total_deployed_ofws === 0 || selectedClearance.total_deployed_ofws || selectedClearance.reason_blacklisting || selectedClearance.years_with_principal === 0 || selectedClearance.years_with_principal || selectedClearance.remarks) && (
              <div className="mt-6">
                <div className="font-semibold text-gray-700 mb-2">Additional details</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {selectedClearance.position && (
                    <div>
                      <div className="text-gray-500">Position:</div>
                      <div className="font-medium">{selectedClearance.position}</div>
                    </div>
                  )}
                  {selectedClearance.months_years && (
                    <div>
                      <div className="text-gray-500">Months/Years:</div>
                      <div className="font-medium">{selectedClearance.months_years}</div>
                    </div>
                  )}
                  {selectedClearance.with_principal && (
                    <div>
                      <div className="text-gray-500">With Principal:</div>
                      <div className="font-medium">{selectedClearance.with_principal}</div>
                    </div>
                  )}
                  {selectedClearance.new_principal_name && (
                    <div>
                      <div className="text-gray-500">New Principal Name:</div>
                      <div className="font-medium">{selectedClearance.new_principal_name}</div>
                    </div>
                  )}
                  {selectedClearance.employment_duration && (
                    <div>
                      <div className="text-gray-500">Employment Duration:</div>
                      <div className="font-medium">{selectedClearance.employment_duration}</div>
                    </div>
                  )}
                  {selectedClearance.date_arrival && (
                    <div>
                      <div className="text-gray-500">Date of Arrival:</div>
                      <div className="font-medium">{new Date(selectedClearance.date_arrival).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                  )}
                  {selectedClearance.date_departure && (
                    <div>
                      <div className="text-gray-500">Date of Departure:</div>
                      <div className="font-medium">{new Date(selectedClearance.date_departure).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                  )}
                  {selectedClearance.place_date_employment && (
                    <div>
                      <div className="text-gray-500">Place and Date of Employment:</div>
                      <div className="font-medium">{selectedClearance.place_date_employment}</div>
                    </div>
                  )}
                  {selectedClearance.date_blacklisting && (
                    <div>
                      <div className="text-gray-500">Date of Blacklisting:</div>
                      <div className="font-medium">{new Date(selectedClearance.date_blacklisting).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                  )}
                  {(selectedClearance.total_deployed_ofws || selectedClearance.total_deployed_ofws === 0) && (
                    <div>
                      <div className="text-gray-500">Total Deployed OFWs:</div>
                      <div className="font-medium">{selectedClearance.total_deployed_ofws}</div>
                    </div>
                  )}
                  {selectedClearance.reason_blacklisting && (
                    <div>
                      <div className="text-gray-500">Reason of Blacklisting:</div>
                      <div className="font-medium">{selectedClearance.reason_blacklisting}</div>
                    </div>
                  )}
                  {(selectedClearance.years_with_principal || selectedClearance.years_with_principal === 0) && (
                    <div>
                      <div className="text-gray-500">Years with Principal:</div>
                      <div className="font-medium">{selectedClearance.years_with_principal}</div>
                    </div>
                  )}
                  {selectedClearance.remarks && (
                    <div className="col-span-2">
                      <div className="text-gray-500">Remarks:</div>
                      <div className="font-medium">{selectedClearance.remarks}</div>
                    </div>
                  )}
                  {selectedClearance.completed_at && (
                    <div className="col-span-2">
                      <div className="text-gray-500">Documents Completed:</div>
                      <div className="font-medium text-green-600">
                        {new Date(selectedClearance.completed_at).toLocaleDateString('en-US', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
              <hr className="border-gray-300 my-6" />
              <div>
                <div className="font-semibold text-gray-700 mb-2">Documents</div>
                
                {/* Generate and New buttons - Always show for For Assessment Country */}
                {selectedClearance?.clearance_type === 'for_assessment_country' && (
                  <div className="flex gap-2 mb-3">
                    <Button
                      className="bg-[#1976D2] text-white text-xs"
                      onClick={async () => {
                        try {
                          console.log('Generating document for clearance ID:', selectedClearance.id)
                          const res = await fetch(`/api/balik-manggagawa/clearance/${selectedClearance.id}/generate`, { method: 'POST' })
                          console.log('Response status:', res.status)
                          const result = await res.json()
                          console.log('Response result:', result)
                          if (result.success) {
                            setDocumentsRefreshTrigger(prev => prev + 1)
                            toast({ title: 'Document generated', description: 'Clearance document has been attached.' })
                          } else {
                            throw new Error(result.error || 'Generation failed')
                          }
                        } catch (err) {
                          console.error('Generation error:', err)
                          toast({ title: 'Generation error', description: err instanceof Error ? err.message : 'Failed to generate the document.', variant: 'destructive' })
                        }
                      }}
                    >
                      Generate
                    </Button>
                    <Button 
                      className="bg-[#1976D2] text-white text-xs"
                      onClick={() => setUploadModalOpen(true)}
                    >
                      + New
                    </Button>
                  </div>
                )}
                
                {/* Processing Documents Section - Show if applicant came from processing */}
                {selectedClearance?.documents_completed && (
                  <div className="mb-6">
                    <div className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Processing Documents (Completed)
                    </div>
                    <div className="space-y-2">
                      {selectedClearance.personal_letter_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Personal Letter</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.personal_letter_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.valid_passport_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Valid Passport</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.valid_passport_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.work_visa_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Work Visa</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.work_visa_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.employment_contract_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Employment Contract</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.employment_contract_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.employment_certificate_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Employment Certificate</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.employment_certificate_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.last_arrival_email_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Last Arrival Email</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.last_arrival_email_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                      {selectedClearance.flight_ticket_file && (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Flight Ticket</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/documents/download/${selectedClearance.flight_ticket_file}`, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Completed on: {selectedClearance.completed_at ? new Date(selectedClearance.completed_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                )}

                {/* Show regular documents section for For Assessment Country (additional documents) */}
                {selectedClearance?.clearance_type === 'for_assessment_country' && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Additional Documents</div>
                    {selectedClearance && (
                      <ApplicantDocumentsListBM 
                        applicationId={selectedClearance.id}
                        refreshTrigger={documentsRefreshTrigger}
                        onRefresh={() => setDocumentsRefreshTrigger(prev => prev + 1)}
                        onViewPDF={(documentId, documentName) => {
                          setSelectedDocument({ id: documentId, name: documentName })
                          setPdfViewerOpen(true)
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Show regular documents section for non-For Assessment Country types */}
                {selectedClearance?.clearance_type !== 'for_assessment_country' && (
                  <>
                    <div className="flex gap-2 mb-3">
                      <Button
                        className="bg-[#1976D2] text-white text-xs"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/balik-manggagawa/clearance/${selectedClearance.id}/generate`, { method: 'POST' })
                            const result = await res.json()
                            if (result.success) {
                              setDocumentsRefreshTrigger(prev => prev + 1)
                              toast({ title: 'Document generated', description: 'Clearance document has been attached.' })
                            } else {
                              throw new Error(result.error || 'Generation failed')
                            }
                          } catch (err) {
                            toast({ title: 'Generation error', description: 'Failed to generate the document.', variant: 'destructive' })
                          }
                        }}
                      >
                        Generate
                      </Button>
                      <Button 
                        className="bg-[#1976D2] text-white text-xs"
                        onClick={() => setUploadModalOpen(true)}
                      >
                        + New
                      </Button>
                    </div>
                    {selectedClearance && (
                      <ApplicantDocumentsListBM 
                        applicationId={selectedClearance.id}
                        refreshTrigger={documentsRefreshTrigger}
                        onRefresh={() => setDocumentsRefreshTrigger(prev => prev + 1)}
                        onViewPDF={(documentId, documentName) => {
                          setSelectedDocument({ id: documentId, name: documentName })
                          setPdfViewerOpen(true)
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Upload New Document</DialogTitle>
          {selectedClearance && (
            <DocumentUploadFormBM 
              applicationId={selectedClearance.id}
              onSuccess={() => {
                setUploadModalOpen(false)
                setDocumentsRefreshTrigger(prev => prev + 1)
                toast({ title: 'Document uploaded', description: 'Document has been uploaded successfully' })
              }}
              onError={(error) => {
                console.error('Upload error:', error)
                toast({ title: 'Upload Error', description: error, variant: 'destructive' })
              }}
              onCancel={() => setUploadModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer */}
      {selectedDocument && (
        <PDFViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => { setPdfViewerOpen(false); setSelectedDocument(null) }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
        />
      )}

      {/* Password Confirmation Dialog */}
      <Dialog open={confirmPasswordOpen} onOpenChange={(open) => {
        setConfirmPasswordOpen(open)
        if (!open) setConfirmPassword("")
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter your password to view deleted clearances.</p>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConfirmPassword()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfirmPasswordOpen(false); setConfirmPassword("") }}>Cancel</Button>
              <Button
                className="bg-[#1976D2] text-white"
                onClick={handleConfirmPassword}
                disabled={confirmingPassword || !confirmPassword}
              >
                {confirmingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 

// BM Documents List (mirrors Direct Hire list with application_type filter)
function ApplicantDocumentsListBM({ applicationId, refreshTrigger, onRefresh, onViewPDF }: { applicationId: string, refreshTrigger: number, onRefresh?: () => void, onViewPDF?: (id: string, name: string) => void }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/documents?applicationId=${applicationId}&applicationType=balik_manggagawa_clearance`)
        const result = await response.json()
        if (result.success) setDocuments(result.data)
      } catch {
        toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    if (applicationId) fetchDocuments()
  }, [applicationId, refreshTrigger])

  const getExtension = (fileName: string, mime: string) => {
    const lower = (fileName || '').toLowerCase()
    const idx = lower.lastIndexOf('.')
    let ext = idx > -1 ? lower.slice(idx + 1) : ''
    if (!ext) {
      if ((mime || '').includes('pdf')) ext = 'pdf'
      else if ((mime || '').includes('png')) ext = 'png'
      else if ((mime || '').includes('jpeg') || (mime || '').includes('jpg')) ext = 'jpg'
      else if ((mime || '').includes('wordprocessingml')) ext = 'docx'
      else if ((mime || '').includes('msword')) ext = 'doc'
    }
    return ext
  }

  const formatDisplayName = (doc: Document) => {
    const ext = getExtension(doc.file_name, doc.mime_type)
    return ext ? `${doc.document_type}.${ext}` : doc.document_type
  }

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const filename = doc.file_name || formatDisplayName(doc)
      const link = window.document.createElement('a')
      link.href = url
      link.download = filename
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Download Error', description: 'Failed to download document', variant: 'destructive' })
    }
  }

  const handleUpdateName = async (document: Document) => {
    if (!editName.trim()) { toast({ title: 'Error', description: 'Document name cannot be empty', variant: 'destructive' }); return }
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentName: editName.trim() }) })
      const result = await res.json()
      if (result.success) {
        setDocuments(d => d.map(doc => doc.id === document.id ? { ...doc, document_type: editName.trim() } : doc))
        setEditingDocument(null); setEditName(''); onRefresh?.(); toast({ title: 'Document updated', description: 'Document name has been updated' })
      } else throw new Error(result.error || 'Update failed')
    } catch (e) {
      toast({ title: 'Update Error', description: e instanceof Error ? e.message : 'Failed to update document', variant: 'destructive' })
    }
  }

  const handleDelete = async (document: Document) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${document.file_name}?`)
    if (!confirmDelete) return
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) { setDocuments(d => d.filter(doc => doc.id !== document.id)); onRefresh?.(); toast({ title: 'Document deleted', description: `${document.file_name} has been removed` }) }
      else throw new Error(result.error || 'Delete failed')
    } catch {
      toast({ title: 'Delete Error', description: 'Failed to delete document', variant: 'destructive' })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-4 text-sm text-gray-600">
      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading documents...
    </div>
  )
  if (documents.length === 0) return <div className="text-center py-4 text-gray-500 text-sm">No documents uploaded yet</div>

  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <div key={document.id} className="relative flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-center space-x-3">
            <FileText className="h-4 w-4 text-green-600" />
            {editingDocument === document.id ? (
              <div className="flex items-center gap-2">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm border rounded px-2 py-1" />
                <Button size="sm" onClick={() => handleUpdateName(document)} className="h-6 px-2 text-xs">Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingDocument(null); setEditName('') }} className="h-6 px-2 text-xs">Cancel</Button>
              </div>
            ) : (
              <span className="text-sm font-medium">{formatDisplayName(document)}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload(document)}>
                  <Download className="h-4 w-4 mr-2" />
                  {(() => {
                    const ext = getExtension(document.file_name, document.mime_type)
                    const label = ext ? ext.toUpperCase() : 'FILE'
                    return `Download ${label}`
                  })()}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditingDocument(document.id); setEditName(document.document_type) }}><Edit className="h-4 w-4 mr-2" />Edit Name</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(document)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}

function DocumentUploadFormBM({ applicationId, onSuccess, onError, onCancel }: { applicationId: string, onSuccess: () => void, onError: (e: string) => void, onCancel: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) { onError('Please select a file and enter a document name'); return }
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('applicationId', applicationId)
      formData.append('applicationType', 'balik_manggagawa_clearance')
      formData.append('documentName', documentName.trim())
      const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      const result = await response.json()
      if (result.success) onSuccess(); else throw new Error(result.error || 'Upload failed')
    } catch (e) { onError(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
  }
  return (
    <div className="space-y-4">
      <div>
        <Label>Document Name</Label>
        <Input type="text" value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="Enter document name (e.g., Clearance, Passport, Employment Contract)" />
      </div>
      <div>
        <Label>File</Label>
        <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" />
        <p className="text-xs text-gray-500 mt-1">JPEG, PNG, PDF, DOC, DOCX (Max 5MB)</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>Cancel</Button>
        <Button onClick={handleUpload} disabled={uploading || !selectedFile || !documentName.trim()} className="bg-[#1976D2] text-white">
          {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>) : 'Upload'}
        </Button>
      </div>
    </div>
  )
} 