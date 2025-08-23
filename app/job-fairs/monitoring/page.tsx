// app/job-fairs/monitoring/page.tsx
"use client"

import { useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Download, Plus } from "lucide-react"
import { useJobFairMonitoring } from "@/hooks/use-job-fair-monitoring"
import { useTableLastModified } from "@/hooks/use-table-last-modified"
import JobFairMonitoringModal from "@/components/job-fair-monitoring-modal"
import JobFairMonitoringTable from "@/components/job-fair-monitoring-table"
import JobFairMonitoringDetails from "@/components/job-fair-monitoring-details"
import { JobFairMonitoring } from "@/lib/types"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

export default function MonitoringSummaryPage() {
  // Handle login success toast
  useLoginSuccessToast()
  
  const {
    monitoringData,
    pagination,
    loading,
    error,
    createMonitoring,
    updateMonitoring,
    deleteMonitoring,
    fetchMonitoring,
    searchMonitoring
  } = useJobFairMonitoring()

  // Get last modified time for job_fair_monitoring table
  const { lastModified: monitoringLastModified, refresh: refreshLastModified } = useTableLastModified({ tableName: 'job_fair_monitoring' })

  const [modalOpen, setModalOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<JobFairMonitoring | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<JobFairMonitoring | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleCreate = () => {
    setEditingRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: JobFairMonitoring) => {
    setEditingRecord(record)
    setModalOpen(true)
  }

  const handleView = (record: JobFairMonitoring) => {
    setSelectedRecord(record)
    setDetailsOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteMonitoring(id)
    refreshLastModified()
  }

  const handleModalSubmit = async (data: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRecord) {
      await updateMonitoring(editingRecord.id, data)
    } else {
      await createMonitoring(data)
    }
    refreshLastModified()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchMonitoring(searchQuery)
    } else {
      fetchMonitoring(pagination.page, pagination.limit)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const exportFormat = format === 'excel' ? 'csv' : 'json';
      const url = `/api/job-fair-monitoring/export?format=${exportFormat}&search=${encodeURIComponent(searchQuery)}`;
      
      if (format === 'excel') {
        // Download CSV file
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'job-fair-monitoring.csv';
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
        link.download = 'job-fair-monitoring.json';
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
            <h2 className="text-xl font-medium text-[#1976D2]">Job Fair Monitoring Summary</h2>
            <div className="flex items-center gap-2 relative">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
                </div>
                <Button 
                  type="submit" 
                  variant="outline" 
                  className="h-9 bg-white border-gray-300"
                  disabled={loading}
                >
                  Search
                </Button>
              </form>
              
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
                Add
              </Button>
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
                          onClick={() => fetchMonitoring(i, pagination.limit)}
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
                          onClick={() => fetchMonitoring(1, pagination.limit)}
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
                          onClick={() => fetchMonitoring(i, pagination.limit)}
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
                          onClick={() => fetchMonitoring(totalPages, pagination.limit)}
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
            <JobFairMonitoringTable
              data={monitoringData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              loading={loading}
            />
          </div>

          {/* Last Updated Timestamp */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>
              Last Updated: {monitoringLastModified ? monitoringLastModified.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : 'Never'}
            </span>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      <JobFairMonitoringModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleModalSubmit}
        editingRecord={editingRecord}
        loading={loading}
      />

      {/* Details Modal */}
      <JobFairMonitoringDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={selectedRecord}
      />
    </div>
  )
} 