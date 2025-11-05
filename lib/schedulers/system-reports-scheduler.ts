// lib/schedulers/system-reports-scheduler.ts
// Lightweight singleton scheduler that runs daily to generate last month's certificate if missing.
import { DatabaseService } from '@/lib/services/database-service'
import { generateSystemReportCertificate } from '@/lib/services/system-report-generator'

declare global {
  // eslint-disable-next-line no-var
  var __systemReportsScheduler: { started: boolean } | undefined
}

function getPreviousMonthYear(date = new Date()): { month: number; year: number } {
  const d = new Date(date)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

async function runTaskOnce() {
  try {
    const { month, year } = getPreviousMonthYear()
    const existing = await DatabaseService.getSystemReportCertificateByMonthYear(month, year)
    if (existing) return
    await generateSystemReportCertificate({ month, year, createdBy: null })
  } catch (_e) {
    // Intentionally swallow errors to keep scheduler running
  }
}

function scheduleDailyAt(hour: number, minute: number, fn: () => void) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const initialDelay = next.getTime() - now.getTime()
  setTimeout(() => {
    fn()
    setInterval(fn, 24 * 60 * 60 * 1000)
  }, initialDelay)
}

export function initSystemReportsScheduler() {
  if (global.__systemReportsScheduler?.started) return
  global.__systemReportsScheduler = { started: true }
  // Run once shortly after startup, then daily at 01:10 server time
  setTimeout(runTaskOnce, 15_000)
  scheduleDailyAt(1, 10, runTaskOnce)
}




