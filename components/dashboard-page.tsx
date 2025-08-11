"use client"

import DirectHireTable from "@/components/direct-hire-table"
import Header from "@/components/shared/header"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

export default function DashboardPage() {
  // Handle login success toast
  useLoginSuccessToast()
  return (
    <div className="flex flex-col min-h-screen bg-[#EEF5FD]">
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 p-6 pt-24">
        <DirectHireTable />
      </main>
    </div>
  )
}
