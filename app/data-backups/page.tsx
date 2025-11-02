"use client"

// app/data-backups/page.tsx
import { useEffect, useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { isSuperadmin, getUser } from "@/lib/auth"
import PermissionGuard from "@/components/permission-guard"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, Upload as UploadIcon, Download as DownloadIcon, RotateCcw, Trash2 } from "lucide-react"

interface BackupItem {
  id: string
  file_name: string
  file_size: number
  created_at: string
}

export default function DataBackupsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingFull, setCreatingFull] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ action: 'restore'|'delete'|null, id?: string }>({ action: null })
  const [step, setStep] = useState<string>("")
  const [deleteInput, setDeleteInput] = useState("")
  const [restoreInput, setRestoreInput] = useState("")
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const u = getUser()
    setAuthorized(!!u && isSuperadmin(u))
    setMounted(true)
  }, [])

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/backups", { credentials: "include" })
      const json = await res.json()
      if (json.success) setBackups(json.data || [])
      else toast({ title: "Failed", description: json.error || "Could not load backups", variant: "destructive" })
    } catch (e) {
      toast({ title: "Failed", description: "Could not load backups", variant: "destructive" })
    } finally { setLoading(false) }
  }

  useEffect(() => { if (authorized) fetchBackups() }, [authorized])

  const createBackup = async () => {
    setCreating(true)
    setStep('Creating logical SQL backup...')
    try {
      const res = await fetch("/api/backups", { method: "POST", credentials: "include" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Backup created", description: "Logical SQL backup is available." })
        fetchBackups()
      } else {
        toast({ title: "Failed", description: json.error || "Could not create backup", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed", description: "Could not create backup", variant: "destructive" })
    } finally { setCreating(false); setStep("") }
  }

  const createFullBackup = async () => {
    setCreatingFull(true)
    setStep('Dumping database...')
    try {
      const res = await fetch("/api/backups/full", { method: "POST", credentials: "include" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Full backup created", description: "Archive includes dump.sql and uploads/." })
        fetchBackups()
      } else {
        toast({ title: "Failed", description: json.error || "Could not create full backup", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed", description: "Could not create full backup", variant: "destructive" })
    } finally { setCreatingFull(false); setStep("") }
  }

  const onRestore = async (file: File) => {
    setRestoring(true)
    setStep('Uploading backup...')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/backups/restore', { method: 'POST', body: fd, credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Restore completed', description: 'Data and files have been restored.' })
      } else {
        toast({ title: 'Restore failed', description: json.error || 'Could not restore backup', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Restore failed', description: 'Could not restore backup', variant: 'destructive' })
    } finally { setRestoring(false); setStep("") }
  }

  // If not authorized on initial load, do not show blocking message; header still renders
  if (!authorized && !mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
      </div>
    )
  }

  return (
    <PermissionGuard permission="data_backups" fallback={<div className="min-h-screen bg-gray-50"><Header /></div>}>
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 container mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1976D2]">Data Backups</h1>
          <div className="flex items-center gap-2">
            <Button onClick={createFullBackup} disabled={creatingFull} className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3">
              <PlusCircle className="h-4 w-4 mr-1" />
              {creatingFull ? "Creating" : "Manual Backup"}
            </Button>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="px-3 py-2 border rounded-md bg-white cursor-pointer inline-flex items-center gap-1 h-9">
                <UploadIcon className="h-4 w-4" />{restoring ? 'Importing' : 'Import'}
              </span>
              <input type="file" accept=".zip" className="hidden" disabled={restoring}
                onChange={async (e)=>{
                  const f=e.target.files?.[0];
                  if(!f) return;
                  setRestoring(true); setStep('Importing backup to list...')
                  try {
                    const fd = new FormData(); fd.append('file', f)
                    const res = await fetch('/api/backups/import', { method: 'POST', body: fd, credentials: 'include' })
                    const json = await res.json()
                    if (json.success) { toast({ title: 'Imported', description: 'Backup added to list.' }); fetchBackups() }
                    else toast({ title: 'Import failed', description: json.error || 'Could not import', variant: 'destructive' })
                  } catch { toast({ title: 'Import failed', description: 'Could not import', variant: 'destructive' }) }
                  finally { setRestoring(false); setStep('') }
                  e.currentTarget.value=''
                }} />
            </label>
          </div>
        </div>
        {/* Search and page size */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            className="border rounded px-3 py-2 text-sm w-full md:w-80"
            placeholder="Search filename…"
            value={search}
            onChange={(e)=>{ setSearch(e.target.value); setPage(1) }}
          />
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <span>Rows:</span>
            <select className="border rounded px-2 py-1" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)||10); setPage(1) }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 bg-[#1976D2] text-sm font-semibold text-white">
            <div className="col-span-5">File [system]-[YYYYMMDD]-[HHMMAM/PM].zip</div>
            <div className="col-span-2 text-center">Size</div>
            <div className="col-span-3 text-center">Created</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>
          {(() => {
            const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
            const filtered = terms.length === 0 ? backups : backups.filter(b => {
              const hay = `${b.file_name}`.toLowerCase()
              return terms.every(t => hay.includes(t))
            })
            const total = filtered.length
            const totalPages = Math.max(1, Math.ceil(total / pageSize))
            const curPage = Math.min(page, totalPages)
            const start = (curPage - 1) * pageSize
            const pageItems = filtered.slice(start, start + pageSize)

            return (
              <>
                <div className="divide-y">
                  {loading ? (
                    <div className="p-4 text-sm text-gray-600">Loading...</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">No backups found.</div>
                  ) : pageItems.map(b => (
              <div key={b.id} className="grid grid-cols-12 px-4 py-2 text-sm items-center hover:bg-gray-150 transition-colors duration-75">
                <div className="col-span-5 break-all flex items-center gap-2">
                  <span>{b.file_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.file_name.includes('-auto') ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                    {b.file_name.includes('-auto') ? 'Auto' : 'Manual'}
                  </span>
                </div>
                <div className="col-span-2 text-center">{(b.file_size / (1024*1024)).toFixed(2)} MB</div>
                <div className="col-span-3 text-center text-gray-500">{new Date(b.created_at).toLocaleString()}</div>
                <div className="col-span-2 text-center flex items-center justify-center gap-3">
                  <a className="text-[#1976D2] inline-flex items-center rounded-sm p-1 hover:bg-gray-150" href={`/api/backups/${b.id}`} title="Download">
                    <DownloadIcon className="h-4 w-4" />
                  </a>
                  <button
                    className="text-emerald-700 inline-flex items-center rounded-sm p-1 hover:bg-gray-150"
                    onClick={()=> { setRestoreInput(""); setConfirm({ action: 'restore', id: b.id }) }}
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-600 inline-flex items-center rounded-sm p-1 hover:bg-gray-150"
                    onClick={()=> { setDeleteInput(""); setConfirm({ action: 'delete', id: b.id }) }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
                  ))}
                </div>
                {/* Pagination */}
                {total > 0 && (
                  <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                    <div>Page {curPage} of {totalPages} ({total} files)</div>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const pages: (number | 'ellipsis')[] = []
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i)
                        } else {
                          let startPage = Math.max(1, curPage - 2);
                          let endPage = Math.min(totalPages, startPage + 4);
                          if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
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
                )}
              </>
            )
          })()}
        </div>
      </div>
      {/* Progress Modal */}
      <Dialog open={creating || creatingFull || restoring}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{creatingFull ? 'Creating backup...' : restoring ? 'Restoring backup...' : 'Creating backup...'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-5 w-5 border-2 border-gray-300 border-t-[#1976D2] rounded-full animate-spin" />
            <div className="text-sm text-gray-700">Please keep this page open until the process completes.</div>
          </div>
          {step && <div className="mt-3 text-xs text-gray-500">{step}</div>}
        </DialogContent>
      </Dialog>

      {/* Confirm Modal (simple inline) */}
      {confirm.action && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-full max-w-md shadow">
            <div className="font-semibold mb-2">Confirm {confirm.action === 'restore' ? 'Restore' : 'Delete'}</div>
            {(() => {
              if (confirm.action === 'restore') {
                const file = backups.find(b => b.id === confirm.id)
                const parts = (file?.file_name || '').split('-')
                const yyyymmdd = parts.length > 1 ? parts[1] : ''
                return (
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">This will overwrite current data with the backup.</div>
                    <div className="text-xs text-gray-500 mb-2">Type <span className="font-semibold">RESTORE {yyyymmdd}</span> to confirm.</div>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder={`RESTORE ${yyyymmdd}`}
                      value={restoreInput}
                      onChange={(e)=> setRestoreInput(e.target.value)}
                    />
                  </div>
                )
              }
              const file = backups.find(b => b.id === confirm.id)
              const parts = (file?.file_name || '').split('-')
              const yyyymmdd = parts.length > 1 ? parts[1] : ''
              return (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">This will permanently delete the backup file.</div>
                  <div className="text-xs text-gray-500 mb-2">Type <span className="font-semibold">DELETE {yyyymmdd}</span> to confirm.</div>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder={`DELETE ${yyyymmdd}`}
                    value={deleteInput}
                    onChange={(e)=> setDeleteInput(e.target.value)}
                  />
                </div>
              )
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> { setDeleteInput(""); setRestoreInput(""); setConfirm({ action: null }) }}>Cancel</Button>
              <Button
                className={confirm.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                disabled={(() => {
                  const file = backups.find(b => b.id === confirm.id)
                  const parts = (file?.file_name || '').split('-')
                  const yyyymmdd = parts.length > 1 ? parts[1] : ''
                  if (confirm.action === 'delete') {
                    return deleteInput.trim() !== `DELETE ${yyyymmdd}`
                  }
                  if (confirm.action === 'restore') {
                    return restoreInput.trim() !== `RESTORE ${yyyymmdd}`
                  }
                  return false
                })()}
                onClick={async()=>{
                  const id = confirm.id!
                  if (confirm.action === 'restore') {
                    setRestoring(true); setStep('Restoring from selected backup...')
                    try {
                      const res = await fetch(`/api/backups/${id}/restore`, { method: 'POST', credentials: 'include' })
                      const json = await res.json()
                      if (json.success) toast({ title: 'Restore completed', description: 'Data and files have been restored.' })
                      else toast({ title: 'Restore failed', description: json.error || 'Could not restore', variant: 'destructive' })
                    } catch { toast({ title: 'Restore failed', description: 'Could not restore', variant: 'destructive' }) }
                    finally { setRestoring(false); setStep(''); setRestoreInput(""); setConfirm({ action: null }) }
                  } else {
                    setDeletingId(id); setStep('Deleting backup file...')
                    try {
                      const res = await fetch(`/api/backups/${id}`, { method: 'DELETE', credentials: 'include' })
                      const json = await res.json()
                      if (json.success) {
                        const file = backups.find(b => b.id === id)
                        toast({ title: 'Deleted', description: file ? `Deleted ${file.file_name}` : 'Backup deleted' })
                        fetchBackups()
                      } else {
                        toast({ title: 'Delete failed', description: json.error || 'Could not delete', variant: 'destructive' })
                      }
                    } catch { toast({ title: 'Delete failed', description: 'Could not delete', variant: 'destructive' }) }
                    finally { setDeletingId(null); setStep(''); setDeleteInput(""); setConfirm({ action: null }) }
                  }
                }}
              >Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  )
}



