"use client"

// components/processing-status-card.tsx
// Reusable processing status donut chart with KPI breakdown.

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js"

ChartJS.register(ArcElement, ChartTooltip, ChartLegend)

type StatusTotals = { pending: number; approved: number; rejected: number; forReview: number }

interface ProcessingStatusCardProps {
  title?: string
  className?: string
  // Optional override to fetch totals; should resolve to StatusTotals
  fetchTotals?: () => Promise<StatusTotals>
  verticalLayout?: boolean // if true, display vertically stacked layout
  chartHeight?: number // height in px for the donut chart area
  detailedDirectHire?: boolean // if true, use 7-status DH mapping when fetchTotals not provided
  labelOverrides?: Partial<Record<'pending' | 'forReview' | 'approved' | 'rejected', string>> // rename default labels
  fetchCustomItems?: () => Promise<Array<{ label: string; value: number; color?: string }>> // arbitrary categories
  legendColumns?: 1 | 2
}

export default function ProcessingStatusCard({ title = "Processing Status", className = "", fetchTotals, verticalLayout = false, chartHeight = 220, detailedDirectHire = false, labelOverrides, fetchCustomItems, legendColumns = 1 }: ProcessingStatusCardProps) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<{ label: string; value: number; color: string }[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Highest priority: custom items
        if (fetchCustomItems) {
          const raw = await fetchCustomItems()
          const palette = ['#90CAF9','#64B5F6','#FFE082','#FFCC80','#A5D6A7','#81C784','#B39DDB','#F48FB1','#80CBC4','#FFAB91']
          const mapped = raw.map((r, idx) => ({ label: r.label, value: r.value, color: r.color || palette[idx % palette.length] }))
          setItems(mapped)
          return
        }
        // Custom fetch provided: expect it to return the 4-key StatusTotals. We'll map to items.
        if (fetchTotals) {
          const t = await fetchTotals()
          setItems([
            { label: labelOverrides?.pending || 'Pending', value: t.pending, color: '#90CAF9' },
            { label: labelOverrides?.forReview || 'For Review', value: t.forReview, color: '#FFE082' },
            { label: labelOverrides?.approved || 'Approved', value: t.approved, color: '#A5D6A7' },
            { label: labelOverrides?.rejected || 'Rejected', value: t.rejected, color: '#EF9A9A' },
          ])
          return
        }

        if (detailedDirectHire) {
          // Seven-status detailed Direct Hire mapping
          // Colors match the exact hex values used in status badge pills
          const statusDefs = [
            { api: 'pending', label: 'For Evaluation', color: '#FFF3E0' }, // matches pill bg-[#FFF3E0]
            { api: 'evaluated', label: 'Evaluated', color: '#E3F2FD' }, // matches pill bg-[#E3F2FD]
            { api: 'for_confirmation', label: 'For Confirmation', color: '#DBEAFE' }, // bg-blue-100 (brighter blue for visibility)
            { api: 'emailed_to_dhad', label: 'Emailed to DHAD', color: '#BFDBFE' }, // bg-blue-200
            { api: 'received_from_dhad', label: 'Received from DHAD', color: '#CCFBF1' }, // bg-teal-100
            { api: 'for_interview', label: 'For Interview', color: '#FCE4EC' }, // matches pill bg-[#FCE4EC]
            { api: 'finished', label: 'Finished', color: '#16A34A' }, // bg-green-600
          ] as const

          const urls = statusDefs.map(s => `/api/direct-hire?status=${s.api}&page=1&limit=1`)
          const resps = await Promise.all(urls.map(u => fetch(u)))
          const jsons = await Promise.all(resps.map(r => r.json()))

          const nextItems = statusDefs.map((s, idx) => {
            const j = jsons[idx]
            const total = j?.data?.pagination?.total ?? (j?.data?.data?.length ?? 0)
            return { label: s.label, value: total || 0, color: s.color }
          })

          setItems(nextItems)
          return
        }

        // Default: four-status summary for Direct Hire
        const forReviewStatuses = ['evaluated','for_confirmation','emailed_to_dhad','received_from_dhad','for_interview']
        const urls = [
          ['/api/direct-hire?status=pending&page=1&limit=1', 'pending'],
          ['/api/direct-hire?status=approved&page=1&limit=1', 'approved'],
          ['/api/direct-hire?status=rejected&page=1&limit=1', 'rejected'],
          [`/api/direct-hire?status=${forReviewStatuses.join(',')}&page=1&limit=1`, 'forReview'],
        ] as const
        const resps = await Promise.all(urls.map(([u]) => fetch(u)))
        const jsons = await Promise.all(resps.map(r => r.json()))
        const next: any = {}
        jsons.forEach((j, idx) => {
          const key = urls[idx][1]
          next[key] = j?.data?.pagination?.total ?? (j?.data?.data?.length ?? 0)
        })
        setItems([
          { label: labelOverrides?.pending || 'Pending', value: next.pending || 0, color: '#90CAF9' },
          { label: labelOverrides?.forReview || 'For Review', value: next.forReview || 0, color: '#FFE082' },
          { label: labelOverrides?.approved || 'Approved', value: next.approved || 0, color: '#A5D6A7' },
          { label: labelOverrides?.rejected || 'Rejected', value: next.rejected || 0, color: '#EF9A9A' },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fetchTotals, detailedDirectHire, labelOverrides, fetchCustomItems])

  const labels = items.map(i => i.label)
  const dataValues = loading ? items.map(() => 0) : items.map(i => i.value)
  const colors = items.map(i => i.color)

  return (
    <Card className={`p-6 bg-white ${className}`}>
      <h3 className="text-base font-medium mb-1">{title}</h3>
      <div className={`grid ${verticalLayout ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-6`}>
        <div className="" style={{ height: chartHeight }}>
          <Doughnut
            data={{
              labels,
              datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 0,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } }
            }}
          />
        </div>
        <div className={`grid ${legendColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-sm`}>
          {items.map((i) => (
            <div key={i.label} className="p-2 rounded border bg-white flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
                <span className="text-gray-600">{i.label}</span>
              </div>
              <div className="text-base font-semibold">{loading ? '—' : i.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}


