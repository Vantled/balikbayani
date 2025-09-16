// app/user-management/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isSuperadmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Archive, Eye, UserX, Copy, Check } from 'lucide-react';
import Header from '@/components/shared/header';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'staff';
  is_approved: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [revealedFields, setRevealedFields] = useState<{[key: string]: boolean}>({});
  const [formData, setFormData] = useState({
    full_name: '',
    confirm_full_name: '',
    role: 'staff' as 'superadmin' | 'admin' | 'staff'
  });
  const [activatePassword, setActivatePassword] = useState('');
  const [activatePasswordDialogOpen, setActivatePasswordDialogOpen] = useState(false);
  const [userToActivate, setUserToActivate] = useState<string | null>(null);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [tempCredentials, setTempCredentials] = useState({ username: '', password: '' });
  const [passwordConfirmDialogOpen, setPasswordConfirmDialogOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePasswordDialogOpen, setDeactivatePasswordDialogOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Copy to clipboard functionality
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: 'Copied!',
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const copyAllCredentials = async () => {
    try {
      const credentialsText = `Username: ${tempCredentials.username}\nPassword: ${tempCredentials.password}`;
      await navigator.clipboard.writeText(credentialsText);
      setCopiedField('All');
      toast({
        title: 'Copied!',
        description: 'All credentials copied to clipboard',
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy credentials to clipboard',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || !isSuperadmin(user)) {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include' // Include cookies in the request
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validate full name confirmation
    if (formData.full_name !== formData.confirm_full_name) {
      toast({
        title: 'Error',
        description: 'Full name and confirm full name do not match',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Generate shorter temporary username and password
      const tempUsername = `temp${Math.random().toString(36).substring(2, 8)}`;
      const tempPassword = Math.random().toString(36).substring(2, 10);
      
             const userData = {
         full_name: formData.full_name,
         role: formData.role,
         username: tempUsername,
         password: tempPassword,
         email: null, // NULL email for temporary user
         is_first_login: true // Flag to indicate this is a temporary user
       };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        // Set credentials for modal
        setTempCredentials({ username: tempUsername, password: tempPassword });
        setCredentialsModalOpen(true);
        setCreateDialogOpen(false);
        setFormData({
          full_name: '',
          confirm_full_name: '',
          role: 'staff'
        });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create user',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    setPasswordConfirmDialogOpen(true);
  };

  const handleConfirmPasswordUpdate = async () => {
    if (!selectedUser || !confirmPassword) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ 
          role: formData.role,
          current_password: confirmPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User role updated successfully'
        });
        setEditDialogOpen(false);
        setPasswordConfirmDialogOpen(false);
        setSelectedUser(null);
        setConfirmPassword('');
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update user role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive'
      });
    }
  };

  const handleDeactivateUser = (userId: string) => {
    setUserToDeactivate(userId);
    setDeactivatePasswordDialogOpen(true);
  };

  const handleConfirmDeactivateUser = async () => {
    if (!userToDeactivate || !deactivatePassword) return;

    try {
      const response = await fetch(`/api/users/${userToDeactivate}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ current_password: deactivatePassword })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User deactivated successfully'
        });
        setDeactivatePasswordDialogOpen(false);
        setUserToDeactivate(null);
        setDeactivatePassword('');
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to deactivate user',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive'
      });
    }
  };

  const handleActivateUser = async (userId: string) => {
    setUserToActivate(userId);
    setActivatePasswordDialogOpen(true);
  };

  const confirmActivateUser = async () => {
    if (!userToActivate || !activatePassword.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your password to confirm',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/users/${userToActivate}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password: activatePassword })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User activated successfully'
        });
        setActivatePasswordDialogOpen(false);
        setActivatePassword('');
        setUserToActivate(null);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to activate user',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate user',
        variant: 'destructive'
      });
    }
  };

  // Function to anonymize names - show only first 3 letters of each word
  const anonymizeName = (fullName: string) => {
    if (!fullName) return '';
    return fullName.split(' ').map(word => {
      if (word.length <= 3) return word;
      return word.substring(0, 3) + '*'.repeat(word.length - 3);
    }).join(' ');
  };

  // Function to anonymize email - show only first 3 characters of entire email
  const anonymizeEmail = (email: string) => {
    if (!email) return '';
    if (email.length <= 3) return email;
    return email.substring(0, 3) + '*'.repeat(email.length - 3);
  };

  // Function to anonymize username - show only first 3 characters
  const anonymizeUsername = (username: string) => {
    if (!username) return '';
    if (username.length <= 3) return username;
    return username.substring(0, 3) + '*'.repeat(username.length - 3);
  };

  // Helper functions for hover-to-reveal functionality
  const getFieldKey = (userId: string, fieldType: string) => `${userId}-${fieldType}`;

  const handleMouseDown = (userId: string, fieldType: string) => {
    const key = getFieldKey(userId, fieldType);
    setRevealedFields(prev => ({ ...prev, [key]: true }));
  };

  const handleMouseUp = (userId: string, fieldType: string) => {
    const key = getFieldKey(userId, fieldType);
    setRevealedFields(prev => ({ ...prev, [key]: false }));
  };

  const handleMouseLeave = (userId: string, fieldType: string) => {
    const key = getFieldKey(userId, fieldType);
    setRevealedFields(prev => ({ ...prev, [key]: false }));
  };

  const handleContainerMouseLeave = (userId: string, fieldType: string) => {
    // Only hide if the mouse actually left the container, not just moved over the icon
    setTimeout(() => {
      const key = getFieldKey(userId, fieldType);
      setRevealedFields(prev => ({ ...prev, [key]: false }));
    }, 50); // Small delay to prevent immediate hiding
  };

  const isFieldRevealed = (userId: string, fieldType: string) => {
    const key = getFieldKey(userId, fieldType);
    return revealedFields[key] || false;
  };

  const getDisplayValue = (userId: string, fieldType: string, originalValue: string, anonymizedValue: string) => {
    return isFieldRevealed(userId, fieldType) ? originalValue : anonymizedValue;
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      superadmin: 'destructive',
      admin: 'default',
      staff: 'secondary'
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean, isApproved: boolean) => {
    if (!isActive) {
      return <Badge variant="destructive">Deactivated</Badge>;
    }
    if (!isApproved) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  // Avoid blocking overlay; render page with possible empty table while loading

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1976D2]">User Management</h1>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 px-3">
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                                 <DialogHeader>
                   <DialogTitle>Create New User</DialogTitle>
                   <DialogDescription>
                     Create a new user account with temporary credentials. The staff member will configure their own username, email, and password on first login.
                   </DialogDescription>
                 </DialogHeader>
                                 <div className="space-y-4">
                   <div>
                     <Label htmlFor="full_name">Full Name</Label>
                     <Input
                       id="full_name"
                       value={formData.full_name}
                       onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                       placeholder="Enter Full Name"
                     />
                   </div>
                                       <div>
                      <Label htmlFor="confirm_full_name">Confirm Full Name</Label>
                      <Input
                        id="confirm_full_name"
                        value={formData.confirm_full_name}
                        onChange={(e) => setFormData({ ...formData, confirm_full_name: e.target.value })}
                        placeholder="Confirm Full Name"
                      />
                    </div>
                   <div>
                     <Label htmlFor="role">Role</Label>
                     <Select value={formData.role} onValueChange={(value: 'admin' | 'staff') => setFormData({ ...formData, role: value })}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="staff">Staff</SelectItem>
                         <SelectItem value="admin">Admin</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions. Hover over fields and hold the eye icon to reveal anonymized information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1976D2] text-white hover:bg-[#1976D2]">
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Username</TableHead>
                    <TableHead className="text-white">Email</TableHead>
                    <TableHead className="text-white">Role</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Last Login</TableHead>
                    <TableHead className="text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-150 transition-colors duration-75">
                      <TableCell className="font-medium">
                        <div 
                          className="flex items-center space-x-2 group relative w-full"
                          onMouseLeave={() => handleContainerMouseLeave(user.id, 'name')}
                        >
                          <span className="min-w-0 flex-1 truncate pr-6">
                            {getDisplayValue(user.id, 'name', user.full_name, anonymizeName(user.full_name))}
                          </span>
                          <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2"
                            onMouseDown={() => handleMouseDown(user.id, 'name')}
                            onMouseUp={() => handleMouseUp(user.id, 'name')}
                          >
                            <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex items-center space-x-2 group relative w-full"
                          onMouseLeave={() => handleContainerMouseLeave(user.id, 'username')}
                        >
                          <span className="min-w-0 flex-1 truncate pr-6">
                            {getDisplayValue(user.id, 'username', user.username, anonymizeUsername(user.username))}
                          </span>
                          <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2"
                            onMouseDown={() => handleMouseDown(user.id, 'username')}
                            onMouseUp={() => handleMouseUp(user.id, 'username')}
                          >
                            <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex items-center space-x-2 group relative w-full"
                          onMouseLeave={() => handleContainerMouseLeave(user.id, 'email')}
                        >
                          <span className="min-w-0 flex-1 truncate pr-6">
                            {getDisplayValue(user.id, 'email', user.email, anonymizeEmail(user.email))}
                          </span>
                          <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2"
                            onMouseDown={() => handleMouseDown(user.id, 'email')}
                            onMouseUp={() => handleMouseUp(user.id, 'email')}
                          >
                            <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.is_active, user.is_approved)}</TableCell>
                      <TableCell>
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog open={editDialogOpen && selectedUser?.id === user.id} onOpenChange={setEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setFormData({ ...formData, role: user.role });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Role</DialogTitle>
                                <DialogDescription>
                                  Update the role for {anonymizeName(user.full_name)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-role">Role</Label>
                                                                     <Select value={formData.role} onValueChange={(value: 'superadmin' | 'admin' | 'staff') => setFormData({ ...formData, role: value })}>
                                     <SelectTrigger>
                                       <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="staff">Staff</SelectItem>
                                       <SelectItem value="admin">Admin</SelectItem>
                                       <SelectItem value="superadmin">Superadmin</SelectItem>
                                     </SelectContent>
                                   </Select>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateUser}>
                                    Update
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {user.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-gray-150"
                              title="Deactivate User"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateUser(user.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-gray-150"
                              title="Activate User"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

             {/* Password Confirmation Dialog for Activating Users */}
       <Dialog open={activatePasswordDialogOpen} onOpenChange={setActivatePasswordDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirm Password</DialogTitle>
             <DialogDescription>
               Please enter your password to confirm user activation.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label htmlFor="activate-password">Your Password</Label>
               <Input
                 id="activate-password"
                 type="password"
                 value={activatePassword}
                 onChange={(e) => setActivatePassword(e.target.value)}
                 placeholder="Enter your password"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     confirmActivateUser();
                   }
                 }}
               />
             </div>
             <div className="flex justify-end space-x-2">
               <Button 
                 variant="outline" 
                 onClick={() => {
                   setActivatePasswordDialogOpen(false);
                   setActivatePassword('');
                   setUserToActivate(null);
                 }}
               >
                 Cancel
               </Button>
               <Button onClick={confirmActivateUser}>
                 Confirm Activation
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Temporary Credentials Modal */}
       <Dialog open={credentialsModalOpen} onOpenChange={setCredentialsModalOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>User Created Successfully!</DialogTitle>
             <DialogDescription>
               Temporary credentials have been generated. Please copy and share these credentials with the new user.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="bg-gray-50 p-4 rounded-lg">
               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <Label className="text-sm font-medium">Username:</Label>
                   <div className="flex items-center space-x-2">
                     <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                       {tempCredentials.username}
                     </code>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => copyToClipboard(tempCredentials.username, 'Username')}
                       className="h-8 w-8 p-0"
                     >
                       {copiedField === 'Username' ? (
                         <Check className="h-4 w-4 text-green-600" />
                       ) : (
                         <Copy className="h-4 w-4" />
                       )}
                     </Button>
                   </div>
                 </div>
                 <div className="flex items-center justify-between">
                   <Label className="text-sm font-medium">Password:</Label>
                   <div className="flex items-center space-x-2">
                     <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                       {tempCredentials.password}
                     </code>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => copyToClipboard(tempCredentials.password, 'Password')}
                       className="h-8 w-8 p-0"
                     >
                       {copiedField === 'Password' ? (
                         <Check className="h-4 w-4 text-green-600" />
                       ) : (
                         <Copy className="h-4 w-4" />
                       )}
                     </Button>
                   </div>
                 </div>
               </div>
             </div>
             <div className="flex justify-center">
               <Button
                 variant="outline"
                 onClick={copyAllCredentials}
                 className="flex items-center space-x-2"
               >
                 {copiedField === 'All' ? (
                   <Check className="h-4 w-4 text-green-600" />
                 ) : (
                   <Copy className="h-4 w-4" />
                 )}
                 <span>{copiedField === 'All' ? 'Copied!' : 'Copy All Credentials'}</span>
               </Button>
             </div>
             <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
               <p className="text-sm text-blue-800">
                 <strong>Important:</strong> These are temporary credentials. The staff member will be prompted to set up their own username, email, and password on first login.
               </p>
             </div>
             <div className="flex justify-end">
               <Button onClick={() => setCredentialsModalOpen(false)}>
                 Close
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Password Confirmation Dialog for Role Update */}
       <Dialog open={passwordConfirmDialogOpen} onOpenChange={setPasswordConfirmDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirm Password</DialogTitle>
             <DialogDescription>
               Please enter your current password to confirm the role change for {selectedUser ? anonymizeName(selectedUser.full_name) : 'this user'}.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label htmlFor="confirm-password">Current Password</Label>
               <Input
                 id="confirm-password"
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="Enter your current password"
                 className="mt-1"
               />
             </div>
             <div className="flex justify-end space-x-2">
               <Button 
                 variant="outline" 
                 onClick={() => {
                   setPasswordConfirmDialogOpen(false);
                   setConfirmPassword('');
                 }}
               >
                 Cancel
               </Button>
               <Button 
                 onClick={handleConfirmPasswordUpdate}
                 disabled={!confirmPassword}
               >
                 Confirm Update
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Password Confirmation Dialog for User Deactivation */}
       <Dialog open={deactivatePasswordDialogOpen} onOpenChange={setDeactivatePasswordDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirm User Deactivation</DialogTitle>
             <DialogDescription>
               Please enter your current password to confirm deactivating this user. This action can be reversed later.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label htmlFor="deactivate-password">Current Password</Label>
               <Input
                 id="deactivate-password"
                 type="password"
                 value={deactivatePassword}
                 onChange={(e) => setDeactivatePassword(e.target.value)}
                 placeholder="Enter your current password"
                 className="mt-1"
               />
             </div>
             <div className="flex justify-end space-x-2">
               <Button 
                 variant="outline" 
                 onClick={() => {
                   setDeactivatePasswordDialogOpen(false);
                   setUserToDeactivate(null);
                   setDeactivatePassword('');
                 }}
               >
                 Cancel
               </Button>
               <Button 
                 onClick={handleConfirmDeactivateUser}
                 disabled={!deactivatePassword}
                 variant="destructive"
               >
                 Confirm Deactivation
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
