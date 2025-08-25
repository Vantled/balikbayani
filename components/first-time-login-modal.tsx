// components/first-time-login-modal.tsx
"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getUser, logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface FirstTimeLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function FirstTimeLoginModal({ isOpen, onClose, onSuccess }: FirstTimeLoginModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      // Get current user info to pre-fill some fields
      const currentUser = getUser()
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          // Don't pre-fill email as it might be NULL for temporary users
        }))
      }
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.new_password) {
      newErrors.new_password = 'Password is required'
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters'
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      console.log('First-time setup: Sending request with data:', {
        username: formData.username,
        email: formData.email,
        new_password: '***' // Don't log password
      })
      
      const response = await fetch('/api/users/first-time-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          new_password: formData.new_password
        })
      })
      
      console.log('First-time setup: Response status:', response.status)

      const data = await response.json()

                     if (data.success) {
          toast({
            title: 'Success',
            description: 'Your account has been configured successfully. You will be redirected to login with your new credentials.'
          })
          
          // Clear form
          setFormData({
            username: '',
            email: '',
            new_password: '',
            confirm_password: ''
          })
          setErrors({})
          
          // Close the modal first
          onClose()
          
          // Wait a moment for the modal to close, then logout and redirect
          setTimeout(async () => {
            try {
              await logout()
              router.push('/login')
            } catch (error) {
              console.error('Error during logout/redirect:', error)
              // Force redirect even if logout fails
              router.push('/login')
            }
          }, 200)
       } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to configure account',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error configuring account:', error)
      toast({
        title: 'Error',
        description: 'Failed to configure account',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Prevent closing the modal during loading
    if (loading) {
      return
    }
    // Allow closing after successful setup
    onClose()
  }

    if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      />
      
      {/* Modal content */}
      <div className="relative z-[10000] max-w-md w-full mx-4 bg-white border-2 shadow-2xl rounded-lg p-6">
                 <div className="text-center mb-6">
           <h2 className="text-xl font-bold text-center">Welcome to BalikBayani Portal!</h2>
           <p className="text-center mt-2 text-gray-600">
             Please configure your account with your preferred username, email, and password. This will replace your temporary credentials.
           </p>
         </div>
         <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Choose a username"
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-500 mt-1">{errors.username}</p>
            )}
          </div>

                     <div>
             <Label htmlFor="email">Email</Label>
             <Input
               id="email"
               type="email"
               value={formData.email}
               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
               placeholder="Enter your email"
               className={errors.email ? 'border-red-500' : ''}
             />
             {errors.email && (
               <p className="text-sm text-red-500 mt-1">{errors.email}</p>
             )}
           </div>

          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              placeholder="Choose a new password"
              className={errors.new_password ? 'border-red-500' : ''}
            />
            {errors.new_password && (
              <p className="text-sm text-red-500 mt-1">{errors.new_password}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              placeholder="Confirm your new password"
              className={errors.confirm_password ? 'border-red-500' : ''}
            />
            {errors.confirm_password && (
              <p className="text-sm text-red-500 mt-1">{errors.confirm_password}</p>
            )}
          </div>

                     <div className="flex justify-center pt-4">
             <Button type="submit" disabled={loading} className="w-full">
               {loading ? 'Configuring...' : 'Complete Setup'}
             </Button>
                                                                                               </div>
                    </form>
        </div>
      </div>
    )
  }
