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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export function LineChart() {
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
          stepSize: 1500,
          max: 6000,
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
    },
  }

  const data = {
    labels,
    datasets: [
      {
        label: "Direct Hire",
        data: [2000, 2200, 1800, 3100, 2900, 3000],
        borderColor: "#1976D2",
        backgroundColor: "#1976D2",
        tension: 0.4,
      },
      {
        label: "Balik Mangagagawa",
        data: [4000, 4200, 4000, 4700, 4100, 4600],
        borderColor: "#4CAF50",
        backgroundColor: "#4CAF50",
        tension: 0.4,
      },
      {
        label: "Gov to Gov",
        data: [1200, 1400, 1100, 1800, 1600, 2000],
        borderColor: "#FFC107",
        backgroundColor: "#FFC107",
        tension: 0.4,
      },
      {
        label: "Information Sheet",
        data: [2800, 3000, 2600, 3200, 3000, 3100],
        borderColor: "#9C27B0",
        backgroundColor: "#9C27B0",
        tension: 0.4,
      },
    ],
  }

  return (
    <div className="h-[300px] w-full">
      <Line options={options} data={data} />
      <div className="flex justify-center mt-4 text-xs gap-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#1976D2] rounded-full mr-1"></div>
          <span>Direct Hire</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#4CAF50] rounded-full mr-1"></div>
          <span>Balik Mangagagawa</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#FFC107] rounded-full mr-1"></div>
          <span>Gov to Gov</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#9C27B0] rounded-full mr-1"></div>
          <span>Information Sheet</span>
        </div>
      </div>
    </div>
  )
}
