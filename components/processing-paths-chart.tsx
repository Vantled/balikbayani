"use client"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { useMemo, useEffect, useState } from "react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function ProcessingPathsChart({ height = 220 }: { height?: number }) {
  const [timelineData, setTimelineData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const res = await fetch('/api/dashboard/timeline?months=6')
        const data = await res.json()
        if (data.success) {
          setTimelineData(data.data)
        }
      } catch (error) {
        console.error('Error fetching timeline data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimelineData()
  }, [])

  const ySuggestedMax = useMemo(() => {
    if (!timelineData?.datasets?.length) return undefined
    let maxVal = 0
    for (const ds of timelineData.datasets) {
      for (const v of (ds.data || [])) {
        if (typeof v === 'number' && v > maxVal) maxVal = v
      }
    }
    if (maxVal <= 0) return undefined
    return Math.ceil(maxVal * 1.5)
  }, [timelineData])

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: ySuggestedMax,
        grace: '15%',
        grid: { color: "#f0f0f0" },
        ticks: { precision: 0 },
      },
      x: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} applications`;
          }
        }
      }
    },
  }

  const chartData = useMemo(() => {
    if (!timelineData) {
      return {
        labels: [],
        datasets: []
      }
    }

    // Create datasets with proper styling
    const datasets = timelineData.datasets.map((dataset: any) => ({
      ...dataset,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }))

    return {
      labels: timelineData.labels,
      datasets,
    }
  }, [timelineData])

  if (loading) {
    return (
      <div className={`w-full flex items-center justify-center`} style={{ height }}>
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <Line options={options} data={chartData} />
      <div className="flex flex-wrap justify-center mt-4 text-[10px] gap-3">
        {chartData.datasets.map((dataset: any) => (
          <div key={dataset.label} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1" 
              style={{ backgroundColor: dataset.borderColor }}
            />
            <span>{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
