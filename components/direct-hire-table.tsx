"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProcessingPathsChart from "./processing-paths-chart"
import ApplicationsTable from "./applications-table"
import { useEffect, useState } from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import FilterPanel from "./filter-panel"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js"

ChartJS.register(ArcElement, ChartTooltip, ChartLegend)

type Application = {
  id: number
  name: string
  category: string
  jobsite: string
  sex: string
  status: "completed" | "processing" | "rejected"
}

const directHireApplications = [
  {
    id: 1,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-001",
    name: "Delos Santos, Patricia Mae",
    sex: "Female",
    salary: "$690",
    status: "evaluated",
  },
  {
    id: 2,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-002",
    name: "Santos, Juan Dela Cruz",
    sex: "Male",
    salary: "$1,200",
    status: "for confirmation",
  },
  {
    id: 3,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-003",
    name: "Reyes, Maria Clara",
    sex: "Female",
    salary: "$2,000",
    status: "emailed to dhad",
  },
  {
    id: 4,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-004",
    name: "Lim, Roberto",
    sex: "Male",
    salary: "$1,500",
    status: "received from dhad",
  },
  {
    id: 5,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-005",
    name: "Gomez, Ana",
    sex: "Female",
    salary: "$1,800",
    status: "for interview",
  },
  {
    id: 6,
    controlNumber: "DHPSW-ROIVA-2025-0319-013-006",
    name: "Torres, Michael",
    sex: "Male",
    salary: "$950",
    status: "for appointment",
  },
]

type DashboardStats = {
  directHire: number
  directHireMale: number
  directHireFemale: number
  clearance: number
  clearanceMale: number
  clearanceFemale: number
  govToGov: number
  infoSheet: number
  pendingUsers: number
}

// Remote totals for Gov-to-Gov and Information Sheet
type SexTotals = { all: number; male: number; female: number }

