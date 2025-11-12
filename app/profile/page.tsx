// app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Cookies from 'js-cookie';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Mail } from 'lucide-react';
import Header from '@/components/shared/header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfileFormData {
  full_name: string;
  email: string;
  username: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showConfirmPasswordModal, setShowConfirmPasswordModal] = useState(false);
  const [showCurrentPasswordModal, setShowCurrentPasswordModal] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    username: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setFormData({
      full_name: currentUser.full_name || '',
      email: currentUser.email || '',
      username: currentUser.username || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setLoading(false);
  }, [router]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    // Validate required fields (excluding full_name as it's read-only)
    if (!formData.email.trim() || !formData.username.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    // If password fields are shown, validate password change
    if (showPasswordFields && formData.new_password) {
      if (formData.new_password.length < 6) {
        toast({
          title: 'Error',
          description: 'New password must be at least 6 characters long',
          variant: 'destructive'
        });
        return;
      }

      // If new password is provided but no confirm password, show modal
      if (!formData.confirm_password) {
        setShowConfirmPasswordModal(true);
        return;
      }

      // Check if passwords match
      if (formData.new_password !== formData.confirm_password) {
        toast({
          title: 'Error',
          description: 'New password and confirm password do not match',
          variant: 'destructive'
        });
        return;
      }
    }

    // If no current password provided for any changes, show modal
    if (!formData.current_password) {
      setShowCurrentPasswordModal(true);
      return;
    }

    // If password fields are shown, validate password change
    if (showPasswordFields && formData.new_password) {
      if (formData.new_password.length < 6) {
        toast({
          title: 'Error',
          description: 'New password must be at least 6 characters long',
          variant: 'destructive'
        });
        return;
      }

      // If new password is provided but no confirm password, show modal
      if (!formData.confirm_password) {
        setShowConfirmPasswordModal(true);
        return;
      }

      // Check if passwords match
      if (formData.new_password !== formData.confirm_password) {
        toast({
          title: 'Error',
          description: 'New password and confirm password do not match',
          variant: 'destructive'
        });
        return;
      }
    }

    setSaving(true);

    try {
      const updateData: any = {
        email: formData.email.trim(),
        username: formData.username.trim(),
        current_password: formData.current_password
      };

      // Add new password if password is being changed
      if (showPasswordFields && formData.new_password) {
        updateData.new_password = formData.new_password;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

             if (data.success) {
         toast({
           title: 'Success',
           description: 'Profile updated successfully'
         });
         
         // Update local user data with the response from API
         if (data.user) {
           setUser((prev: any) => ({
             ...prev,
             email: data.user.email,
             username: data.user.username
           }));

           // Update form data with the new values from API response
           setFormData(prev => ({
             ...prev,
             email: data.user.email,
             username: data.user.username,
             current_password: '',
             new_password: '',
             confirm_password: ''
           }));

           // Update the user cookie to reflect the changes
           const updatedUser = {
             ...user,
             email: data.user.email,
             username: data.user.username
           };
           Cookies.set('bb_user', JSON.stringify(updatedUser), { expires: 1 });
         }
         setShowPasswordFields(false);
         setShowConfirmPasswordModal(false);
         setShowCurrentPasswordModal(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20">
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      disabled
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Enter your full name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Full name cannot be changed
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        full_name: user.full_name || '',
                        email: user.email || '',
                        username: user.username || '',
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      });
                      setShowPasswordFields(false);
                      setShowConfirmPasswordModal(false);
                      setShowCurrentPasswordModal(false);
                    }}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
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
                 setShowCurrentPasswordModal(false);
                 setFormData(prev => ({ ...prev, current_password: '' }));
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
                     variant: 'destructive'
                   });
                   return;
                 }
                 
                 setShowCurrentPasswordModal(false);
                 // Now proceed with the actual save
                 await handleSaveProfile();
               }}
               disabled={saving}
             >
               {saving ? 'Saving...' : 'Confirm & Save'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Confirm Password Modal */}
       <Dialog open={showConfirmPasswordModal} onOpenChange={setShowConfirmPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm New Password</DialogTitle>
            <DialogDescription>
              Please confirm your new password to complete the password change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="modal_confirm_password">Confirm New Password</Label>
              <PasswordInput
                id="modal_confirm_password"
                value={formData.confirm_password}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmPasswordModal(false);
                setFormData(prev => ({ ...prev, confirm_password: '' }));
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!formData.confirm_password) {
                  toast({
                    title: 'Error',
                    description: 'Please enter the confirm password',
                    variant: 'destructive'
                  });
                  return;
                }
                
                if (formData.new_password !== formData.confirm_password) {
                  toast({
                    title: 'Error',
                    description: 'Passwords do not match',
                    variant: 'destructive'
                  });
                  return;
                }
                
                setShowConfirmPasswordModal(false);
                // Now proceed with the actual save
                await handleSaveProfile();
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
