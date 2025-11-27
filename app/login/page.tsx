"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { login } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { BadgeCheck, X, AlertTriangle } from "lucide-react"
import ForgotPasswordModal from "@/components/forgot-password-modal"

const quickLinks = [
  { label: "Forms & Applications", href: "#" },
  { label: "Regulations & Policies", href: "#" },
  { label: "Training Resources", href: "#" },
  { label: "FAQ", href: "#" },
]

export default function LoginPage() {
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Prevent body scrolling on login page (desktop only, allow scrolling on mobile for footer)
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        // Desktop: prevent scrolling
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
      } else {
        // Mobile: allow scrolling to see footer
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Handle logout success and session expired toasts
  React.useEffect(() => {
    if (searchParams?.get("logoutSuccess") === "true") {
      toast({
        title: "Logged out successfully!",
        description: "Thank you for using BalikBayani Portal. Have a great day!",
      })
      // Clean up URL parameter
      router.replace('/login')
    }
    
    if (searchParams?.get("sessionExpired") === "true") {
      toast({
        title: "Session Expired",
        description: "You were logged out because you logged in on another device. Please sign in again.",
        variant: "destructive",
      })
      // Clean up URL parameter
      router.replace('/login')
    }

    if (searchParams?.get("registered") === "true") {
      toast({
        title: "Registration successful",
        description: "Please sign in with the credentials you just created.",
      })
      router.replace('/login')
    }
  }, [searchParams, toast, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    
    // Validate fields
    if (!username.trim()) {
      toast({
        title: "Username/Email required",
        description: "Please enter your username or email address.",
        variant: "destructive",
      })
      return
    }
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your password.",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    
    try {
      const result = await login(username, password)
      if (result.success) {
        const roleBasedDefault = result.user?.role === 'applicant' ? '/applicant' : '/dashboard'
        const redirect = searchParams?.get("from") || roleBasedDefault
        // Wait a bit for cookies to be set before navigating
        await new Promise(resolve => setTimeout(resolve, 100))
        // Use window.location.href to force a full page reload, ensuring cookies are available
        window.location.href = `${redirect}?loginSuccess=true`
      } else {
        setError(result.error || "Invalid username/email or password.")
        
        // Provide more specific error messages
        let errorTitle = "Login failed"
        let errorDescription = result.error || "Please check your username/email and password and try again."
        
        if (result.error?.toLowerCase().includes('locked') || result.error?.toLowerCase().includes('suspended')) {
          errorTitle = "Account locked"
          errorDescription = "Your account has been temporarily locked. Please contact support or try again later."
        } else if (result.error?.toLowerCase().includes('inactive') || result.error?.toLowerCase().includes('not approved')) {
          errorTitle = "Account not active"
          errorDescription = "Your account is not yet approved or has been deactivated. Please contact your administrator."
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      setError("An error occurred. Please try again.")
      
      let errorMessage = "Unable to connect to the server. Please check your internet connection."
      if (err?.message) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again."
        } else if (err.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again."
        } else {
          errorMessage = err.message
        }
      }
      
      toast({
        title: "Connection error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-[#eaf3fc] min-h-screen sm:h-screen">
      {/* Header */}
      <header className="w-full fixed top-0 left-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
          <span className="text-2xl font-bold text-[#1976D2] drop-shadow-sm">BalikBayani Portal</span>
          <span className="text-sm text-gray-600 mt-1">Department of Migrant Workers</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center pb-20 sm:pb-0">
        <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          <Image
            src="/dmw-logo.png"
            alt="Department of Migrant Workers Logo"
            width={100}
            height={100}
            className="mb-4"
          />
          <h1 className="text-2xl font-bold text-center mb-2">BalikBayani Portal</h1>
          <p className="text-center text-gray-600 text-sm mb-1">
            Secure portal for authorized personnel of the<br />
            Migrant Workers Processing Division
          </p>
          <p className="text-center text-gray-500 text-xs mb-6">Please sign in to continue</p>

          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Username/Email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              aria-label="Username or Email"
              tabIndex={0}
              className="rounded-xl"
            />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              aria-label="Password"
              tabIndex={0}
              className="rounded-xl"
            />
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Button
              type="submit"
              className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white rounded-xl"
              disabled={loading}
              aria-label="Sign in"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="text-sm text-gray-600 text-center mt-4 space-y-2">
            <p>
              Need an applicant account?{" "}
              <Link href="/register" className="text-[#1976D2] font-semibold hover:underline">
                Register here
              </Link>
            </p>
            <p>
              Forgot your password?{' '}
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-[#1976D2] font-semibold hover:underline"
              >
                Reset here
              </button>
            </p>
          </div>
        </div>
      </main>

      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </div>
  )
}
