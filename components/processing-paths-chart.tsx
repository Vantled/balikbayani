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

export default function ProcessingPathsChart() {
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

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "#f0f0f0",
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
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
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <Line options={options} data={chartData} />
      <div className="flex flex-wrap justify-center mt-8 text-xs gap-4">
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
