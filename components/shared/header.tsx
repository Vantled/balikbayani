"use client"

import { UserCircle, LogOut, Settings, User, ChevronDown, BadgeCheck, Users } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from "next/navigation"
import { logout, getUser, isSuperadmin, isAdmin } from "@/lib/auth"
import { usePermissions } from "@/hooks/use-permissions"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { validateSession } from "@/lib/auth"

export default function Header() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // Initialize as null on both server and client first render to avoid hydration mismatch
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { hasPermission, loading: permsLoading } = usePermissions()

  useEffect(() => {
    const user = getUser()
    setCurrentUser(user)
    setMounted(true)
  }, [])

  // Heartbeat + event-driven checks to keep session alive and auto-logout if expired
  useEffect(() => {
    let cancelled = false
    let interval: any

    const beat = async () => {
      const ok = await validateSession()
      if (!ok && !cancelled) {
        toast({
          title: "Session Expired",
          description: "You have been logged out because you logged in on another device.",
          variant: "destructive",
        })
        await logout()
        router.push('/login?sessionExpired=true')
      }
    }

    // Very frequent heartbeat: every 5s for prompt single-session enforcement
    interval = setInterval(beat, 5 * 1000)
    // Immediate check on mount
    beat()

    // Also check when tab gains focus or becomes visible
    const onFocus = () => { beat() }
    const onVisibility = () => { if (document.visibilityState === 'visible') beat() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])

  // Validate on route changes as well (but keep current user visible)
  useEffect(() => {
    const check = async () => {
      const ok = await validateSession()
      if (!ok) {
        toast({
          title: "Session Expired",
          description: "You have been logged out because you logged in on another device.",
          variant: "destructive",
        })
        await logout()
        router.push('/login?sessionExpired=true')
      } else {
        // Refresh currentUser from cookie (in case it changed) and mark ready
        setCurrentUser(getUser())
      }
      setAuthReady(true)
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      // Navigate with logout indicator
      router.push('/login?logoutSuccess=true')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const isActive = (path: string) => pathname === path

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { text: 'Superadmin', color: 'text-red-600', bgColor: 'bg-red-100' }
      case 'admin':
        return { text: 'Admin', color: 'text-blue-600', bgColor: 'bg-blue-100' }
      case 'staff':
        return { text: 'Staff', color: 'text-gray-600', bgColor: 'bg-gray-100' }
      default:
        return { text: 'User', color: 'text-gray-600', bgColor: 'bg-gray-100' }
    }
  }

  const roleDisplay = currentUser ? getRoleDisplay(currentUser.role) : { text: 'User', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between fixed top-0 left-0 w-full z-30">
      <h1 className="text-[#1976D2] text-base md:text-lg lg:text-2xl font-bold">BalikBayani Portal</h1>
      <div className="flex items-center gap-2 lg:gap-4 min-w-0">
        {mounted && authReady && !permsLoading && (
        <nav className="hidden md:flex items-center gap-3 lg:gap-6 overflow-x-auto whitespace-nowrap max-w-[55vw] lg:max-w-[65vw] pr-2">
          <Link 
            href="/dashboard" 
            className={`text-xs lg:text-sm pb-1 ${
              isActive('/dashboard') 
                ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                : 'text-gray-600 hover:text-[#1976D2]'
            }`}
          >
            Dashboard
          </Link>
          {(isAdmin(currentUser) || hasPermission('direct_hire')) && (
            <Link 
              href="/direct-hire" 
              className={`text-xs lg:text-sm pb-1 ${
                isActive('/direct-hire') 
                  ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                  : 'text-gray-600 hover:text-[#1976D2]'
              }`}
            >
              Direct Hire
            </Link>
          )}
          {(isAdmin(currentUser) || hasPermission('balik_manggagawa')) && (
            <Link 
              href="/balik-manggagawa" 
              className={`text-xs lg:text-sm pb-1 ${
                pathname.startsWith('/balik-manggagawa') 
                  ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                  : 'text-gray-600 hover:text-[#1976D2]'
              }`}
            >
              Balik Manggagawa
            </Link>
          )}
          {(isAdmin(currentUser) || hasPermission('gov_to_gov')) && (
            <Link 
              href="/gov-to-gov" 
              className={`text-xs lg:text-sm pb-1 ${
                isActive('/gov-to-gov') 
                  ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                  : 'text-gray-600 hover:text-[#1976D2]'
              }`}
            >
              Gov to Gov
            </Link>
          )}
          {(isAdmin(currentUser) || hasPermission('information_sheet')) && (
            <Link 
              href="/information-sheet" 
              className={`text-xs lg:text-sm pb-1 ${
                isActive('/information-sheet') 
                  ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                  : 'text-gray-600 hover:text-[#1976D2]'
              }`}
            >
              Information Sheet
            </Link>
          )}
          {(isAdmin(currentUser) || hasPermission('monitoring')) && (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`text-xs lg:text-sm pb-1 flex items-center gap-1 ${
                      pathname.startsWith('/job-fairs')
                        ? 'text-[#1976D2] border-b-2 border-[#1976D2]'
                        : 'text-gray-600 hover:text-[#1976D2]'
                    }`}
                    aria-label="Monitoring List menu"
                  >
                    Monitoring List
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/job-fairs/list">List of Job Fairs</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/job-fairs/peso">PESO IV-A Contact Info</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/job-fairs/pras">PRAs Contact Info</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/job-fairs/monitoring">Job Fair Monitoring Summary</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {/* Superadmin Panel - Only visible after auth ready to avoid flicker */}
          {authReady && mounted && (isAdmin(currentUser) || isSuperadmin(currentUser)) && (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`text-xs lg:text-sm pb-1 flex items-center gap-1 ${
                      pathname.startsWith('/user-management') || pathname.startsWith('/data-backups') || pathname.startsWith('/system-reports')
                        ? 'text-[#1976D2] border-b-2 border-[#1976D2]'
                        : 'text-gray-600 hover:text-[#1976D2]'
                    }`}
                    aria-label="Admin Panel menu"
                  >
                    Admin Panel
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/user-management">User Management</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/system-reports">System Reports</Link>
                  </DropdownMenuItem>
                  {isSuperadmin(currentUser) && (
                    <DropdownMenuItem asChild>
                      <Link href="/data-backups">Data Backups</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </nav>
        )}
        {mounted && authReady && (
          <div className="flex items-center gap-2">
            <UserCircle className="h-7 lg:h-8 w-7 lg:w-8 text-gray-700" />
            <span className="text-xs lg:text-sm hidden md:inline">
              {currentUser?.full_name || ''}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`text-xs lg:text-sm rounded-full border-gray-300 ml-2 ${roleDisplay.bgColor} ${roleDisplay.color}`}
                >
                  {roleDisplay.text}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
        )}
      </div>
    </header>
  )
} 