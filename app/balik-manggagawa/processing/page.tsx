"use client"

import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { Filter, Plus, Download, Search, MoreHorizontal } from "lucide-react"

const processingRows = [
  {
    orNo: "OR-2025-0001",
    name: "Reyes, Maria Clara",
    sex: "Female",
    address: "Makati, Metro Manila",
    destination: "UAE",
  },
  {
    orNo: "OR-2025-0002",
    name: "Lim, Roberto",
    sex: "Male",
    address: "Cebu City, Cebu",
    destination: "Qatar",
  },
  {
    orNo: "OR-2025-0003",
    name: "Gomez, Ana",
    sex: "Female",
    address: "Davao City, Davao del Sur",
    destination: "Kuwait",
  },
  {
    orNo: "OR-2025-0004",
    name: "Torres, Michael",
    sex: "Male",
    address: "Baguio City, Benguet",
    destination: "Hong Kong",
  },
  {
    orNo: "OR-2025-0005",
    name: "Navarro, Jose",
    sex: "Male",
    address: "Iloilo City, Iloilo",
    destination: "Greece",
  },
  {
    orNo: "OR-2025-0006",
    name: "Cruz, Angela",
    sex: "Female",
    address: "Quezon City, Metro Manila",
    destination: "Canada",
  },
  {
    orNo: "OR-2025-0007",
    name: "Delos Santos, Patricia Mae",
    sex: "Female",
    address: "Calamba, Laguna",
    destination: "Singapore",
  },
]

export default function BalikManggagawaProcessingPage() {
  const [showFilter, setShowFilter] = useState(false)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState(processingRows)

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
          <h2 className="text-xl font-medium text-[#1976D2]">Balik Manggagawa - Processing</h2>
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
            <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2">
              Create <Plus className="h-4 w-4" />
            </Button>
            {/* Filter Panel */}
            {showFilter && (
              <div className="absolute right-0 top-12 z-40 w-[380px] bg-white border rounded-xl shadow-xl p-6 text-xs flex flex-col gap-3">
                <div className="font-semibold mb-1">Sex:</div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2"><input type="checkbox" /> Female</label>
                  <label className="flex items-center gap-2"><input type="checkbox" /> Male</label>
                </div>
                <div className="font-semibold mb-1">Date Within</div>
                <Input type="date" className="mb-2" />
                <div className="font-semibold mb-1">Destination</div>
                <Input type="text" className="mb-2" />
                <div className="font-semibold mb-1">Address</div>
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
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1976D2] text-white">
                <th className="py-3 px-4 font-medium">O.R. No.</th>
                <th className="py-3 px-4 font-medium">Name of Worker</th>
                <th className="py-3 px-4 font-medium">Sex</th>
                <th className="py-3 px-4 font-medium">Address</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">{row.orNo}</td>
                  <td className="py-3 px-4 text-center">{row.name}</td>
                  <td className="py-3 px-4 text-center">{row.sex}</td>
                  <td className="py-3 px-4 text-center">{row.address}</td>
                  <td className="py-3 px-4 text-center">{row.destination}</td>
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