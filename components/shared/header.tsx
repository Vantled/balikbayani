"use client"

import { UserCircle, LogOut, Settings, User, ChevronDown, BadgeCheck } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function Header() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    // Navigate with logout indicator
    router.push('/login?logoutSuccess=true')
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between fixed top-0 left-0 w-full z-30">
      <h1 className="text-[#1976D2] text-2xl font-bold">BalikBayani Portal</h1>
      <div className="flex items-center space-x-4">
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/dashboard" 
            className={`text-sm pb-1 ${
              isActive('/dashboard') 
                ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                : 'text-gray-600 hover:text-[#1976D2]'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/direct-hire" 
            className={`text-sm pb-1 ${
              isActive('/direct-hire') 
                ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                : 'text-gray-600 hover:text-[#1976D2]'
            }`}
          >
            Direct Hire
          </Link>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`text-sm pb-1 flex items-center gap-1 ${
                    pathname.startsWith('/balik-manggagawa')
                      ? 'text-[#1976D2] border-b-2 border-[#1976D2]'
                      : 'text-gray-600 hover:text-[#1976D2]'
                  }`}
                  aria-label="Balik Manggagawa menu"
                >
                  Balik Manggagawa
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/balik-manggagawa/clearance">Clearance</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/balik-manggagawa/processing">Processing</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link 
            href="/gov-to-gov" 
            className={`text-sm pb-1 ${
              isActive('/gov-to-gov') 
                ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                : 'text-gray-600 hover:text-[#1976D2]'
            }`}
          >
            Gov to Gov
          </Link>
          <Link 
            href="/information-sheet" 
            className={`text-sm pb-1 ${
              isActive('/information-sheet') 
                ? 'text-[#1976D2] border-b-2 border-[#1976D2]' 
                : 'text-gray-600 hover:text-[#1976D2]'
            }`}
          >
            Information Sheet
          </Link>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`text-sm pb-1 flex items-center gap-1 ${
                    pathname.startsWith('/job-fairs')
                      ? 'text-[#1976D2] border-b-2 border-[#1976D2]'
                      : 'text-gray-600 hover:text-[#1976D2]'
                  }`}
                  aria-label="Job Fairs menu"
                >
                  Job Fairs
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
        </nav>
        <div className="flex items-center space-x-2">
          <UserCircle className="h-8 w-8 text-gray-700" />
          <span className="text-sm hidden md:inline">System Administrator</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-sm rounded-full border-gray-300 ml-2">
                Admin
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 