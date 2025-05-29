"use client"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { ChevronDown, Filter, Plus, Download, Search, MoreHorizontal } from "lucide-react"

const sampleRows = [
  {
    control: "NCC 2025-0319-013-001",
    name: "Reyes, Maria Clara",
    sex: "Female",
    employer: "GlobalCare Inc.",
    destination: "UAE",
    salary: "$1,200",
  },
  {
    control: "WE 2025-0319-013-001",
    name: "Lim, Roberto",
    sex: "Male",
    employer: "QatarWorks",
    destination: "Qatar",
    salary: "$1,500",
  },
  {
    control: "FAC 2025-0319-025-001",
    name: "Gomez, Ana",
    sex: "Female",
    employer: "Kuwait Solutions",
    destination: "Kuwait",
    salary: "$1,800",
  },
  {
    control: "NVEC-2025-0319-029-001",
    name: "Torres, Michael",
    sex: "Male",
    employer: "HK Domestic",
    destination: "Hong Kong",
    salary: "$950",
  },
  {
    control: "SP-2025-0319-023-002",
    name: "Navarro, Jose",
    sex: "Male",
    employer: "Greek Shipping",
    destination: "Greece",
    salary: "$2,200",
  },
  {
    control: "CS-2025-0319-120-049",
    name: "Cruz, Angela",
    sex: "Female",
    employer: "Canada Health",
    destination: "Canada",
    salary: "$2,500",
  },
  {
    control: "DHPSW-ROIVA-2025-0319-013-001",
    name: "Delos Santos, Patricia Mae",
    sex: "Female",
    employer: "ABC Company",
    destination: "Singapore",
    salary: "$1,900",
  },
  {
    control: "NCC 2025-0319-013-002",
    name: "Villanueva, Carla",
    sex: "Female",
    employer: "EuroJobs",
    destination: "Italy",
    salary: "$1,700",
  },
  {
    control: "WE 2025-0319-013-002",
    name: "Santiago, Paul",
    sex: "Male",
    employer: "UK Recruiters",
    destination: "UK",
    salary: "$2,100",
  },
  {
    control: "FAC 2025-0319-025-002",
    name: "Lopez, Maria",
    sex: "Female",
    employer: "US Talent",
    destination: "USA",
    salary: "$2,300",
  },
  {
    control: "NVEC-2025-0319-029-002",
    name: "Dela Cruz, Mark",
    sex: "Male",
    employer: "Aussie Jobs",
    destination: "Australia",
    salary: "$1,600",
  },
  {
    control: "SP-2025-0319-023-003",
    name: "Santos, Liza",
    sex: "Female",
    employer: "NZ Work",
    destination: "New Zealand",
    salary: "$2,000",
  },
]

const clearanceTypes = [
  "Watchlisted Employer Clearance Form",
  "Seafarer's Position",
  "Non Compliant Country Clearance Form",
  "No Verified Contract Clearance Form",
  "For Assessment Country",
  "Critical Skill",
  "Watchlisted Similar Name",
]

export default function BalikManggagawaClearancePage() {
  const [showFilter, setShowFilter] = useState(false)
  const [showClearanceDropdown, setShowClearanceDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState("Clearance")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState(sampleRows)

  const filteredRows = rows.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

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
                onChange={(e) => setSearch(e.target.value)}
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
                  <DropdownMenuItem key={type}>{type}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-2">Types of Clearance:</div>
                <div className="grid grid-cols-1 gap-1 mb-2">
                  <label className="flex items-center gap-2"><input type="checkbox" /> All</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Watchlisted Employer</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Seafarer's Position</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Non Compliant Contract</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> For Assessment Country</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> No Verified Contract</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Critical Skill</label>
                </div>
                <div className="font-semibold mb-1">Sex:</div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2"><input type="checkbox" /> Female</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Male</label>
                </div>
                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" />
                <div className="font-semibold mb-1">Jobsite</div>
                <Input type="text" className="mb-2" />
                <div className="font-semibold mb-1">Position</div>
                <Input type="text" className="mb-2" />
                <div className="flex justify-between gap-2 mt-2">
                  <Button variant="outline" className="w-1/2">Clear</Button>
                  <Button className="w-1/2 bg-[#1976D2] text-white">Search</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded-xl border bg-white">
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
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">{row.control}</td>
                  <td className="py-3 px-4 text-center">{row.name}</td>
                  <td className="py-3 px-4 text-center">{row.sex}</td>
                  <td className="py-3 px-4 text-center">{row.employer}</td>
                  <td className="py-3 px-4 text-center">{row.destination}</td>
                  <td className="py-3 px-4 text-center">{row.salary}</td>
                  <td className="py-3 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Download PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
} 