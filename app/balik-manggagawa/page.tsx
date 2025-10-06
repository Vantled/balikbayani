// app/balik-manggagawa/page.tsx
"use client"

import Header from "@/components/shared/header"
import { useBalikManggagawaClearance } from "@/hooks/use-balik-manggagawa-clearance"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, Search, Plus, MoreHorizontal, Eye, Edit, Trash2, FileText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { AVAILABLE_CURRENCIES, getUSDEquivalentAsync, type Currency } from "@/lib/currency-converter"

export default function BalikManggagawaPage() {
  const { clearances, loading, error, pagination, fetchClearances, createClearance } = useBalikManggagawaClearance()

  const [search, setSearch] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState({
    clearanceType: "",
    sex: "",
    dateFrom: "",
    dateTo: "",
    jobsite: "",
    position: "",
    showDeletedOnly: false,
  })

  // create form minimal, matching hook schema
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    nameOfWorker: "",
    sex: "" as "male" | "female" | "",
    employer: "",
    destination: "",
    salary: "",
    position: "",
    job_type: "" as 'household' | 'professional' | '',
    salaryCurrency: "" as Currency | '',
  })
  const [controlPreview, setControlPreview] = useState("")
  const [creating, setCreating] = useState(false)
  const [usdDisplay, setUsdDisplay] = useState<string>("")
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editData, setEditData] = useState({
    nameOfWorker: "",
    sex: "" as "male" | "female" | "",
    employer: "",
    destination: "",
    position: "",
    salary: "",
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    fetchClearances({ page: 1, limit: 10 })
  }, [fetchClearances])

  const applyFilters = () => {
    fetchClearances({
      page: 1,
      limit: pagination.limit,
      search,
      clearanceType: filters.clearanceType,
      sex: filters.sex,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      jobsite: filters.jobsite,
      position: filters.position,
      showDeletedOnly: filters.showDeletedOnly,
    })
    setShowFilter(false)
  }
  
  useEffect(() => {
    const compute = async () => {
      if (!formData.salary || isNaN(parseFloat(formData.salary)) || !formData.salaryCurrency) {
        setUsdDisplay("")
        return
      }
      const val = await getUSDEquivalentAsync(parseFloat(formData.salary), formData.salaryCurrency)
      setUsdDisplay(val)
    }
    compute()
  }, [formData.salary, formData.salaryCurrency])

  const resetFilters = () => {
    setFilters({ clearanceType: "", sex: "", dateFrom: "", dateTo: "", jobsite: "", position: "", showDeletedOnly: false })
    fetchClearances({ page: 1, limit: pagination.limit, search: "" })
    setSearch("")
    setShowFilter(false)
  }

  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa</h2>
            <p className="text-sm text-gray-600 mt-1">Manage BM clearances</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e)=> { if (e.key === 'Enter') applyFilters() }}
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

            <Button className="bg-[#1976D2] text-white h-9 flex items-center gap-2" onClick={() => {
              setIsCreateOpen(true)
              // Fetch BM control number preview
              fetch(`/api/balik-manggagawa/clearance/preview?type=BM`).then(r=>r.json()).then(res=>{
                if (res?.success) setControlPreview(res.data.preview)
                else setControlPreview("")
              }).catch(()=> setControlPreview(""))
            }}><Plus className="h-4 w-4" /> Create</Button>

            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-1">Type of Clearance</div>
                <Select value={filters.clearanceType || 'all'} onValueChange={(v)=> setFilters(f=>({ ...f, clearanceType: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="for_assessment_country">For Assessment Country</SelectItem>
                    <SelectItem value="non_compliant_country">Non Compliant Country</SelectItem>
                    <SelectItem value="watchlisted_similar_name">Watchlisted OFW</SelectItem>
                  </SelectContent>
                </Select>

                <div className="font-semibold mb-1">Sex</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_filter"
                      value="female"
                      checked={filters.sex === 'female'}
                      onChange={() => setFilters(f=>({ ...f, sex: 'female' }))}
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_filter"
                      value="male"
                      checked={filters.sex === 'male'}
                      onChange={() => setFilters(f=>({ ...f, sex: 'male' }))}
                    />
                    Male
                  </label>
                  <Button variant="ghost" size="sm" onClick={()=> setFilters(f=>({ ...f, sex: '' }))}>Clear</Button>
                </div>

                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" value={filters.dateFrom} onChange={(e)=> setFilters(f=>({ ...f, dateFrom: e.target.value }))} />
                <Input type="date" className="mb-2" value={filters.dateTo} onChange={(e)=> setFilters(f=>({ ...f, dateTo: e.target.value }))} />
                <div className="font-semibold mb-1">Destination</div>
                <Input type="text" className="mb-2" value={filters.jobsite} onChange={(e)=> setFilters(f=>({ ...f, jobsite: e.target.value }))} />
                <div className="font-semibold mb-1">Position</div>
                <Input type="text" className="mb-2" value={filters.position} onChange={(e)=> setFilters(f=>({ ...f, position: e.target.value }))} />

              <div className="flex items-center gap-2 mt-1">
                <input
                  id="bm_show_deleted_only"
                  type="checkbox"
                  checked={filters.showDeletedOnly}
                  onChange={(e)=> setFilters(f=>({ ...f, showDeletedOnly: e.target.checked }))}
                />
                <label htmlFor="bm_show_deleted_only" className="text-xs">Show deleted only</label>
              </div>

                <div className="flex justify-between gap-2 mt-2">
                  <Button variant="outline" className="w-1/2" onClick={resetFilters}>Clear</Button>
                  <Button className="w-1/2 bg-[#1976D2] text-white" onClick={applyFilters}>Apply</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls - Above table container */}
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
            </div>
            <div className="flex items-center gap-1">
              {(() => {
                const pages: any[] = []
                const totalPages = pagination.totalPages
                const currentPage = pagination.page
                const go = (p: number) => fetchClearances({
                  page: p,
                  limit: pagination.limit,
                  search,
                  clearanceType: filters.clearanceType,
                  sex: filters.sex,
                  dateFrom: filters.dateFrom,
                  dateTo: filters.dateTo,
                  jobsite: filters.jobsite,
                  position: filters.position,
                  showDeletedOnly: filters.showDeletedOnly,
                })

                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(i)} className="min-w-[40px] h-8">{i}</Button>
                    )
                  }
                } else {
                  let startPage = Math.max(1, currentPage - 2)
                  let endPage = Math.min(totalPages, startPage + 4)
                  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)
                  if (startPage > 1) {
                    pages.push(<Button key={1} variant={1 === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(1)} className="min-w-[40px] h-8">1</Button>)
                    if (startPage > 2) pages.push(<span key="bm-ellipses-start" className="px-2 text-gray-500">...</span>)
                  }
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(i)} className="min-w-[40px] h-8">{i}</Button>
                    )
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="bm-ellipses-end" className="px-2 text-gray-500">...</span>)
                    pages.push(<Button key={totalPages} variant={totalPages === currentPage ? 'default' : 'outline'} size="sm" onClick={() => go(totalPages)} className="min-w-[40px] h-8">{totalPages}</Button>)
                  }
                }
                return pages
              })()}
            </div>
          </div>
        {/* Table placeholder: reuse existing clearance list via hook */}
        <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1976D2] text-white">
                  <th className="py-3 px-4 font-medium">Control No.</th>
                  <th className="py-3 px-4 font-medium">Name of Worker</th>
                  <th className="py-3 px-4 font-medium">Sex</th>
                  <th className="py-3 px-4 font-medium">Destination</th>
                  <th className="py-3 px-4 font-medium">Employer</th>
                  <th className="py-3 px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="py-8 text-center text-red-500">{error}</td></tr>
                ) : clearances.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No records found</td></tr>
                ) : clearances.map((row: any, i: number) => (
                  <tr key={row.id ?? i} className="hover:bg-gray-150 transition-colors duration-75">
                    <td className="py-3 px-4 text-center">{row.control_number || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-center">{row.name_of_worker}</td>
                    <td className="py-3 px-4 text-center">{(row.sex || '').toUpperCase()}</td>
                    <td className="py-3 px-4 text-center">{row.destination}</td>
                    <td className="py-3 px-4 text-center">{row.employer || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`)
                              const json = await res.json()
                              if (json.success) {
                                setSelected(json.data)
                                setViewOpen(true)
                              } else {
                                toast({ title: 'Failed to load', description: json.error || 'Not found', variant: 'destructive' })
                              }
                            } catch {}
                          }}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const res = await fetch(`/api/balik-manggagawa/clearance/${row.id}`)
                              const json = await res.json()
                              if (json.success) {
                                const d = json.data
                                setSelected(d)
                                setEditData({
                                  nameOfWorker: d.name_of_worker || '',
                                  sex: d.sex || '',
                                  employer: d.employer || '',
                                  destination: d.destination || '',
                                  position: d.position || '',
                                  salary: d.salary != null ? String(d.salary) : '',
                                })
                                setEditOpen(true)
                              } else {
                                toast({ title: 'Failed to load', description: json.error || 'Not found', variant: 'destructive' })
                              }
                            } catch {}
                          }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelected(row); setDeleteConfirmOpen(true) }} className="text-red-600 focus:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast({ title: 'Clearance', description: 'Generate/View Clearance' })}>
                            <FileText className="h-4 w-4 mr-2" /> Clearance
                          </DropdownMenuItem>
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

      {/* Create BM Clearance Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(o)=> { setIsCreateOpen(o); if (!o) { setFormData({ nameOfWorker: "", sex: "", employer: "", destination: "", salary: "", position: "", job_type: "", salaryCurrency: "" }); setControlPreview("") } }}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl w-[95vw]">
          <DialogTitle className="sr-only">Create BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Create BM Application</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Control No. (Preview)</Label>
                <Input value={controlPreview || ''} disabled className="bg-gray-50 font-mono text-sm mt-1" />
                <p className="text-xs text-gray-500 mt-1">Prefix is BM. Actual number is generated on create.</p>
              </div>
              <div>
                <Label>Name of Worker</Label>
                <Input value={formData.nameOfWorker} onChange={(e)=> setFormData(f=>({ ...f, nameOfWorker: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Name (FIRST M.I LAST)" />
              </div>
              <div>
                <Label>Sex</Label>
                <div className="mt-1 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_create"
                      value="female"
                      checked={formData.sex === 'female'}
                      onChange={() => setFormData(f=>({ ...f, sex: 'female' }))}
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="bm_sex_create"
                      value="male"
                      checked={formData.sex === 'male'}
                      onChange={() => setFormData(f=>({ ...f, sex: 'male' }))}
                    />
                    Male
                  </label>
                </div>
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={formData.destination} onChange={(e)=> setFormData(f=>({ ...f, destination: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Country" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Position</Label>
                  </div>
                  <div className="w-40">
                    <Label>Job Type</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input value={formData.position} onChange={(e)=> setFormData(f=>({ ...f, position: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Position" />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={formData.job_type}
                      onChange={(e)=> setFormData(f=>({ ...f, job_type: e.target.value as 'household' | 'professional' }))}
                    >
                      <option value="">----</option>
                      <option value="professional">Professional</option>
                      <option value="household">Household</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <Label>Employer</Label>
                <Input value={formData.employer} onChange={(e)=> setFormData(f=>({ ...f, employer: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Employer Name" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <Label>Salary (per month)</Label>
                  </div>
                  <div className="w-40">
                    <Label>Currency</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      value={formData.salary} 
                      onChange={(e)=> setFormData(f=>({ ...f, salary: e.target.value }))} 
                      className="mt-1" 
                      placeholder="Enter Salary Amount" 
                    />
                  </div>
                  <div className="w-40">
                    <select 
                      className="w-full border rounded px-3 py-2.5 text-sm h-10 mt-1"
                      value={formData.salaryCurrency}
                      onChange={(e)=> setFormData(f=>({ ...f, salaryCurrency: e.target.value as Currency }))}
                    >
                      <option value="">----</option>
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
                    <span className="text-sm text-blue-700">
                      USD Equivalent: {usdDisplay}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=> setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-[#1976D2] text-white" disabled={creating} onClick={async ()=>{
                if (!formData.nameOfWorker || !formData.sex || !formData.destination || !formData.position) {
                  toast({ title: 'Missing fields', description: 'Please complete required fields.', variant: 'destructive' });
                  return;
                }
                setCreating(true)
                // Persist salary in USD; backend currently expects a number
                const numericSalary = formData.salary !== '' ? Number(formData.salary) : 0
                const salaryUsd = formData.salaryCurrency && numericSalary
                  ? (formData.salaryCurrency === 'USD' ? numericSalary : Number((await getUSDEquivalentAsync(numericSalary, formData.salaryCurrency)).replace(/[^0-9.]/g, '')))
                  : numericSalary
                const payload = {
                  nameOfWorker: formData.nameOfWorker,
                  sex: formData.sex as 'male' | 'female',
                  employer: formData.employer,
                  destination: formData.destination,
                  salary: salaryUsd,
                  position: formData.position || undefined,
                  // Optionally send additional context for future support
                  jobType: formData.job_type || undefined,
                  salaryCurrency: formData.salaryCurrency || undefined,
                }
                const res = await createClearance(payload)
                setCreating(false)
                if ((res as any)?.success) {
                  toast({ title: 'Created', description: 'BM clearance created successfully.' })
                  setIsCreateOpen(false)
                } else {
                  toast({ title: 'Error', description: (res as any)?.error || 'Failed to create', variant: 'destructive' })
                }
              }}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={(o)=> { setViewOpen(o); if (!o) setSelected(null) }}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden">
          <DialogTitle className="sr-only">View BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected?.name_of_worker ? `${selected.name_of_worker}'s BM Application` : 'View BM Application'}</h2>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <div className="text-gray-500">Control No.:</div>
              <div className="font-medium">{selected?.control_number || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Name of Worker:</div>
              <div className="font-medium">{selected?.name_of_worker || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Sex:</div>
              <div className="font-medium capitalize">{selected?.sex || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Employer:</div>
              <div className="font-medium">{selected?.employer || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Destination:</div>
              <div className="font-medium">{selected?.destination || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Position:</div>
              <div className="font-medium">{selected?.position || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Salary (USD):</div>
              <div className="font-medium">{selected?.salary != null ? `$${Number(selected.salary).toLocaleString()}` : '-'}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={(o)=> { setEditOpen(o); if (!o) { setSelected(null); setEditSaving(false) } }}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Edit BM Application</DialogTitle>
          <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{(editData.nameOfWorker || selected?.name_of_worker) ? `${(editData.nameOfWorker || selected?.name_of_worker)}'s BM Application` : 'Edit BM Application'}</h2>
            <DialogClose asChild>
              <button aria-label="Close" className="text-white text-2xl font-bold">×</button>
            </DialogClose>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Name of Worker</Label>
                <Input value={editData.nameOfWorker} onChange={(e)=> setEditData(d=>({ ...d, nameOfWorker: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Name (FIRST M.I LAST)" />
              </div>
              <div>
                <Label>Sex</Label>
                <div className="mt-1 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="bm_sex_edit" value="female" checked={editData.sex === 'female'} onChange={()=> setEditData(d=>({ ...d, sex: 'female' }))} /> Female
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="bm_sex_edit" value="male" checked={editData.sex === 'male'} onChange={()=> setEditData(d=>({ ...d, sex: 'male' }))} /> Male
                  </label>
                </div>
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={editData.destination} onChange={(e)=> setEditData(d=>({ ...d, destination: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Country" />
              </div>
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1"><Label>Position</Label></div>
                  <div className="w-40"><Label>Employer</Label></div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input value={editData.position} onChange={(e)=> setEditData(d=>({ ...d, position: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Position" />
                  </div>
                  <div className="w-40">
                    <Input value={editData.employer} onChange={(e)=> setEditData(d=>({ ...d, employer: e.target.value.toUpperCase() }))} className="mt-1" placeholder="Enter Employer" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Salary (USD)</Label>
                <Input type="number" value={editData.salary} onChange={(e)=> setEditData(d=>({ ...d, salary: e.target.value }))} className="mt-1" placeholder="Enter Salary (USD)" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=> setEditOpen(false)}>Cancel</Button>
              <Button className="bg-[#1976D2] text-white" disabled={editSaving} onClick={async ()=>{
                if (!selected?.id) return
                if (!editData.nameOfWorker || !editData.sex || !editData.destination || !editData.position || !editData.employer) {
                  toast({ title: 'Missing fields', description: 'Please complete required fields.', variant: 'destructive' });
                  return;
                }
                setEditSaving(true)
                try {
                  const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nameOfWorker: editData.nameOfWorker,
                      sex: editData.sex,
                      employer: editData.employer,
                      destination: editData.destination,
                      salary: Number(editData.salary || 0),
                      position: editData.position,
                    })
                  })
                  const json = await res.json()
                  if (json.success) {
                    toast({ title: 'Updated', description: 'BM application updated.' })
                    setEditOpen(false)
                    fetchClearances({ page: pagination.page, limit: pagination.limit })
                  } else {
                    toast({ title: 'Update failed', description: json.error || 'Failed to update', variant: 'destructive' })
                  }
                } finally {
                  setEditSaving(false)
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(o)=> { setDeleteConfirmOpen(o); if (!o) setSelected(null) }}>
        <DialogContent>
          <DialogTitle>Delete Application</DialogTitle>
          <div className="text-sm text-gray-700">
            Are you sure you want to delete the application for <strong>{selected?.name_of_worker || selected?.nameOfWorker || 'this applicant'}</strong>? This will move the application to deleted items where it can be restored later.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=> setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async ()=>{
              if (!selected?.id) return
              try {
                const res = await fetch(`/api/balik-manggagawa/clearance/${selected.id}`, { method: 'DELETE' })
                const json = await res.json()
                if (json.success) {
                  toast({ title: 'Deleted', description: 'Clearance moved to trash (soft delete).' })
                  setDeleteConfirmOpen(false)
                  fetchClearances({ page: pagination.page, limit: pagination.limit })
                } else {
                  toast({ title: 'Delete failed', description: json.error || 'Failed to delete', variant: 'destructive' })
                }
              } catch (e) {
                toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' })
              }
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 