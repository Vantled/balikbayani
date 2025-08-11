"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MoreHorizontal, Plus, Download, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLoginSuccessToast } from "@/hooks/use-login-success-toast"

// Mock data for each tab
const initialJobFairs = [
  {
    date: "2024-03-15",
    venue: "SMX Convention Center",
    officeHead: "John Doe",
    email: "john@example.com",
    contactNo: "09123456789",
  },
]

const initialPesoContacts = [
  {
    province: "Cavite",
    pesoOffice: "Cavite PESO",
    officeHead: "Jane Smith",
    email: "jane@example.com",
    contactNo: "09123456789",
  },
]

const initialPraContacts = [
  {
    name: "ABC Recruitment",
    praContactPerson: "Mike Johnson",
    officeHead: "Sarah Wilson",
    email: "sarah@example.com",
    contactNo: "09123456789",
  },
]

const initialMonitoringSummary = [
  {
    date: "2024-03-15",
    venue: "SMX Convention Center",
    invitedAgencies: 20,
    agenciesWithJfa: 18,
    maleApplicants: 150,
    femaleApplicants: 120,
    totalApplicants: 270,
  },
]

export default function JobFairsPage() {
  // Handle login success toast
  useLoginSuccessToast()
  
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    router.push("/job-fairs/list")
  }, [router])

  return null
} 