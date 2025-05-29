"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { login } from "@/lib/auth"
import { toast } from "react-hot-toast"

const quickLinks = [
  { label: "Forms & Applications", href: "#" },
  { label: "Regulations & Policies", href: "#" },
  { label: "Training Resources", href: "#" },
  { label: "FAQ", href: "#" },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const success = await login(username, password)
      if (success) {
        toast.success("Login successful!")
        const redirect = searchParams?.get("redirect") || "/dashboard"
        router.push(redirect)
      } else {
        setError("Invalid username or password.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eaf3fc]">
      {/* Header */}
      <header className="w-full fixed top-0 left-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
          <span className="text-2xl font-bold text-[#1976D2] drop-shadow-sm">BalikBayani Portal</span>
          <span className="text-sm text-gray-600 mt-1">Department of Migrant Workers</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24">
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
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              aria-label="Username"
              tabIndex={0}
              className="rounded-xl"
            />
            <Input
              type="password"
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
        </div>
      </main>
    </div>
  )
}
