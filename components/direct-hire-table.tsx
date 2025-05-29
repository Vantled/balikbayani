"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProcessingPathsChart from "./processing-paths-chart"
import ApplicationsTable from "./applications-table"
import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

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

const directHireTotal = directHireApplications.length
const directHireMale = directHireApplications.filter(a => a.sex === 'Male').length
const directHireFemale = directHireApplications.filter(a => a.sex === 'Female').length

// Import data arrays from each module
const govToGovData = [
  { lastName: "Reyes", firstName: "Maria", middleName: "Clara", sex: "Female", taiwanExp: "Yes" },
  { lastName: "Lim", firstName: "Roberto", middleName: "Santos", sex: "Male", taiwanExp: "No" },
  { lastName: "Gomez", firstName: "Ana", middleName: "Lopez", sex: "Female", taiwanExp: "Yes" },
  { lastName: "Torres", firstName: "Michael", middleName: "Dela Cruz", sex: "Male", taiwanExp: "No" },
  { lastName: "Navarro", firstName: "Jose", middleName: "Ramos", sex: "Male", taiwanExp: "Yes" },
  { lastName: "Cruz", firstName: "Angela", middleName: "Villanueva", sex: "Female", taiwanExp: "No" },
  { lastName: "Delos Santos", firstName: "Patricia", middleName: "Mae", sex: "Female", taiwanExp: "Yes" },
]

const balikManggagawaData = [
  { control: "NCC 2025-0319-013-001", name: "Reyes, Maria Clara", sex: "Female", employer: "GlobalCare Inc.", destination: "UAE", salary: "$1,200" },
  { control: "WE 2025-0319-013-001", name: "Lim, Roberto", sex: "Male", employer: "QatarWorks", destination: "Qatar", salary: "$1,500" },
  { control: "FAC 2025-0319-025-001", name: "Gomez, Ana", sex: "Female", employer: "Kuwait Solutions", destination: "Kuwait", salary: "$1,800" },
  { control: "NVEC-2025-0319-029-001", name: "Torres, Michael", sex: "Male", employer: "HK Domestic", destination: "Hong Kong", salary: "$950" },
  { control: "SP-2025-0319-023-002", name: "Navarro, Jose", sex: "Male", employer: "Greek Shipping", destination: "Greece", salary: "$2,200" },
  { control: "CS-2025-0319-120-049", name: "Cruz, Angela", sex: "Female", employer: "Canada Health", destination: "Canada", salary: "$2,500" },
  { control: "DHPSW-ROIVA-2025-0319-013-001", name: "Delos Santos, Patricia Mae", sex: "Female", employer: "ABC Company", destination: "Singapore", salary: "$1,900" },
]

const infoSheetData = [
  { familyName: "Reyes", firstName: "Maria", middleName: "Clara", gender: "Female", jobsite: "UAE", agency: "GlobalCare Inc.", purpose: "Employment", workerCategory: "Landbased (Newhire)", requestedRecord: "Information Sheet" },
  { familyName: "Lim", firstName: "Roberto", middleName: "Santos", gender: "Male", jobsite: "Qatar", agency: "QatarWorks", purpose: "Legal", workerCategory: "Rehire (Balik Manggagawa)", requestedRecord: "OEC" },
  { familyName: "Gomez", firstName: "Ana", middleName: "Lopez", gender: "Female", jobsite: "Kuwait", agency: "Kuwait Solutions", purpose: "Loan", workerCategory: "Seafarer", requestedRecord: "Employment Contract" },
  { familyName: "Torres", firstName: "Michael", middleName: "Dela Cruz", gender: "Male", jobsite: "Hong Kong", agency: "HK Domestic", purpose: "VISA", workerCategory: "Landbased (Newhire)", requestedRecord: "Information Sheet" },
  { familyName: "Navarro", firstName: "Jose", middleName: "Ramos", gender: "Male", jobsite: "Greece", agency: "Greek Shipping", purpose: "Employment", workerCategory: "Seafarer", requestedRecord: "OEC" },
  { familyName: "Cruz", firstName: "Angela", middleName: "Villanueva", gender: "Female", jobsite: "Canada", agency: "Canada Health", purpose: "Philhealth", workerCategory: "Landbased (Newhire)", requestedRecord: "Employment Contract" },
  { familyName: "Delos Santos", firstName: "Patricia", middleName: "Mae", gender: "Female", jobsite: "Singapore", agency: "ABC Agency", purpose: "Employment", workerCategory: "Landbased (Newhire)", requestedRecord: "Information Sheet" },
]

// Calculate counts
const govToGovCount = govToGovData.length
const govToGovMaleCount = govToGovData.filter(item => item.sex === "Male").length
const govToGovFemaleCount = govToGovData.filter(item => item.sex === "Female").length

const balikManggagawaCount = balikManggagawaData.length
const balikManggagawaMaleCount = balikManggagawaData.filter(item => item.sex === "Male").length
const balikManggagawaFemaleCount = balikManggagawaData.filter(item => item.sex === "Female").length

const infoSheetCount = infoSheetData.length
const infoSheetMaleCount = infoSheetData.filter(item => item.gender === "Male").length
const infoSheetFemaleCount = infoSheetData.filter(item => item.gender === "Female").length

export default function DirectHireTable() {
  const [activeTab, setActiveTab] = useState("overview")
  const [search, setSearch] = useState("")

  const filteredApplications = directHireApplications.filter(application =>
    Object.values(application).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

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
                className="pl-8 h-9 w-[240px] bg-white" 
                placeholder="Search" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center border border-gray-300 rounded-md bg-white">
            <span className="px-3 text-sm">All Time</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                className="lucide lucide-chevron-down"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
              <h2 className="text-2xl font-bold mb-4">{directHireTotal}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs h-8 rounded">All</Button>
                <Button variant="outline" className="text-xs h-8 rounded">
                  Male ({directHireMale})
                </Button>
                <Button variant="outline" className="text-xs h-8 rounded">
                  Female ({directHireFemale})
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{directHireTotal} total</p>
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
              <h2 className="text-2xl font-bold mb-4">{balikManggagawaCount}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs h-8 rounded">All</Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Male ({balikManggagawaMaleCount})
                </Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Female ({balikManggagawaFemaleCount})
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{balikManggagawaCount} total</p>
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
              <h2 className="text-2xl font-bold mb-4">{govToGovCount}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs h-8 rounded">All</Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Male ({govToGovMaleCount})
                </Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Female ({govToGovFemaleCount})
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{govToGovCount} total</p>
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
              <h2 className="text-2xl font-bold mb-4">{infoSheetCount}</h2>
              <div className="grid grid-cols-3 gap-1">
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs h-8 rounded">All</Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Male ({infoSheetMaleCount})
                </Button>
                <Button variant="outline" className="bg-white text-xs h-8 rounded">
                  Female ({infoSheetFemaleCount})
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{infoSheetCount} total</p>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6 bg-white">
            <h3 className="text-base font-medium mb-1">Applications Timeline</h3>
            <p className="text-xs text-gray-500 mb-4">Application trends over time across all categories</p>
            <ProcessingPathsChart />
          </Card>
        </>
      ) : (
        <ApplicationsTable applications={filteredApplications} />
      )}
    </>
  )
}
