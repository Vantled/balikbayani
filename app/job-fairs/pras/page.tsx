"use client"

import { useState, useEffect } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Download, Plus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTableLastModified } from "@/hooks/use-table-last-modified"
import { usePraContacts } from "@/hooks/use-pra-contacts"
import { PraContact } from "@/lib/types"
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

export default function PraContactsPage() {
  const { toast } = useToast()
  const { contacts, loading, error, pagination, createContact, updateContact, deleteContact, searchContacts, fetchContacts } = usePraContacts()
  
  // Get last modified time for pra_contacts table
  const { lastModified: praLastModified } = useTableLastModified({ tableName: 'pra_contacts' })
  
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<PraContact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<PraContact | null>(null)
  const [formData, setFormData] = useState({
    name_of_pras: "",
    pra_contact_person: "",
    office_head: "",
    email: "",
    contact_number: ""
  })

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search.trim()) {
        searchContacts(search)
      } else {
        fetchContacts(1, 10)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, searchContacts, fetchContacts])

  const handleCreate = () => {
    setEditingContact(null)
    setFormData({
      name_of_pras: "",
      pra_contact_person: "",
      office_head: "",
      email: "",
      contact_number: ""
    })
    setModalOpen(true)
  }

  const handleEdit = (contact: PraContact) => {
    setEditingContact(contact)
    setFormData({
      name_of_pras: contact.name_of_pras,
      pra_contact_person: contact.pra_contact_person,
      office_head: contact.office_head,
      email: contact.email,
      contact_number: contact.contact_number
    })
    setModalOpen(true)
  }

  const handleDelete = (contact: PraContact) => {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!contactToDelete) return

    try {
      await deleteContact(contactToDelete.id)
      toast({
        title: "PRA Contact deleted!",
        description: "The PRA contact has been deleted successfully.",
      })
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

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData)
        toast({
          title: "PRA Contact updated!",
          description: "The PRA contact has been updated successfully.",
        })
      } else {
        await createContact(formData)
        toast({
          title: "PRA Contact created!",
          description: "The new PRA contact has been added successfully.",
        })
      }
      setModalOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: editingContact ? "Failed to update PRA contact." : "Failed to create PRA contact.",
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (page: number) => {
    fetchContacts(page, 10, search || undefined)
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
            <h2 className="text-xl font-medium text-[#1976D2]">PRAS Contacts</h2>
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
                Add
              </Button>
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
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
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1976D2] text-white sticky top-0 z-10">
                    <th className="py-3 px-4 font-medium text-center">Name of PRAs</th>
                    <th className="py-3 px-4 font-medium text-center">PRA Contact Person/s</th>
                    <th className="py-3 px-4 font-medium text-center">Office Head</th>
                    <th className="py-3 px-4 font-medium text-center">Email</th>
                    <th className="py-3 px-4 font-medium text-center">Contact No.</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-center">{contact.name_of_pras}</td>
                      <td className="py-3 px-4 text-center">{contact.pra_contact_person}</td>
                      <td className="py-3 px-4 text-center">{contact.office_head}</td>
                      <td className="py-3 px-4 text-center">{contact.email}</td>
                      <td className="py-3 px-4 text-center">{contact.contact_number}</td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(contact)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{editingContact ? 'Edit PRA Contact' : 'Create PRA Contact'}</DialogTitle>
          <form onSubmit={handleModalSubmit} className="space-y-4 mt-2">
            <input 
              name="name_of_pras" 
              type="text" 
              required 
              className="w-full border rounded px-3 py-2" 
              placeholder="Name of PRAs" 
              value={formData.name_of_pras}
              onChange={handleModalChange} 
            />
            <input 
              name="pra_contact_person" 
              type="text" 
              required 
              className="w-full border rounded px-3 py-2" 
              placeholder="PRA Contact Person/s" 
              value={formData.pra_contact_person}
              onChange={handleModalChange} 
            />
            <input 
              name="office_head" 
              type="text" 
              required 
              className="w-full border rounded px-3 py-2" 
              placeholder="Office Head" 
              value={formData.office_head}
              onChange={handleModalChange} 
            />
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full border rounded px-3 py-2" 
              placeholder="Email" 
              value={formData.email}
              onChange={handleModalChange} 
            />
            <input 
              name="contact_number" 
              type="text" 
              required 
              className="w-full border rounded px-3 py-2" 
              placeholder="Contact No." 
              value={formData.contact_number}
              onChange={handleModalChange} 
            />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="bg-[#1976D2] text-white">
                {editingContact ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  )
} 