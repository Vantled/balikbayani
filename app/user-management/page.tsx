// app/user-management/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isSuperadmin, isAdmin, canManagePermissions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Eye, UserX, Copy, Check, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import Header from '@/components/shared/header';
import type { UserRole } from '@/lib/types';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  is_approved: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  permissions?: UserPermission[];
}

interface UserPermission {
  id: string;
  permission_key: string;
  granted: boolean;
  granted_by?: string;
  granted_at: string;
}

type StaffRole = Extract<UserRole, 'superadmin' | 'admin' | 'staff'>;

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
    role: 'staff' as StaffRole
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
  const [userPermissions, setUserPermissions] = useState<{[key: string]: boolean}>({});
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<{[key: string]: boolean}>({});
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessNote, setAccessNote] = useState<string>("");
  const [roleClickCounts, setRoleClickCounts] = useState<{[userId: string]: number}>({});
  const [statusClickCounts, setStatusClickCounts] = useState<{[userId: string]: number}>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [search, setSearch] = useState<string>("");
  const [roleFilterValues, setRoleFilterValues] = useState<string[]>([]); // [] means All
  const [statusFilterValues, setStatusFilterValues] = useState<string[]>([]); // [] means All
  const [roleDraft, setRoleDraft] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState<string[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showSuperadminOption, setShowSuperadminOption] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isRoleSelectFocused, setIsRoleSelectFocused] = useState(false);
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

  // Generate memorable temporary credentials connected to the provided full name.
  const generateTempCredentials = (fullName: string) => {
    const cleanedName = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, '')
      .replace(/\s+/g, ' ');

    const parts = cleanedName.length ? cleanedName.split(' ').filter(Boolean) : [];
    const fallback = 'user';
    const first = parts[0] || fallback;
    const last = parts.length > 1 ? parts[parts.length - 1] : '';

    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 12);

    const baseUsername = [slugify(first), slugify(last).slice(0, 1)]
      .filter(Boolean)
      .join('.');
    const usernameSuffix = Math.floor(10 + Math.random() * 90); // two-digit suffix
    const username = `${baseUsername || fallback}.${usernameSuffix}`.replace(/\.+$/, '');

    const capitalize = (value: string) =>
      value.length ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
    const readableFirst = capitalize(parts[0] || 'Temp');
    const readableLastInitial = capitalize(last).charAt(0);
    const passwordDigits = Math.floor(1000 + Math.random() * 9000);
    const password = `${readableFirst}${readableLastInitial}${passwordDigits}!`;

    return {
      username: username.toLowerCase(),
      password,
    };
  };

  useEffect(() => {
    setMounted(true);
    const user = getUser();
    setCurrentUser(user);
    if (user) {
      if (isSuperadmin(user)) setAccessNote('Full access - Manage users, roles, and permissions');
      else if (isAdmin(user)) setAccessNote('Limited access - Manage user permissions only');
    }
    if (!user || !canManagePermissions(user)) {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [router]);

  // Track typing "superadmin" when create dialog is open and role select is focused
  useEffect(() => {
    if (!createDialogOpen || !mounted || !currentUser || !isSuperadmin(currentUser) || !isRoleSelectFocused) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Track typed characters (only letters)
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const newTypedText = (typedText + e.key).toLowerCase();
        setTypedText(newTypedText);
        
        // Check if "superadmin" has been typed
        if (newTypedText.includes('superadmin')) {
          setShowSuperadminOption(true);
          setTypedText('');
        }
      } else if (e.key === 'Backspace') {
        setTypedText(prev => prev.slice(0, -1));
        setShowSuperadminOption(false);
      } else if (e.key === 'Escape') {
        setTypedText('');
        setShowSuperadminOption(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [createDialogOpen, typedText, isRoleSelectFocused, mounted, currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/permissions', {
        credentials: 'include' // Include cookies in the request
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setAvailablePermissions(data.data.availablePermissions);
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
      // Generate memorable temporary credentials derived from the user's name
      const { username: tempUsername, password: tempPassword } = generateTempCredentials(formData.full_name);

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
        setTypedText('');
        setShowSuperadminOption(false);
        setIsRoleSelectFocused(false);
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

  // Initialize permission state when opening edit dialog
  const initPermissionsForUser = (user: User) => {
    const permissionsMap: {[key: string]: boolean} = {};
    getVisiblePermissionsForUser(user).forEach(permission => {
      const userPermission = user.permissions?.find(p => p.permission_key === permission);
      permissionsMap[permission] = userPermission ? userPermission.granted : true;
    });
    setUserPermissions(permissionsMap);
    setOriginalPermissions(permissionsMap);
    setOriginalRole(user.role);
  };

  const handlePermissionChange = (permissionKey: string, granted: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [permissionKey]: granted
    }));
  };

  const handleSavePermissions = async (targetUserId?: string) => {
    const targetId = targetUserId || selectedUser?.id;
    if (!targetId) return;

    try {
      // Only persist permissions that are valid/visible for the target user
      const targetUser = selectedUser || users.find(u => u.id === targetId) || null;
      const allowedKeys = targetUser ? getVisiblePermissionsForUser(targetUser) : availablePermissions;
      const permissions = Object.entries(userPermissions)
        .filter(([permission_key]) => allowedKeys.includes(permission_key))
        .map(([permission_key, granted]) => ({ permission_key, granted }));

      const response = await fetch('/api/users/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: targetId,
          permissions
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Permissions updated successfully'
        });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update permissions',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: 'destructive'
      });
    }
  };

  const havePermissionsChanged = (user: User): boolean => {
    // Admin and Superadmin have full access; we do not persist granular permissions for them
    if (formData.role === 'admin' || formData.role === 'superadmin') return false;
    const keys = getVisiblePermissionsForUser(user);
    for (const key of keys) {
      if (userPermissions[key] !== originalPermissions[key]) return true;
    }
    return false;
  };

  const hasRoleChanged = (): boolean => {
    if (originalRole == null) return false;
    return originalRole !== formData.role;
  };

  const handleSaveChanges = (user: User) => {
    const changedRole = hasRoleChanged();
    const changedPerms = havePermissionsChanged(user);
    if (!changedRole && !changedPerms) {
      toast({ title: 'No changes', description: 'Nothing to save.' });
      return;
    }
    // Reuse existing password confirm dialog and handler
    setSelectedUser(user);
    setPasswordConfirmDialogOpen(true);
  };

  const applyChanges = async () => {
    if (!selectedUser) return;
    const user = selectedUser;
    const changedRole = hasRoleChanged();
    const changedPerms = havePermissionsChanged(user);

    try {
      // Save role if changed
      if (changedRole) {
        const resp = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: formData.role, current_password: confirmPassword })
        });
        const data = await resp.json();
        if (!data.success) {
          toast({ title: 'Error', description: data.error || 'Failed to update role', variant: 'destructive' });
          return; // stop on role failure
        }
      }

      // Save permissions if changed
      if (changedPerms) {
        // Build list based on visible keys
        const allowedKeys = getVisiblePermissionsForUser(user);
        const permissions = Object.entries(userPermissions)
          .filter(([k]) => allowedKeys.includes(k))
          .map(([permission_key, granted]) => ({ permission_key, granted }));
        const resp2 = await fetch('/api/users/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ user_id: user.id, permissions, current_password: confirmPassword })
        });
        const data2 = await resp2.json();
        if (!data2.success) {
          toast({ title: 'Error', description: data2.error || 'Failed to update permissions', variant: 'destructive' });
          return;
        }
      }

      toast({ title: 'Success', description: 'Changes saved successfully.' });
      setEditDialogOpen(false);
      setPasswordConfirmDialogOpen(false);
      setConfirmPassword('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    }
  };

  // Compute which permissions should be shown for the target user
  const getVisiblePermissionsForUser = (user: User): string[] => {
    // Applicants don't have permissions
    if (user.role === 'applicant') {
      return [];
    }
    // Hide Data Backups for all non-superadmin users
    if (user.role !== 'superadmin') {
      return availablePermissions.filter((p) => p !== 'data_backups');
    }
    return availablePermissions;
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

  const getPermissionDisplayName = (permissionKey: string): string => {
    const displayNames: {[key: string]: string} = {
      'direct_hire': 'Direct Hire',
      'balik_manggagawa': 'Balik Manggagawa',
      'gov_to_gov': 'Government to Government',
      'information_sheet': 'Information Sheet',
      'monitoring': 'Monitoring List',
      'data_backups': 'Data Backups'
    };
    return displayNames[permissionKey] || permissionKey;
  };

  const getPermissionAbbrev = (permissionKey: string): string => {
    const abbrev: {[key: string]: string} = {
      'direct_hire': 'DH',
      'balik_manggagawa': 'BM',
      'gov_to_gov': 'G2G',
      'information_sheet': 'INF',
      'monitoring': 'MON',
      'data_backups': 'DB'
    };
    return abbrev[permissionKey] || permissionKey.toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      superadmin: 'destructive',
      admin: 'default',
      staff: 'secondary',
      applicant: 'outline'
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean, isApproved: boolean) => {
    if (!isActive) {
      return <Badge className="bg-gray-200 text-gray-700">Deactivated</Badge>;
    }
    if (!isApproved) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  };

  // Hidden delete trigger logic: require 5 role clicks AND 5 status clicks
  const handleRoleCellClick = (user: User) => {
    setRoleClickCounts(prev => {
      const next = { ...prev, [user.id]: (prev[user.id] || 0) + 1 };
      maybeOpenDelete(user, next[user.id], statusClickCounts[user.id] || 0);
      return next;
    });
  };

  const handleStatusCellClick = (user: User) => {
    setStatusClickCounts(prev => {
      const next = { ...prev, [user.id]: (prev[user.id] || 0) + 1 };
      maybeOpenDelete(user, roleClickCounts[user.id] || 0, next[user.id]);
      return next;
    });
  };

  const maybeOpenDelete = (user: User, roleClicks: number, statusClicks: number) => {
    if (!currentUser || !isSuperadmin(currentUser)) return;
    // Don't allow deleting applicant accounts
    if (user.role === 'applicant') return;
    if (roleClicks >= 5 && statusClicks >= 5) {
      setUserToDelete(user);
      setDeleteDialogOpen(true);
      // reset counters for that user to avoid accidental repeats
      setRoleClickCounts(prev => ({ ...prev, [user.id]: 0 }));
      setStatusClickCounts(prev => ({ ...prev, [user.id]: 0 }));
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast({ title: 'Type DELETE to confirm', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'User deleted', description: `${anonymizeName(userToDelete.full_name)} has been removed.` });
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        setDeleteConfirmText('');
        fetchUsers();
      } else {
        toast({ title: 'Delete failed', description: data.error || 'Unable to delete user', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' });
    }
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
              {mounted && accessNote && (
                <p className="text-sm text-gray-600 mt-1">{accessNote}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Search with filter - placed beside Create button (to its left) */}
              <div className="relative w-[260px]">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, username or email"
                  className="pr-10"
                />
                <DropdownMenu open={filterMenuOpen} onOpenChange={(open)=>{
                  setFilterMenuOpen(open);
                  if (open) {
                    setRoleDraft(roleFilterValues);
                    setStatusDraft(statusFilterValues);
                  }
                }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      aria-label="Filter users"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-0">
                    <div className="p-3 w-64 space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600">Role</Label>
                        <div className="mt-1 border rounded p-1">
                          <DropdownMenuCheckboxItem
                            checked={roleDraft.length === 0}
                            onCheckedChange={(v)=>{
                              if (v) {
                                setRoleDraft([]); // All - clears everything else
                              }
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >All</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={roleDraft.includes('admin')}
                            onCheckedChange={(v)=>{
                              setRoleDraft(prev=>{
                                const set = new Set(prev.length === 0 ? [] : prev); // If "All" was selected, start fresh
                                if (v) set.add('admin'); else set.delete('admin');
                                return Array.from(set);
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >Admin</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={roleDraft.includes('staff')}
                            onCheckedChange={(v)=>{
                              setRoleDraft(prev=>{
                                const set = new Set(prev.length === 0 ? [] : prev); // If "All" was selected, start fresh
                                if (v) set.add('staff'); else set.delete('staff');
                                return Array.from(set);
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >Staff</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={roleDraft.includes('applicant')}
                            onCheckedChange={(v)=>{
                              setRoleDraft(prev=>{
                                const set = new Set(prev.length === 0 ? [] : prev); // If "All" was selected, start fresh
                                if (v) set.add('applicant'); else set.delete('applicant');
                                return Array.from(set);
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >Applicant</DropdownMenuCheckboxItem>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Status</Label>
                        <div className="mt-1 border rounded p-1">
                          <DropdownMenuCheckboxItem
                            checked={statusDraft.length === 0}
                            onCheckedChange={(v)=>{ 
                              if (v) {
                                setStatusDraft([]); // All - clears everything else
                              }
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >All</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={statusDraft.includes('active')}
                            onCheckedChange={(v)=>{
                              setStatusDraft(prev=>{
                                const set = new Set(prev.length === 0 ? [] : prev); // If "All" was selected, start fresh
                                if (v) set.add('active'); else set.delete('active');
                                return Array.from(set);
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >Active</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={statusDraft.includes('deactivated')}
                            onCheckedChange={(v)=>{
                              setStatusDraft(prev=>{
                                const set = new Set(prev.length === 0 ? [] : prev); // If "All" was selected, start fresh
                                if (v) set.add('deactivated'); else set.delete('deactivated');
                                return Array.from(set);
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >Deactivated</DropdownMenuCheckboxItem>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1 h-8" onClick={() => { setRoleDraft([]); setStatusDraft([]); }}>Clear</Button>
                        <Button className="flex-1 h-8" onClick={() => { setRoleFilterValues(roleDraft); setStatusFilterValues(statusDraft); setFilterMenuOpen(false); }}>Apply</Button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {mounted && currentUser && isSuperadmin(currentUser) && (
                <Dialog 
                  open={createDialogOpen} 
                  onOpenChange={(open) => {
                    setCreateDialogOpen(open);
                    if (!open) {
                      setTypedText('');
                      setShowSuperadminOption(false);
                      setIsRoleSelectFocused(false);
                      setFormData({
                        full_name: '',
                        confirm_full_name: '',
                        role: 'staff'
                      });
                    }
                  }}
                >
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
                        <Select 
                          value={formData.role} 
                          onValueChange={(value: StaffRole) => {
                            setFormData({ ...formData, role: value });
                            setTypedText('');
                            // Keep superadmin option visible if superadmin is selected
                            if (value !== 'superadmin') {
                              setShowSuperadminOption(false);
                            }
                            setIsRoleSelectFocused(false);
                          }}
                          onOpenChange={(open) => {
                            setIsRoleSelectFocused(open);
                            if (!open) {
                              // Don't hide superadmin option if it's already selected
                              if (formData.role !== 'superadmin') {
                                setTypedText('');
                                setShowSuperadminOption(false);
                              }
                            }
                          }}
                        >
                          <SelectTrigger
                            onFocus={() => setIsRoleSelectFocused(true)}
                            onBlur={() => {
                              // Delay to allow select menu to open
                              setTimeout(() => setIsRoleSelectFocused(false), 100);
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {(showSuperadminOption || formData.role === 'superadmin') && (
                              <SelectItem value="superadmin">Superadmin</SelectItem>
                            )}
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
              )}
            </div>
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
                  {users
                    .filter((u) => {
                      // Filter superadmin accounts if current user is not superadmin
                      if (mounted && currentUser && !isSuperadmin(currentUser) && u.role === 'superadmin') {
                        return false;
                      }
                      return true;
                    })
                    .filter((u) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        u.full_name.toLowerCase().includes(q) ||
                        u.username.toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    })
                    .filter((u) => {
                      if (roleFilterValues.length === 0) return true;
                      return roleFilterValues.includes(u.role);
                    })
                    .filter((u) => {
                      if (statusFilterValues.length === 0) return true;
                      const isActive = u.is_active && u.is_approved;
                      const isDeactivated = !u.is_active;
                      return (
                        (statusFilterValues.includes('active') && isActive) ||
                        (statusFilterValues.includes('deactivated') && isDeactivated)
                      );
                    })
                    .map((user) => (
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
                      <TableCell onClick={() => handleRoleCellClick(user)} className="cursor-default select-none">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell onClick={() => handleStatusCellClick(user)} className="cursor-default select-none">
                        {getStatusBadge(user.is_active, user.is_approved)}
                      </TableCell>
                      <TableCell>
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Only show Edit button for active users, but not for applicants */}
                          {mounted && currentUser && (isAdmin(currentUser) || isSuperadmin(currentUser)) && user.is_active && user.role !== 'applicant' && (
                                <Dialog open={editDialogOpen && selectedUser?.id === user.id} onOpenChange={setEditDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        // For applicants, default to 'staff' in the form (they can change to staff/admin/superadmin)
                                        // For other roles, use their current role
                                        const defaultRole = user.role === 'applicant' ? 'staff' : (user.role as StaffRole);
                                        setFormData({ ...formData, role: defaultRole });
                                        initPermissionsForUser(user);
                                      }}
                                      title="Edit User"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit User</DialogTitle>
                                      <DialogDescription>
                                        Update settings for {anonymizeName(user.full_name)}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {(() => {
                                        if (isSuperadmin(currentUser)) {
                                          return (
                                            <div>
                                              <Label htmlFor="edit-role">Role</Label>
                                              <Select value={formData.role} onValueChange={(value: StaffRole) => setFormData({ ...formData, role: value })}>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="staff">Staff</SelectItem>
                                                  <SelectItem value="admin">Admin</SelectItem>
                                                  <SelectItem value="superadmin">Superadmin</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              {user.role === 'applicant' && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  Current role: Applicant. You can change this to Staff, Admin, or Superadmin.
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                                      {user.role !== 'applicant' && (
                                        <div>
                                          <Label>Page Permissions</Label>
                                          <div className="mt-2">
                                                <DropdownMenu>
                                              <div className="flex items-center gap-2 w-full">
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="outline" className="flex-1 overflow-hidden">
                                                    {(() => {
                                                      const visible = getVisiblePermissionsForUser(user)
                                                      const selectedKeys = visible.filter((p) => userPermissions[p])
                                                          const selectedLabelsFull = selectedKeys.map((p) => getPermissionDisplayName(p))
                                                          const selectedLabelsAbbrev = selectedKeys.map((p) => getPermissionAbbrev(p))
                                                          const maxToShow = 5
                                                      let label = 'Select pages'
                                                          if (selectedLabelsAbbrev.length > 0) {
                                                            const shown = selectedLabelsAbbrev.slice(0, maxToShow)
                                                            const remaining = selectedLabelsAbbrev.length - shown.length
                                                        label = remaining > 0 ? `${shown.join(', ')} and ${remaining} more` : shown.join(', ')
                                                      }
                                                      return (
                                                            <span title={selectedLabelsFull.join(', ')} className="block overflow-hidden text-ellipsis whitespace-nowrap text-left flex-1 pr-2 min-w-0">{label}</span>
                                                      )
                                                    })()}
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                {(() => {
                                                  const visible = getVisiblePermissionsForUser(user)
                                                  const selectedCount = visible.filter((p) => userPermissions[p]).length
                                                  return (
                                                    <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{selectedCount}/{visible.length} selected</span>
                                                  )
                                                })()}
                                              </div>
                                              <DropdownMenuContent className="w-64">
                                                {getVisiblePermissionsForUser(user).map((permission) => (
                                                  <DropdownMenuCheckboxItem
                                                    key={permission}
                                                    checked={!!userPermissions[permission]}
                                                    disabled={formData.role !== 'staff'}
                                                    // Keep menu open when toggling multiple items
                                                    onSelect={(e) => e.preventDefault()}
                                                    onCheckedChange={(v) => handlePermissionChange(permission, Boolean(v))}
                                                  >
                                                    {getPermissionDisplayName(permission)}
                                                  </DropdownMenuCheckboxItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                          {formData.role !== 'staff' && (
                                            <p className="text-xs text-gray-500 mt-2">Admins and Superadmins have full access by default. Page permissions are only configurable for Staff.</p>
                                          )}
                                        </div>
                                      )}
                                      {user.role === 'applicant' && (
                                        <div>
                                          <Label>Page Permissions</Label>
                                          <p className="text-sm text-muted-foreground mt-2">Applicants do not have page permissions.</p>
                                        </div>
                                      )}

                                      <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                          Close
                                        </Button>
                                        <Button onClick={() => handleSaveChanges(user)}>
                                          Save Changes
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                          )}
                          
                          {/* User Activation/Deactivation - Only for superadmin */}
                          {(() => {
                            const currentUser = getUser();
                            if (isSuperadmin(currentUser)) {
                              return user.is_active ? (
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
                              );
                            }
                            return null;
                          })()}
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
               <PasswordInput
                 id="activate-password"
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

      {/* Hidden Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete {userToDelete ? anonymizeName(userToDelete.full_name) : 'this user'}. Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(''); setUserToDelete(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog for Save Changes */}
      <Dialog open={passwordConfirmDialogOpen} onOpenChange={setPasswordConfirmDialogOpen}>
         <DialogContent>
           <DialogHeader>
            <DialogTitle>Confirm Save Changes</DialogTitle>
             <DialogDescription>
              Please enter your current password to confirm saving changes for {selectedUser ? anonymizeName(selectedUser.full_name) : 'this user'}.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label htmlFor="confirm-password">Current Password</Label>
               <PasswordInput
                 id="confirm-password"
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
                onClick={applyChanges}
                 disabled={!confirmPassword}
               >
                Confirm Save
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
               <PasswordInput
                 id="deactivate-password"
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
