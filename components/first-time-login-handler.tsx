// components/first-time-login-handler.tsx
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import FirstTimeLoginModal from './first-time-login-modal'

export default function FirstTimeLoginHandler() {
  const [showModal, setShowModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkFirstTimeLogin = async () => {
      try {
        // First check if user is authenticated
        const user = getUser()
        console.log('FirstTimeLoginHandler: User from cookies:', user)
        
        if (user) {
          // Fetch complete user data from server to get is_first_login flag
          const response = await fetch('/api/profile', {
            credentials: 'include'
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('FirstTimeLoginHandler: Profile data:', data)
            if (data.success && data.data.user.is_first_login) {
              console.log('FirstTimeLoginHandler: Showing modal for first-time user')
              setShowModal(true)
            }
          } else {
            console.log('FirstTimeLoginHandler: Profile fetch failed:', response.status)
          }
        } else {
          console.log('FirstTimeLoginHandler: No user found in cookies')
        }
      } catch (error) {
        console.error('Error checking first-time login:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Check after a short delay to ensure auth is loaded
    const timer = setTimeout(checkFirstTimeLogin, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  const handleSuccess = () => {
    // This is no longer needed since the modal handles the redirect
    // The modal will logout and redirect to login page
  }

  const handleClose = () => {
    // Allow the modal to close after successful setup
    setShowModal(false)
  }

  // Don't render anything while checking or if no modal needed
  if (isChecking || !showModal) {
    return null
  }

  return (
    <FirstTimeLoginModal
      isOpen={showModal}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  )
}
