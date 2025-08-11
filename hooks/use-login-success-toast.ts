// hooks/use-login-success-toast.ts
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

/**
 * Hook to handle login success toast notifications on any page
 * Checks for loginSuccess URL parameter and shows toast if present
 */
export function useLoginSuccessToast() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (searchParams?.get("loginSuccess") === "true") {
      toast({
        title: "Login successful!",
        description: "Welcome back to BalikBayani Portal!",
      })
      
      // Clean up URL parameter while preserving other params
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("loginSuccess")
      
      const newUrl = window.location.pathname + 
        (newSearchParams.toString() ? `?${newSearchParams.toString()}` : "")
      
      router.replace(newUrl)
    }
  }, [searchParams, toast, router])
}
