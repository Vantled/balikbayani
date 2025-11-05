"use client"

import { useState, useEffect } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getUser, isAdmin } from "@/lib/auth"
import { FileDown, Calendar, Trash2, Download as DownloadIcon, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Certificate {
  id: string
  month: number
  year: number
  file_name: string
  file_size: number
  created_at: string
  created_by_name?: string
}

interface CertificatesResponse {
  data: Certificate[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function SystemReportsPage() {
  const { toast } = useToast()
  const [month, setMonth] = useState<string>("")
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    setCurrentUser(user)
    setMounted(true)
    
    // Set current month as default
    const now = new Date()
    const year = now.getFullYear()
    const monthNum = String(now.getMonth() + 1).padStart(2, "0")
    setMonth(`${year}-${monthNum}`)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchCertificates()
    }
  }, [mounted])

  const fetchCertificates = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/system-reports/certificates?page=${page}&limit=${pageSize}`
      )
      const data = await response.json()

      if (data.success) {
        const certData: CertificatesResponse = data.data
        setCertificates(certData.data || [])
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch certificates",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching certificates:", error)
      toast({
        title: "Error",
        description: "Failed to fetch certificates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateCertificate = async () => {
    if (!month) {
      toast({
        title: "Error",
        description: "Please select a month",
        variant: "destructive",
      })
      return
    }

    const [year, monthNum] = month.split("-")
    if (!year || !monthNum) {
      toast({
        title: "Error",
        description: "Invalid month format",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/system-reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: parseInt(monthNum),
          year: parseInt(year),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate certificate")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Certificate_of_Utilization_${month}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Certificate generated successfully",
      })
      
      // Refresh certificates list
      fetchCertificates()
    } catch (error) {
      console.error("Error generating certificate:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate certificate",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!certificateToDelete) return

    const expectedInput = `DELETE ${certificateToDelete.id.slice(0, 8)}`
    if (deleteInput.trim() !== expectedInput) {
      toast({
        title: "Error",
        description: "Please type the confirmation text correctly",
        variant: "destructive",
      })
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/system-reports/certificates/${certificateToDelete.id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Certificate deleted successfully",
        })
        fetchCertificates()
        setDeleteDialogOpen(false)
        setCertificateToDelete(null)
        setDeleteInput("")
      } else {
        throw new Error(data.error || "Failed to delete certificate")
      }
    } catch (error) {
      console.error("Error deleting certificate:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete certificate",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const getMonthName = (monthNum: number) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    return monthNames[monthNum - 1] || ""
  }

  const handleOpenInWord = (cert: Certificate) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const docUrl = `${origin}/api/system-reports/certificates/${cert.id}/file.docx`
      const protocolUrl = `ms-word:ofe|u|${encodeURI(docUrl)}`
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.width = '0'
      iframe.height = '0'
      document.body.appendChild(iframe)
      iframe.src = protocolUrl
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 3000)
    } catch (_e) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      window.open(`${origin}/api/system-reports/certificates/${cert.id}/open.docx?return=/system-reports`, '_blank')
    }
  }

  if (!mounted) {
    return null
  }

  if (!isAdmin(currentUser)) {
    return (
      <div className="flex flex-col bg-gray-50 min-h-screen">
        <Header />
        <main className="flex-1 px-6 pt-24 pb-12">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                You do not have permission to access this page.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Filter certificates based on search only (client-side)
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = terms.length === 0
    ? certificates
    : certificates.filter(c => {
        const hay = `${c.file_name} ${getMonthName(c.month)} ${c.year} ${c.created_by_name || ''}`.toLowerCase()
        return terms.every(t => hay.includes(t))
      })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const start = (curPage - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Header />
      <main className="flex-1 px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1976D2]">System Reports</h1>
          <div className="flex items-center gap-4">
            {/* Search */}
            <input
              className="border rounded px-3 py-2 text-sm w-48 md:w-80"
              placeholder="Search filename, month, year..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <Button
              onClick={() => setGenerateDialogOpen(true)}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              {generating ? "Generating..." : "Generate Certificate"}
            </Button>
          </div>
        </div>

        {/* Top pagination (outside table container) */}
        {(() => {
          const total = filtered.length
          const totalPages = Math.max(1, Math.ceil(total / pageSize))
          const curPage = Math.min(page, totalPages)
          return total > 0 ? (
            <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
              <div>Page {curPage} of {totalPages} ({total} certificates)</div>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages: (number | 'ellipsis')[] = []
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i)
                  } else {
                    let startPage = Math.max(1, curPage - 2)
                    let endPage = Math.min(totalPages, startPage + 4)
                    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)
                    if (startPage > 1) {
                      pages.push(1)
                      if (startPage > 2) pages.push('ellipsis')
                    }
                    for (let i = startPage; i <= endPage; i++) pages.push(i)
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) pages.push('ellipsis')
                      pages.push(totalPages)
                    }
                  }
                  return (
                    <>
                      {pages.map((p, idx) => p === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="px-2 text-gray-500">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === curPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(p as number)}
                          className="min-w-[40px] h-8"
                        >
                          {p}
                        </Button>
                      ))}
                    </>
                  )
                })()}
              </div>
            </div>
          ) : null
        })()}

        {/* Certificates Table */}
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 bg-[#1976D2] text-sm font-semibold text-white">
            <div className="col-span-4">File Name</div>
            <div className="col-span-2 text-center">Month/Year</div>
            <div className="col-span-2 text-center">Size</div>
            <div className="col-span-2 text-center">Created</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No certificates found.</div>
          ) : (
            <>
              <div className="divide-y">
                {pageItems.map((cert) => (
                  <div key={cert.id} className="grid grid-cols-12 px-4 py-2 text-sm items-center hover:bg-gray-50 transition-colors duration-75">
                    <div className="col-span-4 break-all">
                      {cert.file_name}
                    </div>
                    <div className="col-span-2 text-center text-gray-600">
                      {getMonthName(cert.month)} {cert.year}
                    </div>
                    <div className="col-span-2 text-center text-gray-600">
                      {(cert.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="col-span-2 text-center text-gray-500">
                      {new Date(cert.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-3">
                      <button
                        className="text-[#1976D2] inline-flex items-center rounded-sm p-1 hover:bg-gray-100"
                        onClick={() => handleOpenInWord(cert)}
                        title="Open in Word"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        className="text-[#1976D2] inline-flex items-center rounded-sm p-1 hover:bg-gray-100"
                        href={`/api/system-reports/certificates/${cert.id}`}
                        title="Download"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </a>
                      <button
                        className="text-red-600 inline-flex items-center rounded-sm p-1 hover:bg-gray-100"
                        onClick={() => {
                          setCertificateToDelete(cert)
                          setDeleteInput("")
                          setDeleteDialogOpen(true)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Generate Certificate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Certificate</DialogTitle>
            <DialogDescription>
              Select the month and year to generate the utilization certificate for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="gen-month" className="text-sm">Month/Year</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="gen-month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await generateCertificate()
                  setGenerateDialogOpen(false)
                }}
                disabled={!month || generating}
              >
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              This will permanently delete the certificate file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {certificateToDelete && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Type <span className="font-semibold">DELETE {certificateToDelete.id.slice(0, 8)}</span> to confirm.
                </p>
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={`DELETE ${certificateToDelete.id.slice(0, 8)}`}
                  className="w-full"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setCertificateToDelete(null)
                  setDeleteInput("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={
                  !certificateToDelete ||
                  deleteInput.trim() !== `DELETE ${certificateToDelete.id.slice(0, 8)}` ||
                  deleting
                }
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
