"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Application = {
  id: string | number
  controlNumber: string
  name: string
  category: string
  jobsite: string
  sex: string
  status: string
  created_at?: string
}

interface ApplicationsTableProps {
  applications: Application[]
  search?: string
  filterQuery?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange?: (page: number) => void
  onRowDoubleClick?: (application: Application) => void
}

// Helper function to get category color
const getCategoryColor = (category: string) => {
  const categoryLower = category.toLowerCase()
  
  if (categoryLower.includes('direct hire') || categoryLower.includes('direct-hire')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  if (categoryLower.includes('balik manggagawa') || categoryLower.includes('clearance')) {
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (categoryLower.includes('gov to gov') || categoryLower.includes('gov-to-gov')) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }
  if (categoryLower.includes('information sheet') || categoryLower.includes('info sheet')) {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }
  if (categoryLower.includes('job fair') || categoryLower.includes('job-fair')) {
    return 'bg-pink-100 text-pink-800 border-pink-200'
  }
  if (categoryLower.includes('processing')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
  
  // Default color for unknown categories
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function ApplicationsTable({ applications, search = "", filterQuery = "", pagination, onPageChange, onRowDoubleClick }: ApplicationsTableProps) {

  return (
    <>
      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total applications)
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
                      onClick={() => onPageChange?.(i)}
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
                      onClick={() => onPageChange?.(1)}
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
                      onClick={() => onPageChange?.(i)}
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
                      onClick={() => onPageChange?.(totalPages)}
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

      <div className="bg-white rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
              <th className="py-3 px-4 font-medium text-center">Control #</th>
              <th className="py-3 px-4 font-medium text-center">Name</th>
              <th className="py-3 px-4 font-medium text-center">Category</th>
              <th className="py-3 px-4 font-medium text-center">Jobsite</th>
              <th className="py-3 px-4 font-medium text-center">Sex</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((application: Application) => (
              <tr 
                key={application.id} 
                className="hover:bg-gray-150 transition-colors duration-75 cursor-pointer select-none"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  onRowDoubleClick?.(application)
                }}
              >
                <td className="py-3 px-4 text-center">{application.controlNumber}</td>
                <td className="py-3 px-4 text-center">{application.name}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(application.category)}`}>
                    {application.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">{application.jobsite}</td>
                <td className="py-3 px-4 text-center">{application.sex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  )
}
