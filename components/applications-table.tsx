"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Application = {
  id: number
  controlNumber: string
  name: string
  category: string
  jobsite: string
  sex: string
  status: "completed" | "processing" | "rejected"
}

interface ApplicationsTableProps {
  applications: Application[]
}

export default function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <div className="bg-[#E8F5E9] text-[#2E7D32] text-xs px-2 py-1 rounded">completed</div>
      case "processing":
        return <div className="bg-[#E3F2FD] text-[#1976D2] text-xs px-2 py-1 rounded">processing</div>
      case "rejected":
        return <div className="bg-[#FFEBEE] text-[#C62828] text-xs px-2 py-1 rounded">rejected</div>
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-md border overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
              <th className="py-3 px-4 font-medium text-center">Control #</th>
              <th className="py-3 px-4 font-medium text-center">Name</th>
              <th className="py-3 px-4 font-medium text-center">Category</th>
              <th className="py-3 px-4 font-medium text-center">Jobsite</th>
              <th className="py-3 px-4 font-medium text-center">Sex</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((application) => (
              <tr key={application.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-center">{application.controlNumber}</td>
                <td className="py-3 px-4 text-center">{application.name}</td>
                <td className="py-3 px-4 text-center">{application.category}</td>
                <td className="py-3 px-4 text-center">{application.jobsite}</td>
                <td className="py-3 px-4 text-center">{application.sex}</td>
                <td className="py-3 px-4 text-center">{getStatusBadge(application.status)}</td>
                <td className="py-3 px-4">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit application</DropdownMenuItem>
                        <DropdownMenuItem>Download PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
