"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function NavigationToastHandler() {
  const pathname = usePathname()
  const { dismiss } = useToast()
  const previousPathnameRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Skip first render completely
    if (!isInitializedRef.current) {
      previousPathnameRef.current = pathname
      isInitializedRef.current = true
      return
    }
    
    // Only dismiss toasts if we actually navigated to a different route
    if (previousPathnameRef.current !== pathname) {
      dismiss()
      previousPathnameRef.current = pathname
    }
  }, [pathname])

  return null
}
