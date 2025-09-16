"use client"

import { useState, useEffect } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Download, Plus, MoreHorizontal, Edit, Trash2, X, FileText, Loader2, RefreshCcw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTableLastModified } from "@/hooks/use-table-last-modified"
import { usePraContacts } from "@/hooks/use-pra-contacts"
import { PraContact } from "@/lib/types"
import { getUser, isSuperadmin } from "@/lib/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const CONTACT_CATEGORIES = [
  "Landline",
  "Mobile No.",
  "Others"
]

export default function PraContactsPage() {
  const { toast } = useToast()
  const { contacts, loading, error, pagination, createContact, updateContact, deleteContact, searchContacts, fetchContacts } = usePraContacts()
  
  // Get last modified time for pra_contacts table
  const { lastModified: praLastModified } = useTableLastModified({ tableName: 'pra_contacts' })
  
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMounted, setModalMounted] = useState(false)
  const [editingContact, setEditingContact] = useState<PraContact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<PraContact | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [showDeletedOnly, setShowDeletedOnly] = useState(false)
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmingPassword, setConfirmingPassword] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userIsSuperadmin, setUserIsSuperadmin] = useState(false)
  const [restorePasswordOpen, setRestorePasswordOpen] = useState(false)
  const [restorePassword, setRestorePassword] = useState("")
  const [confirmingRestorePassword, setConfirmingRestorePassword] = useState(false)
  const [contactToRestore, setContactToRestore] = useState<PraContact | null>(null)
  
  const [formData, setFormData] = useState({
    name_of_pras: "",
    pra_contact_person: "",
    office_head: ""
  })

  // Multiple email and contact fields
  const [emails, setEmails] = useState<string[]>([""])
  const [formContacts, setFormContacts] = useState<string[]>([""])
  const [customCategories, setCustomCategories] = useState<string[]>([""])

  // Resolve superadmin on client after mount to keep SSR markup stable
  useEffect(() => {
    let mounted = true
    import('@/lib/auth').then(mod => {
      const u = mod.getUser()
      const isSuper = mod.isSuperadmin(u)
      if (mounted) {
        setUserIsSuperadmin(isSuper)
        setCurrentUser(u)
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search.trim()) {
        searchContacts(search, showDeletedOnly)
      } else {
        fetchContacts(1, 10, undefined, showDeletedOnly)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, showDeletedOnly])

  // Helper functions for multiple emails and contacts
  const addEmail = () => {
    setEmails([...emails, ""])
  }

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index)
      setEmails(newEmails)
    }
  }

  const updateEmail = (index: number, value: string) => {
    setEmails(prev => {
      const newEmails = [...prev]
      newEmails[index] = value
      return newEmails
    })
  }

  const addFormContact = () => {
    setFormContacts([...formContacts, ""])
    setCustomCategories([...customCategories, ""])
  }

  const removeFormContact = (index: number) => {
    if (formContacts.length > 1) {
      const newContacts = formContacts.filter((_, i) => i !== index)
      setFormContacts(newContacts)
      const newCustomCategories = customCategories.filter((_, i) => i !== index)
      setCustomCategories(newCustomCategories)
    }
  }

  const updateFormContact = (index: number, value: string) => {
    setFormContacts(prev => {
      const newContacts = [...prev]
      newContacts[index] = value
      return newContacts
    })
  }

  const updateCustomCategory = (index: number, value: string) => {
    setCustomCategories(prev => {
      const newCustomCategories = [...prev]
      newCustomCategories[index] = value
      return newCustomCategories
    })
    
    // Update the contact with the custom category
    const number = formContacts[index]?.split(':')[1]?.trim() || ""
    setFormContacts(prev => {
      const newContacts = [...prev]
      newContacts[index] = `${value}: ${number}`
      return newContacts
    })
  }

  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }

  const clearForm = () => {
    setFormData({
      name_of_pras: "",
      pra_contact_person: "",
      office_head: ""
    })
    setEmails([""])
    setFormContacts([""])
    setCustomCategories([""])
    setValidationErrors({})
  }

  const handleCreate = () => {
    setEditingContact(null)
    clearForm()
    setModalOpen(true)
    requestAnimationFrame(() => setModalMounted(true))
  }

  const handleEdit = (contact: PraContact) => {
    setEditingContact(contact)
    setFormData({
      name_of_pras: contact.name_of_pras,
      pra_contact_person: contact.pra_contact_person,
      office_head: contact.office_head
    })
    
    // Populate emails from the new structure or fallback to single email
    if (contact.emails && contact.emails.length > 0) {
      setEmails(contact.emails.map(email => email.email_address))
    } else {
      setEmails([contact.email])
    }
    
    // Populate contacts from the new structure or fallback to single contact
    if (contact.contacts && contact.contacts.length > 0) {
      setFormContacts(contact.contacts.map(contact => `${contact.contact_category}: ${contact.contact_number}`))
      setCustomCategories(contact.contacts.map(contact => 
        CONTACT_CATEGORIES.includes(contact.contact_category) ? "" : contact.contact_category
      ))
    } else {
      setFormContacts([`Mobile No.: ${contact.contact_number}`])
      setCustomCategories([""])
    }
    
    setValidationErrors({})
    setModalOpen(true)
    requestAnimationFrame(() => setModalMounted(true))
  }

  const handleDelete = (contact: PraContact) => {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const handleRestore = async (contact: PraContact) => {
    // Require password confirmation before restoring
    setContactToRestore(contact)
    setRestorePasswordOpen(true)
  }

  const confirmRestore = async () => {
    if (!contactToRestore || !restorePassword) return
    
    try {
      setConfirmingRestorePassword(true)
      
      // First verify password
      const username = currentUser?.username || ''
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: restorePassword })
      })
      const authData = await authRes.json()
      
      if (!authData.success) {
        toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
        return
      }

      // Then restore the contact
      const res = await fetch(`/api/pra-contacts/${contactToRestore.id}/restore`, { method: 'POST' })
      const result = await res.json()
      
      if (result.success) {
        if (showDeletedOnly) {
          await fetchContacts(1, pagination.limit, undefined, true)
        } else {
          await fetchContacts(1, pagination.limit, undefined, false)
        }
        toast({ title: 'PRA contact restored', description: `${contactToRestore.name_of_pras} has been restored` })
        setRestorePasswordOpen(false)
        setRestorePassword("")
        setContactToRestore(null)
      } else {
        throw new Error(result.error || 'Restore failed')
      }
    } catch (err) {
      toast({ title: 'Restore error', description: 'Failed to restore PRA contact', variant: 'destructive' })
    } finally {
      setConfirmingRestorePassword(false)
    }
  }

  const confirmDelete = async () => {
    if (!contactToDelete) return

    try {
      await deleteContact(contactToDelete.id)
      toast({
        title: "PRA Contact deleted!",
        description: "The PRA contact has been deleted successfully.",
      })
      // Refresh the list with current showDeletedOnly state
      await fetchContacts(1, pagination.limit, undefined, showDeletedOnly)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete PRA contact.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setContactToDelete(null)
    }
  }

  // Handle show deleted only toggle
  const handleShowDeletedOnly = (show: boolean) => {
    if (show) {
      // Require password confirmation before enabling
      setConfirmPasswordOpen(true)
    } else {
      setShowDeletedOnly(false)
      // Reset to first page when toggling
      fetchContacts(1, pagination.limit, undefined, false)
    }
  }

  // Simplified contact number handling
  const handleContactChange = (index: number, category: string, number: string) => {
    setFormContacts(prev => {
      const newContacts = [...prev]
      newContacts[index] = `${category}: ${number}`.trim()
      return newContacts
    })
  }

  const handleContactCategoryChange = (index: number, category: string) => {
    const currentContact = formContacts[index] || ""
    const currentNumber = currentContact.includes(':') ? currentContact.split(':')[1]?.trim() || "" : currentContact
    handleContactChange(index, category, currentNumber)
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    clearFieldError(name)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setModalLoading(true)
    try {
      // Parse emails and contacts for the new structure
      const parsedEmails = emails.filter(email => email.trim()).map(email => ({ email_address: email.trim() }))
      const parsedContacts = formContacts.filter(contact => contact.trim()).map(contact => {
        const parts = contact.split(':')
        const category = parts[0]?.trim() || ''
        const number = parts[1]?.trim() || ''
        
        // If category is "Others", use the custom category
        const finalCategory = category === "Others" ? customCategories[formContacts.indexOf(contact)] : category
        
        return {
          contact_category: finalCategory,
          contact_number: number
        }
      })
      
      // Use the first email and contact for backward compatibility
      const firstContact = formContacts[0]?.trim() || ""
      const contactNumber = firstContact.includes(':') ? firstContact.split(':')[1]?.trim() || "" : firstContact
      const firstEmail = emails[0]?.trim() || ""
      
      const submitData = {
        ...formData,
        email: firstEmail,
        contact_number: contactNumber,
        emails: parsedEmails,
        contacts: parsedContacts
      }

      if (editingContact) {
        await updateContact(editingContact.id, submitData)
        toast({
          title: "PRA Contact updated!",
          description: "The PRA contact has been updated successfully.",
        })
      } else {
        await createContact(submitData as Omit<PraContact, 'id' | 'created_at' | 'updated_at'>)
    toast({
      title: "PRA Contact created!",
      description: "The new PRA contact has been added successfully.",
    })
      }
      setModalOpen(false)
      // Refresh the list with current showDeletedOnly state
      await fetchContacts(1, pagination.limit, undefined, showDeletedOnly)
    } catch (error) {
      toast({
        title: "Error",
        description: editingContact ? "Failed to update PRA contact." : "Failed to create PRA contact.",
        variant: "destructive",
      })
    } finally {
      setModalLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    fetchContacts(page, 10, search || undefined, showDeletedOnly)
  }

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const { page, totalPages } = pagination
    const pages: (number | string)[] = []
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
        <Header />
        <main className="p-6 pt-24 flex-1">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-[#1976D2]">PRAs Contact Information</h2>
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-8 pr-10 h-9 w-[240px] bg-white" 
                  placeholder="Search or key:value" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white border-gray-300 h-9">
                    <Download className="h-4 w-4 mr-2" />
                    Export Sheet
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 0 && (
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                {pagination.total > 0 ? (
                  `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total contacts)`
                ) : (
                  `No results found`
                )}
              </div>
              <div className="flex items-center gap-1">
                {generatePageNumbers().map((pageNum, index) => (
                  <Button
                    key={index}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pageNum === '...'}
                    onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
            {/* Show Deleted Only Toggle */}
            {userIsSuperadmin && (
              <div className="flex items-center justify-end px-4 py-2 border-b bg-gray-50 gap-6">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={showDeletedOnly}
                    onChange={(e) => handleShowDeletedOnly(e.target.checked)}
                  />
                  Show deleted only
                </label>
              </div>
            )}
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                    <th className="py-3 px-4 font-medium text-center">Name of PRAs</th>
                    <th className="py-3 px-4 font-medium text-center">PRA Contact Person/s</th>
                    <th className="py-3 px-4 font-medium text-center">Office Head</th>
                    <th className="py-3 px-4 font-medium text-center">Email Address(es)</th>
                    <th className="py-3 px-4 font-medium text-center">Contact Number(s)</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className={`hover:bg-gray-150 transition-colors duration-75 ${contact.deleted_at ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4 text-center">{contact.name_of_pras}</td>
                      <td className="py-3 px-4 text-center">{contact.pra_contact_person}</td>
                      <td className="py-3 px-4 text-center">{contact.office_head}</td>
                      <td className="py-3 px-4 text-center">
                        {contact.emails && contact.emails.length > 0 ? (
                          <div className="space-y-1">
                            {contact.emails.map((email, index) => (
                              <div key={index} className="text-sm">
                                {email.email_address}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm">{contact.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {contact.contacts && contact.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {contact.contacts.map((contactInfo, index) => (
                              <div key={index} className="text-sm">
                                <span className="text-gray-500 font-medium">
                                  {contactInfo.contact_category}:
                                </span>
                                <span className="ml-1">{contactInfo.contact_number}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm">{contact.contact_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-150">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {showDeletedOnly ? (
                              // Show restore button for deleted records
                              userIsSuperadmin && contact.deleted_at && (
                                <DropdownMenuItem onClick={() => handleRestore(contact)}>
                                  <RefreshCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                              )
                            ) : (
                              // Show edit and delete buttons for active records
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(contact)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Last Updated Timestamp */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>
              Last Updated: {praLastModified ? praLastModified.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : 'Never'}
            </span>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-150 ${modalMounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${modalMounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={() => { clearForm(); setModalMounted(false); setModalOpen(false); }} />
          <div className={`relative bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-150 ${modalMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
            {/* Modal Header */}
            <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-medium">
                  {editingContact ? 'Edit PRA Contact' : 'Create PRA Contact'}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                clearForm()
                setModalMounted(false)
                setModalOpen(false)
              }} className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleModalSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  {/* Name of PRAs */}
                  <div>
                    <Label className="text-sm font-medium">Name of PRAs:</Label>
                    <Input 
                      name="name_of_pras"
                      value={formData.name_of_pras}
                      onChange={handleModalChange}
                      className="mt-1"
                      placeholder="Enter PRA name"
                      required
                    />
                  </div>

                  {/* PRA Contact Person */}
                  <div>
                    <Label className="text-sm font-medium">PRA Contact Person:</Label>
                    <Input 
                      name="pra_contact_person"
                      value={formData.pra_contact_person}
                      onChange={handleModalChange}
                      className="mt-1"
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>

                  {/* Office Head */}
                  <div>
                    <Label className="text-sm font-medium">Office Head:</Label>
                    <Input 
                      name="office_head"
                      value={formData.office_head}
                      onChange={handleModalChange}
                      className="mt-1"
                      placeholder="Enter office head name"
                      required
                    />
                  </div>

                  {/* Email Addresses */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Email Addresses:</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmail}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Email
                      </Button>
                    </div>
                    
                    {emails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          className="flex-1"
                          placeholder="Enter email address"
                        />
                        {emails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEmail(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Numbers Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium">Contact Numbers:</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFormContact}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formContacts.map((contact, index) => {
                      const category = contact.includes(':') ? contact.split(':')[0]?.trim() || "" : ""
                      const number = contact.includes(':') ? contact.split(':')[1]?.trim() || "" : contact
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <Label className="text-xs font-medium text-gray-600">Contact:</Label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={category}
                                onChange={(e) => handleContactCategoryChange(index, e.target.value)}
                                className="w-24 p-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="">---</option>
                                {CONTACT_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              
                              {/* Custom category input for "Others" */}
                              {category === "Others" && (
                                <Input
                                  value={customCategories[index] || ""}
                                  onChange={(e) => updateCustomCategory(index, e.target.value)}
                                  className="w-28 p-2 border border-gray-300 rounded text-sm"
                                  placeholder="Custom label"
                                />
                              )}
                              
                              <Input
                                value={number}
                                onChange={(e) => handleContactChange(index, category, e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded text-sm"
                                placeholder="Enter contact number"
                              />
                            </div>
                          </div>
                          
                          {formContacts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFormContact(index)}
                              className="text-red-500 hover:text-red-700 mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {formContacts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No contact numbers added yet.</p>
                      <p className="text-sm">Click "Add Contact" to add more contact information.</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end pt-4 gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearForm()
                      setModalMounted(false)
                      setModalOpen(false)
                    }}
                    disabled={modalLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-[#1976D2] hover:bg-[#1565C0] text-white"
                    disabled={modalLoading}
                  >
                    {modalLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingContact ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingContact ? 'Update' : 'Create'
                    )}
                  </Button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the PRA contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Password Modal for Show Deleted Only */}
      <Dialog open={confirmPasswordOpen} onOpenChange={(open) => {
        setConfirmPasswordOpen(open)
        if (!open) setConfirmPassword("")
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter your password to view deleted PRA contacts.</p>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
                              onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const username = currentUser?.username || ''
                    if (!username || !confirmPassword) return
                  setConfirmingPassword(true)
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, password: confirmPassword })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setShowDeletedOnly(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      // Reset to first page when toggling
                      fetchContacts(1, pagination.limit, undefined, true)
                    } else {
                      toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
                    }
                  } finally {
                    setConfirmingPassword(false)
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfirmPasswordOpen(false); setConfirmPassword("") }}>Cancel</Button>
              <Button
                className="bg-[#1976D2] text-white"
                onClick={async () => {
                  const username = currentUser?.username || ''
                  if (!username || !confirmPassword) return
                  setConfirmingPassword(true)
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, password: confirmPassword })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setShowDeletedOnly(true)
                      setConfirmPasswordOpen(false)
                      setConfirmPassword("")
                      // Reset to first page when toggling
                      fetchContacts(1, pagination.limit, undefined, true)
                    } else {
                      toast({ title: 'Authentication failed', description: 'Incorrect password', variant: 'destructive' })
                    }
                  } finally {
                    setConfirmingPassword(false)
                  }
                }}
                disabled={confirmingPassword || !confirmPassword}
              >
                {confirmingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Password Modal for Restore */}
      <Dialog open={restorePasswordOpen} onOpenChange={(open) => {
        setRestorePasswordOpen(open)
        if (!open) {
          setRestorePassword("")
          setContactToRestore(null)
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Restore</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter your password to restore {contactToRestore?.name_of_pras}.
            </p>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await confirmRestore()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { 
                setRestorePasswordOpen(false); 
                setRestorePassword(""); 
                setContactToRestore(null) 
              }}>
                Cancel
              </Button>
              <Button
                className="bg-[#1976D2] text-white"
                onClick={confirmRestore}
                disabled={confirmingRestorePassword || !restorePassword}
              >
                {confirmingRestorePassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 