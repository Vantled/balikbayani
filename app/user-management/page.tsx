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
import { Plus, Edit, Archive, Eye, UserX } from 'lucide-react';
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
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as 'superadmin' | 'admin' | 'staff'
  });
  const { toast } = useToast();
  const router = useRouter();

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
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User created successfully'
        });
        setCreateDialogOpen(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          full_name: '',
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

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ role: formData.role })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User updated successfully'
        });
        setEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update user',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive'
      });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? This action can be reversed later.')) return;

    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'PUT',
        credentials: 'include' // Include cookies in the request
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User deactivated successfully'
        });
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
    try {
      const response = await fetch(`/api/users/${userId}/activate`, {
        method: 'PUT',
        credentials: 'include' // Include cookies in the request
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'User activated successfully'
        });
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage system users and their roles with data integrity</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with appropriate role and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
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
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
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
                                    Update Role
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
                              className="text-orange-600 hover:text-orange-700"
                              title="Deactivate User"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateUser(user.id)}
                              className="text-green-600 hover:text-green-700"
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
    </div>
  );
}