export default function DirectHireTable() {
  const [activeTab, setActiveTab] = useState("overview")
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Add state for search and filter functionality
  const [showFilter, setShowFilter] = useState(false)
  const [panelQuery, setPanelQuery] = useState("")

  // Filter panel state
  const [typeHousehold, setTypeHousehold] = useState(false)
  const [typeProfessional, setTypeProfessional] = useState(false)
  const [sexFilter, setSexFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateWithin, setDateWithin] = useState("")
  const [jobsiteFilter, setJobsiteFilter] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [evaluatorFilter, setEvaluatorFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")

  const clearPanel = () => {
    setTypeHousehold(false)
    setTypeProfessional(false)
    setSexFilter("")
    setStatusFilter("")
    setDateWithin("")
    setJobsiteFilter("")
    setPositionFilter("")
    setEvaluatorFilter("")
    setCategoryFilter("")
    setPanelQuery("")
  }

  // Add state for gender filters for each card
  const [directHireFilter, setDirectHireFilter] = useState<"all" | "male" | "female">("all")
  const [balikManggagawaFilter, setBalikManggagawaFilter] = useState<"all" | "male" | "female">("all")
  const [govToGovFilter, setGovToGovFilter] = useState<"all" | "male" | "female">("all")
  const [infoSheetFilter, setInfoSheetFilter] = useState<"all" | "male" | "female">("all")

  // Totals sourced from API
  const [govToGovTotals, setGovToGovTotals] = useState<SexTotals>({ all: 0, male: 0, female: 0 })
  const [infoSheetTotals, setInfoSheetTotals] = useState<SexTotals>({ all: 0, male: 0, female: 0 })
  const [loadingGovToGov, setLoadingGovToGov] = useState(false)
  const [loadingInfoSheet, setLoadingInfoSheet] = useState(false)

  // Gender totals (DH + BM)
  const [genderTotals, setGenderTotals] = useState<{ male: number; female: number } | null>(null)

  // Direct Hire status distribution handled by ProcessingStatusCard

  // Helper functions to get the display value for each card
  const getDirectHireDisplayValue = () => {
    if (loadingStats) return '—'
    switch (directHireFilter) {
      case "male": return stats?.directHireMale ?? 0
      case "female": return stats?.directHireFemale ?? 0
      default: return stats?.directHire ?? 0
    }
  }

  const getBalikManggagawaDisplayValue = () => {
    if (loadingStats) return '—'
    switch (balikManggagawaFilter) {
      case "male": return stats?.clearanceMale ?? 0
      case "female": return stats?.clearanceFemale ?? 0
      default: return stats?.clearance ?? 0
    }
  }

  const getGovToGovDisplayValue = () => {
    if (loadingGovToGov) return '—'
    switch (govToGovFilter) {
      case "male": return govToGovTotals.male
      case "female": return govToGovTotals.female
      default: return govToGovTotals.all
    }
  }

  const getInfoSheetDisplayValue = () => {
    if (loadingInfoSheet) return '—'
    switch (infoSheetFilter) {
      case "male": return infoSheetTotals.male
      case "female": return infoSheetTotals.female
      default: return infoSheetTotals.all
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      if (data.success) setStats(data.data)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Fetch Gov-to-Gov totals from API using pagination.total
  useEffect(() => {
    const run = async () => {
      setLoadingGovToGov(true)
      try {
        const [allRes, maleRes, femaleRes] = await Promise.all([
          fetch('/api/gov-to-gov?page=1&limit=1'),
          fetch('/api/gov-to-gov?sex=male&page=1&limit=1'),
          fetch('/api/gov-to-gov?sex=female&page=1&limit=1'),
        ])
        const [allJson, maleJson, femaleJson] = await Promise.all([allRes.json(), maleRes.json(), femaleRes.json()])
        const all = allJson?.data?.pagination?.total ?? (allJson?.data?.data?.length ?? 0)
        const male = maleJson?.data?.pagination?.total ?? (maleJson?.data?.data?.length ?? 0)
        const female = femaleJson?.data?.pagination?.total ?? (femaleJson?.data?.data?.length ?? 0)
        setGovToGovTotals({ all, male, female })
      } finally {
        setLoadingGovToGov(false)
      }
    }
    run()
  }, [])

  // Derive gender totals from base stats (no date range; ready for future filter controls)
  useEffect(() => {
    if (stats) {
      setGenderTotals({
        male: (stats.directHireMale ?? 0) + (stats.clearanceMale ?? 0),
        female: (stats.directHireFemale ?? 0) + (stats.clearanceFemale ?? 0),
      })
    }
  }, [stats])

  // Combined totals across all workers (DH + BM + Gov-to-Gov + Info Sheet)
  const totalWorkersAll = (stats?.directHire ?? 0) + (stats?.clearance ?? 0) + govToGovTotals.all + infoSheetTotals.all
  const allGenderTotals = {
    male: (stats?.directHireMale ?? 0) + (stats?.clearanceMale ?? 0) + govToGovTotals.male + infoSheetTotals.male,
    female: (stats?.directHireFemale ?? 0) + (stats?.clearanceFemale ?? 0) + govToGovTotals.female + infoSheetTotals.female,
  }

  // Status distribution now fetched inside ProcessingStatusCard

  // Fetch Information Sheet totals from API using pagination.total
  useEffect(() => {
    const run = async () => {
      setLoadingInfoSheet(true)
      try {
        const [allRes, maleRes, femaleRes] = await Promise.all([
          fetch('/api/information-sheet?page=1&limit=1'),
          fetch('/api/information-sheet?sex=male&page=1&limit=1'),
          fetch('/api/information-sheet?sex=female&page=1&limit=1'),
        ])
        const [allJson, maleJson, femaleJson] = await Promise.all([allRes.json(), maleRes.json(), femaleRes.json()])
        const all = allJson?.data?.pagination?.total ?? (allJson?.data?.data?.length ?? 0)
        const male = maleJson?.data?.pagination?.total ?? (maleJson?.data?.data?.length ?? 0)
        const female = femaleJson?.data?.pagination?.total ?? (femaleJson?.data?.data?.length ?? 0)
        setInfoSheetTotals({ all, male, female })
      } finally {
        setLoadingInfoSheet(false)
      }
    }
    run()
  }, [])

  const [recentApps, setRecentApps] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const loadRecent = async (page = 1, limit = 10) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (search) params.append('search', search)
      if (panelQuery) params.append('filterQuery', panelQuery)
      
      const res = await fetch(`/api/dashboard/recent?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setRecentApps(data.data)
        setPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 20,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        })
      }
    } catch {}
  }

  useEffect(() => {
    loadRecent(1, 10)
  }, [])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    loadRecent(1, pagination.limit)
  }, [search, panelQuery])

  return (
    <>
      <h2 className="text-xl font-medium text-[#1976D2] mb-4">Dashboard</h2>

      {/* Tabs */}
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="overview" className="w-auto" onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="bg-white border border-gray-200 h-10">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#1976D2] data-[state=active]:text-white px-8"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="data-[state=active]:bg-[#1976D2] data-[state=active]:text-white px-8"
            >
              Applications
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {activeTab === "applications" && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                placeholder="Search or key:value" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              {/* Filter Panel */}
              {showFilter && (
                <div className="absolute right-0 top-12 z-50">
                  <FilterPanel 
                    onClose={() => setShowFilter(false)} 
                    onApply={(query) => {
                      setPanelQuery(query)
                      setShowFilter(false)
                    }}
                    sex={sexFilter}
                    setSex={setSexFilter}
                    status={statusFilter}
                    setStatus={setStatusFilter}
                    dateWithin={dateWithin}
                    setDateWithin={setDateWithin}
                    jobsite={jobsiteFilter}
                    setJobsite={setJobsiteFilter}
                    position={positionFilter}
                    setPosition={setPositionFilter}
                    onClear={clearPanel}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Direct Hire Card */}
            <Card className="p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-gray-600 text-center">Direct Hire</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1976D2]"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">{getDirectHireDisplayValue()}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button 
                  className={`text-xs h-8 rounded ${directHireFilter === "all" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={directHireFilter === "all" ? "default" : "outline"}
                  onClick={() => setDirectHireFilter("all")}
                >
                  All
                </Button>
                <Button 
                  className={`text-xs h-8 rounded ${directHireFilter === "male" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={directHireFilter === "male" ? "default" : "outline"}
                  onClick={() => setDirectHireFilter("male")}
                >
                  Male
                </Button>
                <Button 
                  className={`text-xs h-8 rounded ${directHireFilter === "female" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={directHireFilter === "female" ? "default" : "outline"}
                  onClick={() => setDirectHireFilter("female")}
                >
                  Female
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingStats ? '—' : (stats?.directHire ?? 0)} total</p>
            </Card>

            {/* Balik Mangagagawa Card */}
            <Card className="p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-gray-600 text-center">Balik Mangagagawa</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1976D2]"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-3">{getBalikManggagawaDisplayValue()}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button 
                  className={`text-[11px] h-7 rounded ${balikManggagawaFilter === "all" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={balikManggagawaFilter === "all" ? "default" : "outline"}
                  onClick={() => setBalikManggagawaFilter("all")}
                >
                  All
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${balikManggagawaFilter === "male" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={balikManggagawaFilter === "male" ? "default" : "outline"}
                  onClick={() => setBalikManggagawaFilter("male")}
                >
                  Male
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${balikManggagawaFilter === "female" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={balikManggagawaFilter === "female" ? "default" : "outline"}
                  onClick={() => setBalikManggagawaFilter("female")}
                >
                  Female
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingStats ? '—' : (stats?.clearance ?? 0)} total</p>
            </Card>

            {/* Gov to Gov Card */}
            <Card className="p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-gray-600 text-center">Gov to Gov</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1976D2]"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-3">{getGovToGovDisplayValue()}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button 
                  className={`text-[11px] h-7 rounded ${govToGovFilter === "all" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={govToGovFilter === "all" ? "default" : "outline"}
                  onClick={() => setGovToGovFilter("all")}
                >
                  All
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${govToGovFilter === "male" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={govToGovFilter === "male" ? "default" : "outline"}
                  onClick={() => setGovToGovFilter("male")}
                >
                  Male
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${govToGovFilter === "female" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={govToGovFilter === "female" ? "default" : "outline"}
                  onClick={() => setGovToGovFilter("female")}
                >
                  Female
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingGovToGov ? '—' : govToGovTotals.all} total</p>
            </Card>

            {/* Information Sheet Card */}
            <Card className="p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-gray-600 text-center">Information Sheet</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1976D2]"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-3">{getInfoSheetDisplayValue()}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button 
                  className={`text-[11px] h-7 rounded ${infoSheetFilter === "all" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={infoSheetFilter === "all" ? "default" : "outline"}
                  onClick={() => setInfoSheetFilter("all")}
                >
                  All
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${infoSheetFilter === "male" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={infoSheetFilter === "male" ? "default" : "outline"}
                  onClick={() => setInfoSheetFilter("male")}
                >
                  Male
                </Button>
                <Button 
                  className={`text-[11px] h-7 rounded ${infoSheetFilter === "female" ? "bg-[#1976D2] hover:bg-[#1565C0] text-white" : "bg-white"}`}
                  variant={infoSheetFilter === "female" ? "default" : "outline"}
                  onClick={() => setInfoSheetFilter("female")}
                >
                  Female
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingInfoSheet ? '—' : infoSheetTotals.all} total</p>
            </Card>
          </div>

          {/* Timeline + Gender Ratio row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-0">
            <Card className="p-4 bg-white md:col-span-2">
              <h3 className="text-sm font-medium mb-1">Applications Timeline</h3>
              <p className="text-xs text-gray-500 mb-2">Recent trends</p>
              <ProcessingPathsChart height={340} />
            </Card>
            <div className="grid grid-cols-1 auto-rows-min gap-4">
              <Card className="p-4 bg-white">
                <h3 className="text-sm text-gray-600">Gender Ratio (DH + BM)</h3>
                <div className="flex items-end gap-4 mt-3">
                <div className="flex-1 h-[180px]">
                    <Doughnut
                      data={{
                        labels: ['Male','Female'],
                        datasets: [{
                        data: [allGenderTotals.male, allGenderTotals.female],
                          backgroundColor: ['#42A5F5','#EF9A9A'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-600">
                  <div>Male: <span className="font-semibold">{allGenderTotals.male}</span></div>
                  <div>Female: <span className="font-semibold">{allGenderTotals.female}</span></div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-white">
                <h3 className="text-sm text-gray-600">Total Workers</h3>
                <div className="text-2xl font-bold mt-2">{(loadingStats || loadingGovToGov || loadingInfoSheet) ? '—' : totalWorkersAll}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded border bg-white">
                    <div className="text-gray-500">Male</div>
                    <div className="text-base font-semibold">{(loadingStats || loadingGovToGov || loadingInfoSheet) ? '—' : allGenderTotals.male}</div>
                  </div>
                  <div className="p-2 rounded border bg-white">
                    <div className="text-gray-500">Female</div>
                    <div className="text-base font-semibold">{(loadingStats || loadingGovToGov || loadingInfoSheet) ? '—' : allGenderTotals.female}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">All categories</p>
              </Card>
            </div>
          </div>
          
        </>
             ) : (
         <ApplicationsTable 
           applications={recentApps} 
           search={search} 
           filterQuery={panelQuery}
           pagination={pagination}
           onPageChange={(page) => loadRecent(page, pagination.limit)}
         />
       )}
    </>
  )
}
