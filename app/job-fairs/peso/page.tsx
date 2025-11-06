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
import { Search, Download, Plus, MoreHorizontal, Edit, Trash2, Eye, Filter, X, FileText, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTableLastModified } from "@/hooks/use-table-last-modified"
import { usePesoContacts } from "@/hooks/use-peso-contacts"
import { PesoContact, User } from "@/lib/types"
import PesoContactsFilterPanel from "@/components/peso-contacts-filter-panel"
import { toast as sonnerToast } from "sonner"

const CONTACT_CATEGORIES = [
  "Landline",
  "Mobile No.",
  "Others"
]

const PROVINCES = [
  "Batangas",
  "Cavite", 
  "Laguna",
  "Rizal",
  "Quezon"
]

const PESO_OFFICES = {
  "Cavite": [
    "Provincial PESO",
    "Alfonso",
    "Amadeo",
    "Bacoor",
    "Carmona",
    "Cavite City",
    "Dasmariñas",
    "General Emilio Aguinaldo",
    "General Mariano Alvarez (GMA)",
    "General Trias",
    "Imus",
    "Indang",
    "Kawit",
    "Maragondon",
    "Magallanes",
    "Mendez-Nunez",
    "Naic",
    "Noveleta",
    "Rosario",
    "Silang",
    "Tagaytay",
    "Tanza",
    "Ternate",
    "Trece Martires"
  ],
  "Laguna": [
    "Provincial PESO",
    "Alaminos",
    "Bay",
    "Biñan",
    "Calamba",
    "Famy",
    "Kalayaan",
    "Liliw",
    "Los Baños",
    "Luisiana",
    "Lumban",
    "Mabitac",
    "Magdalena",
    "Majayjay",
    "Nagcarlan",
    "Paete",
    "Pagsanjan",
    "Pakil",
    "Pangil",
    "Pila",
    "Rizal",
    "San Pablo",
    "San Pedro",
    "Siniloan",
    "Sta. Cruz"
  ],
  "Batangas": [
    "Provincial PESO",
    "Agoncillo",
    "Alitagtag",
    "Balayan",
    "Balete",
    "Batangas City",
    "Bauan",
    "Calaca",
    "Calatagan Municipal",
    "Cuenca",
    "Ibaan",
    "Laurel",
    "Lemery",
    "Lian",
    "Lipa",
    "Lobo",
    "Mabini",
    "Malvar",
    "Mataas na Kahoy",
    "Nasugbu",
    "Padre Garcia",
    "Rosario",
    "San Jose",
    "San Juan",
    "San Luis",
    "San Nicolas",
    "San Pascual",
    "Sta. Teresita",
    "Sto. Tomas",
    "Taal",
    "Tanauan",
    "Taysan",
    "Tuy"
  ],
  "Rizal": [
    "Provincial PESO",
    "Angono",
    "Antipolo",
    "Baras",
    "Binangonan",
    "Cainta",
    "Cardona",
    "Jalajala",
    "Morong",
    "Pililla",
    "Rodriguez",
    "San Mateo",
    "Tanay",
    "Taytay",
    "Teresa"
  ],
  "Quezon": [
    "Provincial PESO",
    "Agdangan",
    "Alabat",
    "Atimonan",
    "Burdeos",
    "Calauag",
    "Candelaria",
    "Catanauan",
    "Dolores",
    "General Luna",
    "General Nakar",
    "Guinayangan",
    "Gumaca",
    "Infanta",
    "Lopez Quezon",
    "Lucban",
    "Lucena",
    "Macalelon",
    "Mauban",
    "Mulanay",
    "Padre Burgos",
    "Pagbilao",
    "Panukulan",
    "Perez",
    "Pitogo",
    "Plaridel",
    "Polilio",
    "Quezon",
    "Real",
    "San Andres",
    "San Antonio",
    "Sariaya",
    "Tagkawayan",
    "Tiaong",
    "Tayabas",
    "Unisan"
  ]
}

