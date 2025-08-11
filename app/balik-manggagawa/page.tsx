"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BalikManggagawaRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/balik-manggagawa/clearance")
  }, [router])

  return null
} 