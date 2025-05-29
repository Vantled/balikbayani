"use client"

import { Search, Download, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DirectHireApplicationsTable from "@/components/direct-hire-applications-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import FilterPanel from "@/components/filter-panel"
import CreateApplicationModal from "@/components/create-application-modal"
import Header from "@/components/shared/header"

export default function DirectHirePage() {
  const [showFilter, setShowFilter] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState("")

  return (
    <div className="min-h-screen bg-[#EEF5FD]">
      <Header />

      {/* Main Content */}
      <main className="p-6 pt-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-[#1976D2]">Direct Hire Monitoring Table</h2>

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

            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>

            {/* Filter Panel */}
            {showFilter && <FilterPanel onClose={() => setShowFilter(false)} />}
          </div>
        </div>

        <DirectHireApplicationsTable search={search} />
      </main>

      {/* Create Application Modal */}
      {showCreateModal && <CreateApplicationModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
