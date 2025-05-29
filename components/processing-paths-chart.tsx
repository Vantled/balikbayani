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
import { useMemo } from "react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// Total data from cards
const applicationData = {
  "Direct Hire": {
    total: 6,
    monthlyData: [2, 1, 1, 1, 0, 1] // Jan to Jun
  },
  "Balik Manggagawa": {
    total: 6,
    monthlyData: [1, 1, 1, 1, 1, 1] // Jan to Jun
  },
  "Gov to Gov": {
    total: 4,
    monthlyData: [1, 0, 1, 1, 1, 0] // Jan to Jun
  },
  "Information Sheet": {
    total: 2,
    monthlyData: [1, 1, 0, 0, 0, 0] // Jan to Jun
  }
}

export default function ProcessingPathsChart() {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

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
    // Define colors for each category
    const colors = {
      "Direct Hire": "#1976D2",
      "Balik Manggagawa": "#4CAF50",
      "Gov to Gov": "#FF9800",
      "Information Sheet": "#00BCD4"
    }

    // Create datasets in the specified order
    const datasets = [
      {
        label: "Direct Hire",
        data: applicationData["Direct Hire"].monthlyData,
        borderColor: colors["Direct Hire"],
        backgroundColor: colors["Direct Hire"],
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Balik Manggagawa",
        data: applicationData["Balik Manggagawa"].monthlyData,
        borderColor: colors["Balik Manggagawa"],
        backgroundColor: colors["Balik Manggagawa"],
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Gov to Gov",
        data: applicationData["Gov to Gov"].monthlyData,
        borderColor: colors["Gov to Gov"],
        backgroundColor: colors["Gov to Gov"],
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Information Sheet",
        data: applicationData["Information Sheet"].monthlyData,
        borderColor: colors["Information Sheet"],
        backgroundColor: colors["Information Sheet"],
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]

    return {
      labels,
      datasets,
    }
  }, [])

  return (
    <div className="h-[300px] w-full">
      <Line options={options} data={chartData} />
      <div className="flex flex-wrap justify-center mt-4 text-xs gap-4">
        {chartData.datasets.map((dataset) => (
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
