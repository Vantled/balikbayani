// components/applicant-header.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { UserCircle, LogOut, User, Menu, Home, PlayCircle, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { logout, getUser } from "@/lib/auth"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function ApplicantHeader() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    // Read user from cookie on client
    const user = getUser()
    setCurrentUser(user)
    setMounted(true)
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push("/login?logoutSuccess=true")
    } catch (error) {
      console.error("Logout error (applicant):", error)
      setIsLoggingOut(false)
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!mounted) return null

  const isActive = (href: string) => pathname === href

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between fixed top-0 left-0 w-full z-30">
      <div className="flex items-center">
        <h1 className="text-[#1976D2] text-base md:text-lg lg:text-2xl font-bold">
          BalikBayani Portal
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Desktop nav for applicants on the right side */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link
            href="/applicant"
            className={`pb-0.5 border-b-2 transition-colors ${
              isActive("/applicant")
                ? "border-[#0f62fe] text-[#0f62fe]"
                : "border-transparent text-gray-600 hover:text-[#0f62fe]"
            }`}
          >
            Home
          </Link>
          <Link
            href="/applicant/start"
            className={`pb-0.5 border-b-2 transition-colors ${
              isActive("/applicant/start")
                ? "border-[#0f62fe] text-[#0f62fe]"
                : "border-transparent text-gray-600 hover:text-[#0f62fe]"
            }`}
          >
            Application
          </Link>
          <Link
            href="/applicant/status"
            className={`pb-0.5 border-b-2 transition-colors ${
              isActive("/applicant/status")
                ? "border-[#0f62fe] text-[#0f62fe]"
                : "border-transparent text-gray-600 hover:text-[#0f62fe]"
            }`}
          >
            Track Status
          </Link>
        </nav>

        {/* User avatar + hamburger menu */}
        <div className="flex items-center gap-2">
        <UserCircle className="h-7 lg:h-8 w-7 lg:w-8 text-gray-700" />
        <span className="text-xs lg:text-sm hidden sm:inline">
          {currentUser?.full_name || ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="ml-1 rounded-full border-gray-300"
              aria-label="Open profile menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Mobile-only nav shortcuts (hidden on md+ where links are in the header) */}
            <DropdownMenuItem
              className="cursor-pointer md:hidden"
              onClick={() => router.push("/applicant")}
            >
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer md:hidden"
              onClick={() => router.push("/applicant/start")}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              <span>Application</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer md:hidden"
              onClick={() => router.push("/applicant/status")}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              <span>Track Status</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  )
}


