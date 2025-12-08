// app/applicant/profile/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { User, Lock } from 'lucide-react'
import ApplicantHeader from '@/components/applicant-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ProfileFormData {
  first_name: string
  middle_name: string
  last_name: string
  email: string
  username: string
  current_password: string
  new_password: string
}

export default function ApplicantProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showCurrentPasswordModal, setShowCurrentPasswordModal] = useState(false)
  const [originalData, setOriginalData] = useState<{ first_name: string; middle_name: string; last_name: string; email: string; username: string }>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    username: '',
  })
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    username: '',
    current_password: '',
    new_password: '',
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    if (currentUser.role !== 'applicant') {
      router.push('/dashboard')
      return
    }
    setUser(currentUser)
    const initialData = {
      first_name: (currentUser.first_name || '').trim(),
      middle_name: (currentUser.middle_name || '').trim(),
      last_name: (currentUser.last_name || '').trim(),
      email: currentUser.email || '',
      username: currentUser.username || '',
      current_password: '',
      new_password: '',
    }
    setFormData(initialData)
    setOriginalData({
      first_name: (currentUser.first_name || '').trim(),
      middle_name: (currentUser.middle_name || '').trim(),
      last_name: (currentUser.last_name || '').trim(),
      email: currentUser.email || '',
      username: currentUser.username || '',
    })
    setLoading(false)
  }, [router])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || !formData.username.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (First name, Last name, Email, and Username)',
        variant: 'destructive',
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    // If password fields are shown, validate password change
    if (showPasswordFields && formData.new_password) {
      if (formData.new_password.length < 6) {
        toast({
          title: 'Error',
          description: 'New password must be at least 6 characters long',
          variant: 'destructive',
        })
        return
      }
    }

    // If no current password provided for any changes, show modal
    if (!formData.current_password) {
      setShowCurrentPasswordModal(true)
      return
    }

    setSaving(true)

    try {
      const updateData: any = {
        first_name: formData.first_name.trim().toUpperCase(),
        middle_name: formData.middle_name.trim() ? formData.middle_name.trim().toUpperCase() : null,
        last_name: formData.last_name.trim().toUpperCase(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        current_password: formData.current_password,
      }

      // Add new password if password is being changed
      if (showPasswordFields && formData.new_password) {
        updateData.new_password = formData.new_password
      }

      const response = await fetch('/api/applicant/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        })

        // Update local user data with the response from API
        if (data.data?.user) {
          setUser((prev: any) => ({
            ...prev,
            first_name: data.data.user.first_name || '',
            middle_name: data.data.user.middle_name || '',
            last_name: data.data.user.last_name || '',
            full_name: data.data.user.full_name || '',
            email: data.data.user.email,
            username: data.data.user.username,
          }))

          // Update form data with the new values from API response
          setFormData(prev => ({
            ...prev,
            first_name: (data.data.user.first_name || '').trim(),
            middle_name: (data.data.user.middle_name || '').trim(),
            last_name: (data.data.user.last_name || '').trim(),
            email: data.data.user.email,
            username: data.data.user.username,
            current_password: '',
            new_password: '',
          }))

          // Update original data to reflect saved state
          setOriginalData({
            first_name: (data.data.user.first_name || '').trim(),
            middle_name: (data.data.user.middle_name || '').trim(),
            last_name: (data.data.user.last_name || '').trim(),
            email: data.data.user.email,
            username: data.data.user.username,
          })

          // Update the user cookie to reflect the changes
          const updatedUser = {
            ...user,
            first_name: data.data.user.first_name || '',
            middle_name: data.data.user.middle_name || '',
            last_name: data.data.user.last_name || '',
            full_name: data.data.user.full_name || '',
            email: data.data.user.email,
            username: data.data.user.username,
          }
          Cookies.set('bb_user', JSON.stringify(updatedUser), { expires: 1 })
        }
        setShowPasswordFields(false)
        setShowCurrentPasswordModal(false)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    const firstNameChanged = formData.first_name.trim() !== originalData.first_name
    const middleNameChanged = formData.middle_name.trim() !== originalData.middle_name
    const lastNameChanged = formData.last_name.trim() !== originalData.last_name
    const emailChanged = formData.email.trim() !== originalData.email
    const usernameChanged = formData.username.trim() !== originalData.username
    const passwordChanged = showPasswordFields && formData.new_password.trim() !== ''
    return firstNameChanged || middleNameChanged || lastNameChanged || emailChanged || usernameChanged || passwordChanged
  }, [formData.first_name, formData.middle_name, formData.last_name, formData.email, formData.username, formData.new_password, originalData, showPasswordFields])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ApplicantHeader />
        <div className="pt-20">
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ApplicantHeader />
      <div className="pt-20">
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account information and security</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value.toUpperCase())}
                      placeholder="JUAN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={formData.middle_name}
                      onChange={(e) => handleInputChange('middle_name', e.target.value.toUpperCase())}
                      placeholder="REYES"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value.toUpperCase())}
                      placeholder="DELA CRUZ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>


                <div className="pt-4 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Security Verification
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You will be prompted to enter your current password when saving changes
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-md font-semibold flex items-center gap-2">
                          Change Password
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Update your password for enhanced security
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                      >
                        {showPasswordFields ? 'Cancel' : 'Change Password'}
                      </Button>
                    </div>

                    {showPasswordFields && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="current_password_change">Current Password</Label>
                            <PasswordInput
                              id="current_password_change"
                              value={formData.current_password}
                              onChange={(e) => handleInputChange('current_password', e.target.value)}
                              placeholder="Enter your current password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new_password">New Password</Label>
                            <PasswordInput
                              id="new_password"
                              value={formData.new_password}
                              onChange={(e) => handleInputChange('new_password', e.target.value)}
                              placeholder="Enter new password (min 6 characters)"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {hasChanges && (
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          first_name: (user.first_name || '').trim(),
                          middle_name: (user.middle_name || '').trim(),
                          last_name: (user.last_name || '').trim(),
                          email: user.email || '',
                          username: user.username || '',
                          current_password: '',
                          new_password: '',
                        })
                        setShowPasswordFields(false)
                        setShowCurrentPasswordModal(false)
                        setOriginalData({
                          first_name: (user.first_name || '').trim(),
                          middle_name: (user.middle_name || '').trim(),
                          last_name: (user.last_name || '').trim(),
                          email: user.email || '',
                          username: user.username || '',
                        })
                      }}
                    >
                      Reset
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Current Password Modal */}
      <Dialog open={showCurrentPasswordModal} onOpenChange={setShowCurrentPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Please enter your current password to confirm the changes to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="modal_current_password">Current Password</Label>
              <PasswordInput
                id="modal_current_password"
                value={formData.current_password}
                onChange={(e) => handleInputChange('current_password', e.target.value)}
                placeholder="Enter your current password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCurrentPasswordModal(false)
                setFormData(prev => ({ ...prev, current_password: '' }))
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!formData.current_password) {
                  toast({
                    title: 'Error',
                    description: 'Please enter your current password',
                    variant: 'destructive',
                  })
                  return
                }

                setShowCurrentPasswordModal(false)
                await handleSaveProfile()
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
