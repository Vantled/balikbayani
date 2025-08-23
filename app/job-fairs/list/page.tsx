// app/job-fairs/list/page.tsx
"use client"

import { useState, useEffect } from "react"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Download, Plus, Filter } from "lucide-react"
import { useJobFairs } from "@/hooks/use-job-fairs"
import { useTableLastModified } from "@/hooks/use-table-last-modified"
import JobFairModal from "@/components/job-fair-modal"
import JobFairTable from "@/components/job-fair-table"
import JobFairDetails from "@/components/job-fair-details"
import JobFairFilterPanel from "@/components/job-fair-filter-panel"
import { JobFair } from "@/lib/types"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

export default function JobFairsListPage() {
  // Handle login success toast
  useLoginSuccessToast()
  
  const {
    jobFairs,
    pagination,
    loading,
    error,
    createJobFair,
    updateJobFair,
    deleteJobFair,
    fetchJobFairs,
    searchJobFairs
  } = useJobFairs()

  // Get last modified time for job_fairs table
  const { lastModified: jobFairsLastModified, refresh: refreshLastModified } = useTableLastModified({ tableName: 'job_fairs' })

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<JobFair | null>(null)
  const [viewingRecord, setViewingRecord] = useState<JobFair | null>(null)
  const [search, setSearch] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [panelQuery, setPanelQuery] = useState("")
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [userIsSuperadmin, setUserIsSuperadmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)


  // Filter states
  const [venueFilter, setVenueFilter] = useState("")
  const [officeHeadFilter, setOfficeHeadFilter] = useState("")
  const [dateWithin, setDateWithin] = useState("")
  const [isRescheduledFilter, setIsRescheduledFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  
  // Applied filter states (for title generation)
  const [appliedYearFilter, setAppliedYearFilter] = useState("all")
  const [appliedMonthFilter, setAppliedMonthFilter] = useState("all")

  // Parse search input for key:value filters and free-text terms
  const parseSearch = (input: string): { filters: Record<string, string>; terms: string[] } => {
    const tokens = input.split(/[\s,]+/).filter(Boolean)
    const filters: Record<string, string> = {}
    const terms: string[] = []
    for (const token of tokens) {
      const match = token.match(/^([a-z_]+):(.*)$/i)
      if (match && match[2] !== '') {
        filters[match[1].toLowerCase()] = match[2].toLowerCase()
      } else {
        terms.push(token.toLowerCase())
      }
    }
    return { filters, terms }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: JobFair) => {
    setEditingRecord(record)
    setModalOpen(true)
  }

  const handleView = (record: JobFair) => {
    setViewingRecord(record)
  }

  const handleDelete = async (id: string) => {
    await deleteJobFair(id)
    // Refresh the list with current showDeletedOnly state
    await fetchJobFairs(pagination.page, pagination.limit, showDeletedOnly)
    // Add a small delay to ensure the database trigger has executed
    setTimeout(() => {
      refreshLastModified()
    }, 500)
  }

  const handleRestore = async (id: string) => {
    // Refresh the list with current showDeletedOnly state after restore
    await fetchJobFairs(pagination.page, pagination.limit, showDeletedOnly)
    // Add a small delay to ensure the database trigger has executed
    setTimeout(() => {
      refreshLastModified()
    }, 500)
  }

  const handleModalSuccess = async () => {
    await fetchJobFairs(pagination.page, pagination.limit, showDeletedOnly)
    // Add a small delay to ensure the database trigger has executed
    setTimeout(() => {
      refreshLastModified()
    }, 500)
  }

  // Resolve superadmin on client after mount to keep SSR markup stable
  useEffect(() => {
    let mounted = true
    import('@/lib/auth').then(mod => {
      const u = mod.getUser()
      const isSuper = mod.isSuperadmin(u)
      if (mounted) {
        setUserIsSuperadmin(isSuper)
        setCurrentUser(u)
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Handle search changes
  useEffect(() => {
    if (search.trim()) {
      searchJobFairs(search, showDeletedOnly)
    } else {
      fetchJobFairs(1, pagination.limit, showDeletedOnly)
    }
  }, [search, showDeletedOnly])

  const clearPanel = () => {
    setVenueFilter("")
    setOfficeHeadFilter("")
    setDateWithin("")
    setIsRescheduledFilter("all")
    setYearFilter("all")
    setMonthFilter("all")
    setAppliedYearFilter("all")
    setAppliedMonthFilter("all")
    setPanelQuery("")
  }

  // Generate dynamic title based on applied filters
  const generateTitle = () => {
    const currentYear = new Date().getFullYear()
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]

    // Check if date range is applied (dateWithin contains a date range)
    if (dateWithin && dateWithin.includes("|")) {
      return "List of Job Fairs on CALABARZON"
    }

    if (appliedYearFilter !== "all" && appliedMonthFilter !== "all") {
      const monthName = months[parseInt(appliedMonthFilter) - 1]
      return `List of Job Fairs on CALABARZON for ${monthName} ${appliedYearFilter}`
    } else if (appliedYearFilter !== "all") {
      return `List of Job Fairs on CALABARZON for the Year ${appliedYearFilter}`
    } else if (appliedMonthFilter !== "all") {
      const monthName = months[parseInt(appliedMonthFilter) - 1]
      return `List of Job Fairs on CALABARZON for ${monthName} ${currentYear}`
    } else {
      return `List of Job Fairs on CALABARZON for the Year ${currentYear}`
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const exportFormat = format === 'excel' ? 'csv' : 'json';
      const url = `/api/job-fairs/export?format=${exportFormat}&search=${encodeURIComponent(search)}&showDeletedOnly=${showDeletedOnly}`;
      
      if (format === 'excel') {
        // Download CSV file
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'job-fairs.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // Download JSON file
        const response = await fetch(url);
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'job-fairs.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-[#1976D2]">{generateTitle()}</h2>
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                  placeholder="Search or key:value" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowFilter(!showFilter)}
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
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" 
                onClick={handleCreate}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Job Fair
              </Button>

              {/* Filter Panel */}
              {showFilter && (
                <JobFairFilterPanel 
                  onClose={() => setShowFilter(false)} 
                  onApply={(query) => {
                    setPanelQuery(query)
                    // Update applied filters for title generation
                    setAppliedYearFilter(yearFilter)
                    setAppliedMonthFilter(monthFilter)
                    setShowFilter(false)
                  }}
                  venue={venueFilter}
                  setVenue={setVenueFilter}
                  officeHead={officeHeadFilter}
                  setOfficeHead={setOfficeHeadFilter}
                  dateWithin={dateWithin}
                  setDateWithin={setDateWithin}
                  isRescheduled={isRescheduledFilter}
                  setIsRescheduled={setIsRescheduledFilter}
                  yearFilter={yearFilter}
                  setYearFilter={setYearFilter}
                  monthFilter={monthFilter}
                  setMonthFilter={setMonthFilter}
                  onClear={clearPanel}
                />
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}



          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
                </span>

              </div>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const currentPage = pagination.page;
                  
                  if (totalPages <= 7) {
                    // If 7 or fewer pages, show all pages
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchJobFairs(i, pagination.limit)}
                          className="min-w-[40px] h-8"
                        >
                          {i}
                        </Button>
                      );
                    }
                  } else {
                    // Dynamic pagination: show 5 pages around current page
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    
                    // Adjust if we're near the end
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }
                    
                    // Always show first page if not in range
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant={1 === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchJobFairs(1, pagination.limit)}
                          className="min-w-[40px] h-8"
                        >
                          1
                        </Button>
                      );
                      
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipses-start" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // Show the 5 pages around current page
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchJobFairs(i, pagination.limit)}
                          className="min-w-[40px] h-8"
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Always show last page if not in range
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipses-end" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={totalPages === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchJobFairs(totalPages, pagination.limit)}
                          className="min-w-[40px] h-8"
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                  }
                  
                  return pages;
                })()}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-md border overflow-hidden">
            <JobFairTable
              data={jobFairs}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onRestore={handleRestore}
              loading={loading}
              search={search}
              filterQuery={panelQuery}
              showDeletedOnly={showDeletedOnly}
              setShowDeletedOnly={setShowDeletedOnly}
              userIsSuperadmin={userIsSuperadmin}
              currentUser={currentUser}
            />
          </div>

          {/* Last Updated Timestamp */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>
              Last Updated: {jobFairsLastModified ? jobFairsLastModified.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : 'Loading...'}
            </span>
            <button 
              onClick={() => refreshLastModified()} 
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
                  <JobFairModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              initialData={editingRecord}
              onSuccess={handleModalSuccess}
            />
            
            {viewingRecord && (
              <JobFairDetails
                jobFair={viewingRecord}
                onClose={() => setViewingRecord(null)}
              />
            )}
    </div>
  )
} 