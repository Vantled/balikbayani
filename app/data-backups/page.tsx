"use client"

// app/data-backups/page.tsx
import { useEffect, useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { isSuperadmin, getUser } from "@/lib/auth"

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
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [authorized, setAuthorized] = useState<boolean>(false)

  useEffect(() => {
    const u = getUser()
    setAuthorized(!!u && isSuperadmin(u))
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
    try {
      const res = await fetch("/api/backups", { method: "POST", credentials: "include" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Backup created" })
        fetchBackups()
      } else {
        toast({ title: "Failed", description: json.error || "Could not create backup", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed", description: "Could not create backup", variant: "destructive" })
    } finally { setCreating(false) }
  }

  const createFullBackup = async () => {
    setCreatingFull(true)
    try {
      const res = await fetch("/api/backups/full", { method: "POST", credentials: "include" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Full backup created" })
        fetchBackups()
      } else {
        toast({ title: "Failed", description: json.error || "Could not create full backup", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed", description: "Could not create full backup", variant: "destructive" })
    } finally { setCreatingFull(false) }
  }

  const onRestore = async (file: File) => {
    setRestoring(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/backups/restore', { method: 'POST', body: fd, credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Restore started', description: 'The system will restore data from the backup.' })
      } else {
        toast({ title: 'Restore failed', description: json.error || 'Could not restore backup', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Restore failed', description: 'Could not restore backup', variant: 'destructive' })
    } finally { setRestoring(false) }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 container mx-auto p-6">
          <div className="text-center text-gray-600">Superadmin access required.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 container mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1976D2]">Data Backups</h1>
          <div className="flex items-center gap-2">
            <Button onClick={createBackup} disabled={creating}>{creating ? "Creating..." : "Create Backup"}</Button>
            <Button onClick={createFullBackup} disabled={creatingFull} className="bg-emerald-600 hover:bg-emerald-700">
              {creatingFull ? "Creating Full..." : "Create Full Backup"}
            </Button>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="px-3 py-2 border rounded-md bg-white cursor-pointer">{restoring ? 'Restoring...' : 'Restore Backup'}</span>
              <input type="file" accept=".zip,.tar.gz,.sql" className="hidden" disabled={restoring}
                onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onRestore(f); e.currentTarget.value='' }} />
            </label>
          </div>
        </div>
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 text-sm font-semibold text-gray-700">
            <div className="col-span-6">File</div>
            <div className="col-span-3">Size</div>
            <div className="col-span-3 text-right">Created</div>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : backups.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No backups yet.</div>
            ) : backups.map(b => (
              <div key={b.id} className="grid grid-cols-12 px-4 py-2 text-sm items-center">
                <div className="col-span-6 break-all">{b.file_name}</div>
                <div className="col-span-3">{(b.file_size / (1024*1024)).toFixed(2)} MB</div>
                <div className="col-span-3 text-right flex items-center justify-end gap-3">
                  <span className="text-gray-500">{new Date(b.created_at).toLocaleString()}</span>
                  <a className="text-[#1976D2] hover:underline" href={`/api/backups/${b.id}`}>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