export default function PesoContactsPage() {
  const { toast } = useToast()
  
  // Get last modified time for peso_contacts table
  const { lastModified: pesoLastModified, refresh: refreshLastModified } = useTableLastModified({ tableName: 'peso_contacts' })
  
  // Use the custom hook for PESO contacts
  const { 
    contacts, 
    loading, 
    error, 
    pagination,
    createContact, 
    updateContact, 
    deleteContact, 
    searchContacts, 
    filterContacts, 
    refreshContacts,
    fetchContacts 
  } = usePesoContacts()
  
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMounted, setModalMounted] = useState(false)
  const [editingContact, setEditingContact] = useState<PesoContact | null>(null)
  const [formData, setFormData] = useState<Partial<PesoContact>>({})
  const [showFilter, setShowFilter] = useState(false)
  const [panelQuery, setPanelQuery] = useState("")
  const [selectedProvince, setSelectedProvince] = useState("")
  
  // Multiple email and contact fields
  const [emails, setEmails] = useState<string[]>([""])
  const [formContacts, setFormContacts] = useState<string[]>([""])
  const [customCategories, setCustomCategories] = useState<string[]>([""])
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  // Filter states
  const [provinceFilter, setProvinceFilter] = useState("")
  const [pesoOfficeFilter, setPesoOfficeFilter] = useState("")
  const [officeHeadFilter, setOfficeHeadFilter] = useState("")
  const [emailFilter, setEmailFilter] = useState("")
  const [contactNumberFilter, setContactNumberFilter] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10 // Fixed at 10 contacts per page

  // User authentication state
  const [userIsSuperadmin, setUserIsSuperadmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Parse search input for key:value filters and free-text terms
  const parseSearch = (input: string): { filters: Record<string, string>; terms: string[] } => {
    const tokens = input.split(/[\s,]+/).filter(Boolean)
    const filters: Record<string, string> = {}
    const terms: string[] = []
    for (const token of tokens) {
      const match = token.match(/^([a-z_]+):(.*)$/i)
      if (match && match[2] !== '') {
        filters[match[1].toLowerCase()] = match[2].toLowerCase()
      } else {
        terms.push(token.toLowerCase())
      }
    }
    return { filters, terms }
  }

  // Handle search with debouncing
  const handleSearch = (searchTerm: string) => {
    setSearch(searchTerm)
    if (searchTerm.trim()) {
      searchContacts(searchTerm)
      // Clear province selection when doing a text search
      if (selectedProvince) {
        setSelectedProvince('')
      }
    } else {
      searchContacts('')
    }
  }

  // Handle province selection
  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province)
    setCurrentPage(1) // Reset to first page
    if (province && province !== 'All Provinces') {
      searchContacts(`province:${province}`)
    } else {
      // Force a complete refresh when showing all provinces
      refreshContacts()
    }
    setSearch('')
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Preserve all active filters when changing pages
    const activeQuery = panelQuery || search || (selectedProvince && selectedProvince !== 'All Provinces' ? `province:${selectedProvince}` : undefined)
    fetchContacts(page, pageSize, activeQuery)
  }



  const clearPanel = () => {
    setProvinceFilter("")
    setPesoOfficeFilter("")
    setOfficeHeadFilter("")
    setEmailFilter("")
    setContactNumberFilter("")
    setPanelQuery("")
  }

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
    
    // Clear validation error for this contact
    clearFieldError(`contact_${index}`)
  }

  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      // Download Excel file
      const response = await fetch(`/api/peso-contacts/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'peso-contacts.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      sonnerToast.success('Export successful', {
        description: 'PESO contacts data exported to Excel',
      });
    } catch (error) {
      console.error('Export failed:', error);
      sonnerToast.error('Export failed', {
        description: 'Failed to export PESO contacts data',
      });
    }
  }

  const handleCreate = () => {
    setEditingContact(null)
    setFormData({})
    setEmails([""])
    setFormContacts([""])
    setCustomCategories([""])
    setValidationErrors({})
    setModalOpen(true)
    requestAnimationFrame(() => setModalMounted(true))
  }

  const handleEdit = (contact: PesoContact) => {
    setEditingContact(contact)
    setFormData({
      province: contact.province,
      peso_office: contact.peso_office,
      office_head: contact.office_head,
      email: contact.email,
      contact_number: contact.contact_number
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this PESO contact?')) {
      try {
        await deleteContact(id)
        toast({
          title: "PESO Contact deleted!",
          description: "The PESO contact has been deleted successfully.",
        })
        // Add a small delay to ensure the database trigger has executed
        setTimeout(() => {
          refreshLastModified()
        }, 500)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete PESO contact.",
          variant: "destructive"
        })
      }
    }
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Clear PESO office when province changes
      if (name === 'province') {
        newData.peso_office = ''
      }
      
      return newData
    })
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

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
          title: "PESO Contact updated!",
          description: "The PESO contact has been updated successfully.",
        })
      } else {
        await createContact(submitData as Omit<PesoContact, 'id' | 'created_at' | 'updated_at'>)
    toast({
      title: "PESO Contact created!",
      description: "The new PESO contact has been added successfully.",
    })
      }
      setModalOpen(false)
      // Refresh the contacts list to show updated data
      await refreshContacts()
      // Add a small delay to ensure the database trigger has executed
      setTimeout(() => {
        refreshLastModified()
      }, 500)
    } catch (error) {
      toast({
        title: "Error",
        description: editingContact ? "Failed to update PESO contact." : "Failed to create PESO contact.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24 flex-1">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-[#1976D2]">PESO IV-A Contact Info</h2>
            <div className="flex items-center gap-2 relative">
              {/* Province Dropdown */}
              <select
                value={selectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded bg-white text-sm min-w-[120px]"
              >
                <option value="">All Provinces</option>
                {PROVINCES.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-8 pr-10 h-9 w-[20rem] bg-white" 
                  placeholder="Search or key:value (e.g. name:John)" 
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowFilter(!showFilter)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white border-gray-300 h-9">
                    <Download className="h-4 w-4 mr-2" />
                    Export Sheet
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {userIsSuperadmin && (
                <Button className="bg-[#1976D2] hover:bg-[#1565C0] h-9 text-white flex items-center gap-2" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              )}

                            {/* Filter Panel */}
              {showFilter && (
                <PesoContactsFilterPanel 
                  onClose={() => setShowFilter(false)}
                  onApply={(query) => {
                    setPanelQuery(query)
                    filterContacts(query)
                    setShowFilter(false)
                  }}
                  province={provinceFilter}
                  setProvince={setProvinceFilter}
                  pesoOffice={pesoOfficeFilter}
                  setPesoOffice={setPesoOfficeFilter}
                  officeHead={officeHeadFilter}
                  setOfficeHead={setOfficeHeadFilter}
                  email={emailFilter}
                  setEmail={setEmailFilter}
                  contactNumber={contactNumberFilter}
                  setContactNumber={setContactNumberFilter}
                  onClear={clearPanel}
                />
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Simple Pagination Controls */}
          {pagination.total > 0 && (
            <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total contacts)
                </span>

              </div>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const currentPage = pagination.page;
                  
                  if (totalPages <= 7) {
                    // If 7 or fewer pages, show all pages
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          className="min-w-[40px] h-8"
                        >
                          {i}
                        </Button>
                      );
                    }
                  } else {
                    // Dynamic pagination: show 5 pages around current page
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    
                    // Adjust if we're near the end
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }
                    
                    // Always show first page if not in range
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant={1 === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          className="min-w-[40px] h-8"
                        >
                          1
                        </Button>
                      );
                      
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipses-start" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // Show the 5 pages around current page
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          className="min-w-[40px] h-8"
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Always show last page if not in range
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipses-end" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={totalPages === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="min-w-[40px] h-8"
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                  }
                  
                  return pages;
                })()}
              </div>
            </div>
          )}

          <div className="bg-white rounded-md border overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-[#1976D2] text-white sticky top-0 z-10 shadow-sm">
                    <th className="py-3 px-4 font-medium text-center">Province</th>
                    <th className="py-3 px-4 font-medium text-center">PESO Office</th>
                    <th className="py-3 px-4 font-medium text-center">Office Head</th>
                    <th className="py-3 px-4 font-medium text-center">Email Address(es)</th>
                    <th className="py-3 px-4 font-medium text-center">Contact Number(s)</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        Loading PESO contacts...
                      </td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        {search ? 'No contacts found matching your search.' : 'No PESO contacts found.'}
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-150 transition-colors duration-75 border-b border-gray-100">
                      <td className="py-3 px-4 text-center">{contact.province}</td>
                        <td className="py-3 px-4 text-center">{contact.peso_office}</td>
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
                              <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>



          {/* Last Updated Timestamp */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>
              Last Updated: {pesoLastModified ? pesoLastModified.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : 'Loading...'}
            </span>
            <button 
              onClick={() => refreshLastModified()} 
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      </main>
      {modalOpen && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-150 ${modalMounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${modalMounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={() => { setModalMounted(false); setModalOpen(false); }} />
          <div className={`relative bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-150 ${modalMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
            {/* Modal Header */}
            <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-medium">
                  {editingContact ? 'Edit PESO Contact' : 'Create PESO Contact'}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setModalMounted(false); setModalOpen(false); }} className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleModalSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <select 
                      name="province" 
                      required 
                      className="w-full border rounded px-3 py-2" 
                      value={formData.province || ''}
                      onChange={handleModalChange} 
                    >
                      <option value="">Select a province</option>
                      {PROVINCES.map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                  </div>

                  {/* PESO Office */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PESO Office</label>
                    <select 
                      name="peso_office" 
                      required 
                      className="w-full border rounded px-3 py-2" 
                      value={formData.peso_office || ''}
                      onChange={handleModalChange}
                      disabled={!formData.province}
                    >
                      <option value="">
                        {formData.province ? 'Select a PESO office' : 'Please select a province first'}
                      </option>
                      {formData.province && PESO_OFFICES[formData.province as keyof typeof PESO_OFFICES]?.map(office => (
                        <option key={office} value={office}>{office}</option>
                      ))}
                    </select>
                  </div>

                  {/* Office Head */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Head</label>
                    <input 
                      name="office_head" 
                      type="text" 
                      required 
                      className="w-full border rounded px-3 py-2" 
                      placeholder="Full name of office head" 
                      value={formData.office_head || ''}
                      onChange={handleModalChange} 
                    />
                  </div>

                  {/* Email Addresses */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Email Addresses</label>
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
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          className="flex-1 border rounded px-3 py-2"
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

                  {/* Contact Numbers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Contact Numbers</label>
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
                    
                    {formContacts.map((contact, index) => {
                      const category = contact.includes(':') ? contact.split(':')[0]?.trim() || "" : ""
                      const number = contact.includes(':') ? contact.split(':')[1]?.trim() || "" : contact
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 mb-3">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600">Contact:</label>
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
                                <input
                                  value={customCategories[index] || ""}
                                  onChange={(e) => updateCustomCategory(index, e.target.value)}
                                  className="w-28 p-2 border border-gray-300 rounded text-sm"
                                  placeholder="Custom label"
                                />
                              )}
                              
                              <input
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
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => { setModalMounted(false); setModalOpen(false); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#1976D2] text-white">
                    {editingContact ? 'Update' : 'Create'}
                  </Button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 