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
import { Search, Download, Plus, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"

// Mock data
const initialMonitoringSummary = [
  {
    date: "2024-03-15",
    venue: "SM City Batangas",
    invitedAgencies: 10,
    agenciesWithJfa: 8,
    maleApplicants: 150,
    femaleApplicants: 120,
    totalApplicants: 270
  },
  {
    date: "2024-03-20",
    venue: "Robinsons Place Lipa",
    invitedAgencies: 12,
    agenciesWithJfa: 10,
    maleApplicants: 180,
    femaleApplicants: 150,
    totalApplicants: 330
  }
]

export default function MonitoringSummaryPage() {
  const [monitoringSummary, setMonitoringSummary] = useState(initialMonitoringSummary)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const handleCreate = () => {
    setFormData({})
    setModalOpen(true)
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const totalApplicants =
      Number(formData.maleApplicants || 0) + Number(formData.femaleApplicants || 0)
    setMonitoringSummary([
      ...monitoringSummary,
      { ...formData, totalApplicants },
    ])
    setModalOpen(false)
    toast.success("Monitoring record created!")
  }

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-[#1976D2]">Job Fair Monitoring Summary</h2>
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-8 pr-10 h-9 w-[240px] bg-white" placeholder="Search" />
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
              <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
          <div className="bg-white rounded-md border overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                    <th className="py-3 px-4 font-medium text-center">Date of Job Fair</th>
                    <th className="py-3 px-4 font-medium text-center">Venue</th>
                    <th className="py-3 px-4 font-medium text-center">No. of Invited Agencies</th>
                    <th className="py-3 px-4 font-medium text-center">No. of Agencies with JFA</th>
                    <th className="py-3 px-4 font-medium text-center">Male(Applicants)</th>
                    <th className="py-3 px-4 font-medium text-center">Female(Applicants)</th>
                    <th className="py-3 px-4 font-medium text-center">Total(Applicants)</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monitoringSummary.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-center">{row.date}</td>
                      <td className="py-3 px-4 text-center">{row.venue}</td>
                      <td className="py-3 px-4 text-center">{row.invitedAgencies}</td>
                      <td className="py-3 px-4 text-center">{row.agenciesWithJfa}</td>
                      <td className="py-3 px-4 text-center">{row.maleApplicants}</td>
                      <td className="py-3 px-4 text-center">{row.femaleApplicants}</td>
                      <td className="py-3 px-4 text-center">{row.totalApplicants}</td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Create Monitoring Record</DialogTitle>
          <form onSubmit={handleModalSubmit} className="space-y-4 mt-2">
            <input name="date" type="date" required className="w-full border rounded px-3 py-2" placeholder="Date" onChange={handleModalChange} />
            <input name="venue" type="text" required className="w-full border rounded px-3 py-2" placeholder="Venue" onChange={handleModalChange} />
            <input name="invitedAgencies" type="number" min="0" required className="w-full border rounded px-3 py-2" placeholder="No. of Invited Agencies" onChange={handleModalChange} />
            <input name="agenciesWithJfa" type="number" min="0" required className="w-full border rounded px-3 py-2" placeholder="No. of Agencies with JFA" onChange={handleModalChange} />
            <input name="maleApplicants" type="number" min="0" required className="w-full border rounded px-3 py-2" placeholder="Male Applicants" onChange={handleModalChange} />
            <input name="femaleApplicants" type="number" min="0" required className="w-full border rounded px-3 py-2" placeholder="Female Applicants" onChange={handleModalChange} />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="bg-[#1976D2] text-white">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 