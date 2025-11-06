"use client"

import { Search, Download, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DirectHireApplicationsTable from "@/components/direct-hire-applications-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import FilterPanel from "@/components/filter-panel"
import CreateApplicationModal from "@/components/create-application-modal"
import Header from "@/components/shared/header"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"
import PermissionGuard from "@/components/permission-guard"
import ProcessingStatusCard from "@/components/processing-status-card"
import { toast } from "sonner"

export default function DirectHirePage() {
  // Handle login success toast
  useLoginSuccessToast()
  const [showFilter, setShowFilter] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState("")
  const [panelQuery, setPanelQuery] = useState("")
  const [showFinishedOnly, setShowFinishedOnly] = useState(false)
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [showProcessingOnly, setShowProcessingOnly] = useState(true)

  // Controlled panel state
  const [typeHousehold, setTypeHousehold] = useState(false)
  const [typeProfessional, setTypeProfessional] = useState(false)
  const [sexFilter, setSexFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([
    'pending', 'evaluated', 'for_confirmation', 'emailed_to_dhad', 'received_from_dhad', 'for_interview'
  ])
  const [dateWithin, setDateWithin] = useState("")
  const [jobsiteFilter, setJobsiteFilter] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [evaluatorFilter, setEvaluatorFilter] = useState("")

  // Live search: refresh results whenever search text changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refresh:direct_hire' as any))
    }
  }, [search])

  const clearPanel = () => {
    setTypeHousehold(false)
    setTypeProfessional(false)
    setSexFilter("")
    setStatusFilter(['evaluated', 'for_confirmation', 'emailed_to_dhad', 'received_from_dhad', 'for_interview'])
    setDateWithin("")
    setJobsiteFilter("")
    setPositionFilter("")
    setEvaluatorFilter("")
    setPanelQuery("")
    // Reset filter toggles
    setShowFinishedOnly(false)
    setShowDeletedOnly(false)
    setShowProcessingOnly(true) // Default to processing
  }

  return (
    <PermissionGuard permission="direct_hire" fallback={<div className="min-h-screen bg-[#EEF5FD]"><Header /></div>}>
    <div className="bg-[#EEF5FD] flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="p-6 pt-24 flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Direct Hire Monitoring Table</h2>

          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[20rem] bg-white" 
                placeholder="Search or key:value (e.g. name:John)" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('refresh:direct_hire' as any))
                    }
                  }
                }}
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
                <DropdownMenuItem onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    if (search) params.append('search', search);
                    if (panelQuery) params.append('filterQuery', panelQuery);
                    if (showDeletedOnly) params.append('include_deleted', 'true');
                    if (showFinishedOnly) params.append('include_finished', 'true');
                    if (showProcessingOnly) params.append('include_processing', 'true');
                    
                    const response = await fetch(`/api/direct-hire/export?${params.toString()}`);
                    if (!response.ok) throw new Error('Export failed');
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'direct-hire.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    toast.success('Export successful', {
                      description: 'Direct hire data exported to Excel',
                    });
                  } catch (error) {
                    console.error('Export failed:', error);
                    toast.error('Export failed', {
                      description: 'Failed to export direct hire data',
                    });
                  }
                }}>Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>

            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-50">
                <FilterPanel 
                  onClose={() => setShowFilter(false)} 
                  onApply={(query) => {
                    setPanelQuery(query)
                    setShowFilter(false)
                    // Force the table to re-fetch with the newly applied filters
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('refresh:direct_hire' as any))
                    }
                  }}
                  showFinishedOnly={showFinishedOnly}
                  setShowFinishedOnly={setShowFinishedOnly}
                  showDeletedOnly={showDeletedOnly}
                  setShowDeletedOnly={setShowDeletedOnly}
                  showProcessingOnly={showProcessingOnly}
                  setShowProcessingOnly={setShowProcessingOnly}
                  typeHousehold={typeHousehold}
                  setTypeHousehold={setTypeHousehold}
                  typeProfessional={typeProfessional}
                  setTypeProfessional={setTypeProfessional}
                  sex={sexFilter}
                  setSex={setSexFilter}
                  status={statusFilter}
                  setStatus={setStatusFilter}
                  dateWithin={dateWithin}
                  setDateWithin={setDateWithin}
                  jobsite={jobsiteFilter}
                  setJobsite={setJobsiteFilter}
                  position={positionFilter}
                  setPosition={setPositionFilter}
                  evaluator={evaluatorFilter}
                  setEvaluator={setEvaluatorFilter}
                  onClear={clearPanel}
                />
              </div>
            )}
          </div>
        </div>

        {/* Replace table grid with flex to display table left and card right (on desktop) */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 w-full">
            <DirectHireApplicationsTable
              search={search}
              filterQuery={panelQuery}
              showDeletedOnly={showDeletedOnly}
              showFinishedOnly={showFinishedOnly}
              showProcessingOnly={showProcessingOnly}
              statusFilter={statusFilter}
            />
          </div>
          <div className="w-full md:w:[340px] md:w-[380px]">
            <ProcessingStatusCard title="Overall Status" verticalLayout={true} detailedDirectHire={true} chartHeight={260} />
          </div>
        </div>
      </main>

      {/* Create Application Modal */}
      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Broadcast a refresh to the table before showing any toasts
            window.dispatchEvent(new Event('refresh:direct_hire' as any))
          }}
        />
      )}
    </div>
    </PermissionGuard>
  )
}
