// components/job-fair-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, FileText, Loader2, Plus, Trash2 } from "lucide-react"
import { JobFair, JobFairContact } from "@/lib/types"

interface JobFairModalProps {
  open: boolean
  onClose: () => void
  initialData?: JobFair | null
  onSuccess?: () => void
}

const CONTACT_CATEGORIES = [
  "Landline",
  "Mobile No.",
  "Others"
]

export default function JobFairModal({ open, onClose, initialData = null, onSuccess }: JobFairModalProps) {
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  
  const [formData, setFormData] = useState({
    date: "",
    venue: "",
    office_head: ""
  })

  const [emails, setEmails] = useState<string[]>([])
  const [contacts, setContacts] = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])

  // Prefill form when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date instanceof Date 
          ? initialData.date.toISOString().split('T')[0]
          : new Date(initialData.date).toISOString().split('T')[0],
        venue: initialData.venue,
        office_head: initialData.office_head
      })
      setEmails(initialData.emails?.map(email => email.email_address) || [])
      setContacts(initialData.contacts?.map(contact => 
        `${contact.contact_category}: ${contact.contact_number}`
      ) || [])
      setCustomCategories(initialData.contacts?.map(contact => 
        CONTACT_CATEGORIES.includes(contact.contact_category) ? "" : contact.contact_category
      ) || [])
    } else {
      setFormData({
        date: "",
        venue: "",
        office_head: ""
      })
      setEmails([""]) // Start with one empty email
      setContacts([""]) // Start with one empty contact
      setCustomCategories([""])
    }
    setValidationErrors({})
  }, [initialData])

  // Validation function
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.date) {
      errors.date = "Date is required"
    }
    
    if (!formData.venue.trim()) {
      errors.venue = "Venue is required"
    }
    
    if (!formData.office_head.trim()) {
      errors.office_head = "Office Head is required"
    }
    
    // Validate emails
    if (emails.length === 0) {
      errors.emails = "At least one email address is required"
    } else {
      emails.forEach((email, index) => {
        if (!email.trim()) {
          errors[`email_${index}`] = "Email is required"
        } else {
          // Enhanced email validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          if (!emailRegex.test(email)) {
            errors[`email_${index}`] = "Please enter a valid email address"
          }
        }
      })
    }
    
    // Validate contacts
    if (contacts.length === 0) {
      errors.contacts = "At least one contact number is required"
    } else {
      contacts.forEach((contact, index) => {
        if (!contact.trim()) {
          errors[`contact_${index}`] = "Contact is required"
        } else {
          const parts = contact.split(':')
          if (parts.length !== 2) {
            errors[`contact_${index}`] = "Format should be 'Category: Number'"
          } else {
            const category = parts[0].trim()
            const number = parts[1].trim()
            
                         if (!category) {
               errors[`contact_${index}`] = "Contact category is required"
             } else if (category === "Others") {
               // For "Others", validate that custom category is provided
               const customCategory = customCategories[index]
               if (!customCategory || !customCategory.trim()) {
                 errors[`contact_${index}`] = "Custom category label is required for 'Others'"
               }
             } else if (!CONTACT_CATEGORIES.includes(category)) {
               errors[`contact_${index}`] = "Invalid contact category"
             }
            
            if (!number) {
              errors[`contact_${index}`] = "Contact number is required"
            } else if (!/^[\d\s\-\+\(\)]+$/.test(number)) {
              errors[`contact_${index}`] = "Contact number contains invalid characters"
            }
          }
        }
      })
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Clear error for a specific field when user starts typing
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }

  const addEmail = () => {
    setEmails([...emails, ""])
  }

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index)
      setEmails(newEmails)
      // Clear validation errors for this email
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`email_${index}`]
        return newErrors
      })
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
    
    // Clear validation error for this email
    clearFieldError(`email_${index}`)
  }

  const addContact = () => {
    setContacts([...contacts, ""])
    setCustomCategories([...customCategories, ""])
  }

  const clearForm = () => {
    setFormData({
      date: "",
      venue: "",
      office_head: ""
    })
    setEmails([""]) // Keep one empty email field
    setContacts([""]) // Keep one empty contact field
    setCustomCategories([""])
    setValidationErrors({})
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
    setCustomCategories(customCategories.filter((_, i) => i !== index))
    // Clear validation errors for this contact
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`contact_${index}`]
      return newErrors
    })
  }

  const updateContact = (index: number, value: string) => {
    const newContacts = [...contacts]
    newContacts[index] = value
    setContacts(newContacts)
    
    // Clear validation error for this contact
    clearFieldError(`contact_${index}`)
  }

  const updateCustomCategory = (index: number, value: string) => {
    const newCustomCategories = [...customCategories]
    newCustomCategories[index] = value
    setCustomCategories(newCustomCategories)
    
    // Update the contact with the custom category
    const number = contacts[index]?.split(':')[1]?.trim() || ""
    const newContacts = [...contacts]
    newContacts[index] = `${value}: ${number}`
    setContacts(newContacts)
    
    // Clear validation error for this contact
    clearFieldError(`contact_${index}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
             // Parse contacts from combined strings
       const parsedContacts = contacts.map((contact, index) => {
         const parts = contact.split(':')
         const category = parts[0]?.trim() || ''
         const number = parts[1]?.trim() || ''
         
         // If category is "Others", use the custom category
         const finalCategory = category === "Others" ? customCategories[index] : category
         
         return {
           contact_category: finalCategory,
           contact_number: number
         }
       })

      const jobFairData = {
        date: new Date(formData.date),
        venue: formData.venue.trim(),
        office_head: formData.office_head.trim(),
        emails: emails.filter(email => email.trim()).map(email => ({ email_address: email.trim() })),
        contacts: parsedContacts
      }

      const url = initialData ? `/api/job-fairs/${initialData.id}` : '/api/job-fairs'
      const method = initialData ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(jobFairData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${initialData ? 'update' : 'create'} job fair`)
      }

      await onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving job fair:', error)
      // Error handling is done by the hook
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
             <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">
              {initialData ? 'Edit Job Fair' : 'Create Job Fair'}
            </h2>
          </div>
                     <Button variant="ghost" size="icon" onClick={() => {
             clearForm()
             onClose()
           }} className="text-white hover:bg-blue-600">
             <X className="h-5 w-5" />
           </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
                         {/* Basic Information */}
             <div className="space-y-4">
               {/* Date */}
               <div>
                 <Label className="text-sm font-medium">Date:</Label>
                 <Input 
                   type="date"
                   value={formData.date}
                   onChange={(e) => {
                     setFormData({ ...formData, date: e.target.value })
                     clearFieldError('date')
                   }}
                   className={`mt-1 ${validationErrors.date ? 'border-red-500 focus:border-red-500' : ''}`}
                   required
                 />
                 {validationErrors.date && (
                   <p className="text-xs text-red-500 mt-1">{validationErrors.date}</p>
                 )}
               </div>

               {/* Venue */}
               <div>
                 <Label className="text-sm font-medium">Venue:</Label>
                 <Input 
                   value={formData.venue}
                   onChange={(e) => {
                     setFormData({ ...formData, venue: e.target.value })
                     clearFieldError('venue')
                   }}
                   className={`mt-1 ${validationErrors.venue ? 'border-red-500 focus:border-red-500' : ''}`}
                   placeholder="Enter venue"
                   required
                 />
                 {validationErrors.venue && (
                   <p className="text-xs text-red-500 mt-1">{validationErrors.venue}</p>
                 )}
               </div>

               {/* Office Head */}
               <div>
                 <Label className="text-sm font-medium">Office Head:</Label>
                 <Input 
                   value={formData.office_head}
                   onChange={(e) => {
                     setFormData({ ...formData, office_head: e.target.value })
                     clearFieldError('office_head')
                   }}
                   className={`mt-1 ${validationErrors.office_head ? 'border-red-500 focus:border-red-500' : ''}`}
                   placeholder="Enter office head name"
                   required
                 />
                 {validationErrors.office_head && (
                   <p className="text-xs text-red-500 mt-1">{validationErrors.office_head}</p>
                 )}
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
                       className={`flex-1 ${validationErrors[`email_${index}`] ? 'border-red-500 focus:border-red-500' : ''}`}
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
                 
                 {validationErrors.emails && (
                   <p className="text-xs text-red-500 mt-1">{validationErrors.emails}</p>
                 )}
                 
                 {emails.map((email, index) => (
                   validationErrors[`email_${index}`] && (
                     <p key={`error-${index}`} className="text-xs text-red-500 mt-1">{validationErrors[`email_${index}`]}</p>
                   )
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
                  onClick={addContact}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>

              {validationErrors.contacts && (
                <p className="text-xs text-red-500 mb-2">{validationErrors.contacts}</p>
              )}

              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-gray-600">Contact:</Label>
                                             <div className="flex gap-2 mt-1">
                         <select
                           value={contact.split(':')[0]?.trim() || ""}
                           onChange={(e) => {
                             const number = contact.split(':')[1]?.trim() || ""
                             const selectedCategory = e.target.value
                             if (selectedCategory === "Others") {
                               // If Others is selected, show custom input
                               updateContact(index, `Others: ${number}`)
                             } else {
                               updateContact(index, `${selectedCategory}: ${number}`)
                             }
                           }}
                           className="w-24 p-2 border border-gray-300 rounded text-sm"
                         >
                           <option value="">---</option>
                           {CONTACT_CATEGORIES.map(category => (
                             <option key={category} value={category}>{category}</option>
                           ))}
                         </select>
                         
                         {/* Custom category input for "Others" */}
                         {contact.split(':')[0]?.trim() === "Others" && (
                                                     <Input
                            value={customCategories[index] || ""}
                            onChange={(e) => updateCustomCategory(index, e.target.value)}
                            className="w-28 p-2 border border-gray-300 rounded text-sm"
                            placeholder="Custom label"
                          />
                         )}
                         
                                                   <Input
                            value={contact.split(':')[1]?.trim() || ""}
                            onChange={(e) => {
                              const category = contact.split(':')[0]?.trim() || ""
                              updateContact(index, `${category}: ${e.target.value}`)
                            }}
                            className={`flex-1 ${validationErrors[`contact_${index}`] ? 'border-red-500 focus:border-red-500' : ''}`}
                            placeholder="Enter contact number"
                          />
                       </div>
                      {validationErrors[`contact_${index}`] && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors[`contact_${index}`]}</p>
                      )}
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                      className="text-red-500 hover:text-red-700 mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

                             {contacts.length === 0 && (
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
                   onClose()
                 }}
                 disabled={loading}
               >
                 Cancel
               </Button>
              <Button 
                type="submit"
                className="bg-[#1976D2] hover:bg-[#1565C0] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {initialData ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  initialData ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
