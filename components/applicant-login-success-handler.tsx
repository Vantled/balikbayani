// components/applicant-login-success-handler.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getUser } from '@/lib/auth'

export default function ApplicantLoginSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams?.get('loginSuccess') === 'true') {
      const user = getUser()
      const userName = user?.full_name || user?.username || 'there'
      
      toast({
        title: 'Login successful!',
        description: `Welcome back, ${userName}!`,
      })
      
      // Clean up URL parameter
      router.replace('/applicant')
    }
  }, [searchParams, router, toast])

  return null
}

