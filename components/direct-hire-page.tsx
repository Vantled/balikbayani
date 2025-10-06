"use client"

import { UserCircle, Search, Download, Plus, Filter, BadgeCheck, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DirectHireApplicationsTable from "@/components/direct-hire-applications-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import FilterPanel from "@/components/filter-panel"
import CreateApplicationModal from "@/components/create-application-modal"
import { toast } from "sonner"

export default function DirectHirePage() {
  const [showFilter, setShowFilter] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFinishedOnly, setShowFinishedOnly] = useState(false)
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)

  return (
    <div className="min-h-screen bg-[#EEF5FD]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-[#1976D2] text-2xl font-bold">BalikBayani Portal</h1>
        <div className="flex items-center space-x-4">
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/dashboard" className="text-gray-600 hover:text-[#1976D2] text-sm">
              Dashboard
            </a>
            <a href="/direct-hire" className="text-[#1976D2] border-b-2 border-[#1976D2] pb-1 text-sm">
              Direct Hire
            </a>
            <a href="#" className="text-gray-600 hover:text-[#1976D2] text-sm">
              Balik Mangagagawa
            </a>
            <a href="#" className="text-gray-600 hover:text-[#1976D2] text-sm">
              Gov to Gov
            </a>
            <a href="#" className="text-gray-600 hover:text-[#1976D2] text-sm">
              Information Sheet
            </a>
            <a href="#" className="text-gray-600 hover:text-[#1976D2] text-sm">
              Job Fairs
            </a>
          </nav>
          <div className="flex items-center space-x-2">
            <UserCircle className="h-8 w-8 text-gray-700" />
            <span className="text-sm hidden md:inline">System Administrator</span>
            <Button variant="outline" className="text-sm rounded-full border-gray-300 ml-2">
              Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Direct Hire Monitoring Table</h2>

          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-8 pr-10 h-9 w-[240px] bg-white" placeholder="Search or key:value" />
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
                <DropdownMenuItem
                  onClick={() => {
                    toast.success("PDF Export successful", {
                      icon: <BadgeCheck className="h-5 w-5 text-green-600" />,
                      duration: 3000,
                    })
                  }}
                >
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.success("Excel Export successful", {
                      icon: <FileDown className="h-5 w-5 text-green-600" />,
                      duration: 3000,
                    })
                  }}
                >
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>

            {/* Filter Panel */}
            {showFilter && (
              <FilterPanel 
                onClose={() => setShowFilter(false)} 
                onApply={() => setShowFilter(false)} 
                sex={""}
                setSex={() => {}}
                status={""}
                setStatus={() => {}}
                dateWithin={""}
                setDateWithin={() => {}}
                jobsite={""}
                setJobsite={() => {}}
                position={""}
                setPosition={() => {}}
                onClear={() => {}}
                showFinishedOnly={showFinishedOnly}
                setShowFinishedOnly={setShowFinishedOnly}
                showDeletedOnly={showDeletedOnly}
                setShowDeletedOnly={setShowDeletedOnly}
              />
            )}
          </div>
        </div>

        <DirectHireApplicationsTable search="" />
      </main>

      {/* Create Application Modal */}
      {showCreateModal && <CreateApplicationModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
