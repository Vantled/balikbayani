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
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24">
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



          {/* Table */}
          <JobFairMonitoringTable
            data={monitoringData}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            loading={loading}
          />

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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchMonitoring(pagination.page - 1, pagination.limit)}
                disabled={pagination.page <= 1 || loading}
                className="bg-white"
              >
                Previous
              </Button>
              

              
              <Button
                variant="outline"
                onClick={() => fetchMonitoring(pagination.page + 1, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="bg-white"
              >
                Next
              </Button>
            </div>
          )}
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