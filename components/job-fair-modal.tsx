// components/job-fair-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, FileText, Loader2, Plus, Trash2 } from "lucide-react"
import { JobFair, JobFairContact } from "@/lib/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    date: "",
    venue: "",
    office_head: ""
  })

  const [emails, setEmails] = useState<string[]>([])
  const [contacts, setContacts] = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Prefill form when editing
  useEffect(() => {
    if (initialData) {
      // Fix date handling to avoid timezone issues
      // The API returns date as a string "YYYY-MM-DD", so use it directly
      let dateStr = "";
      try {
        if (typeof initialData.date === 'string') {
          // If it's a string, extract date part directly
          if (initialData.date.includes('T')) {
            // ISO format: extract date part before 'T'
            dateStr = initialData.date.split('T')[0];
          } else if (initialData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in YYYY-MM-DD format - use it directly
            dateStr = initialData.date;
          } else {
            // Try to parse as date string
            const date = new Date(initialData.date);
            if (!isNaN(date.getTime())) {
              // Parse as local date to avoid timezone shifts
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              dateStr = `${year}-${month}-${day}`;
            } else {
              dateStr = "";
            }
          }
        } else if (initialData.date instanceof Date) {
          // If it's a Date object, extract date part using local timezone
          // This handles cases where JSON parsing converted the string to a Date
          const year = initialData.date.getFullYear();
          const month = String(initialData.date.getMonth() + 1).padStart(2, '0');
          const day = String(initialData.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          // Fallback: try to parse it
          const date = new Date(initialData.date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          } else {
            dateStr = "";
          }
        }
      } catch (e) {
        console.error('Error parsing date in edit mode:', e);
        dateStr = "";
      }
      
      setFormData({
        date: dateStr,
        venue: initialData.venue || "",
        office_head: initialData.office_head || ""
      })
      setEmails((initialData as any).emails?.map((e: any)=> e.email_address) || [""])
      setContacts(((initialData as any).contacts || []).map((c: any)=> `${c.contact_category}: ${c.contact_number}`))
      setCustomCategories(new Array((((initialData as any).contacts || []).length || 1)).fill(""))
    } else {
      setFormData({ date: "", venue: "", office_head: "" })
      setEmails([""])
      setContacts([""])
      setCustomCategories([""])
    }
    setValidationErrors({})
    setMounted(false) // Reset mounted state
    const t = requestAnimationFrame(()=> setMounted(true))
    return ()=> cancelAnimationFrame(t)
  }, [initialData, open]) // Add 'open' to dependencies to reset when modal opens

  // Trigger enter animation when opened and reset form when closed
  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(t)
    } else {
      setMounted(false)
      // Reset form when modal closes
      if (!initialData) {
        clearForm()
      }
    }
  }, [open, initialData])

  const validateForm = (): boolean => {
    const errors: {[k: string]: string} = {}
    if (!formData.date.trim()) errors.date = "Date is required"
    if (!formData.venue.trim()) errors.venue = "Venue is required"
    if (!emails.length || !emails[0].trim()) errors.email_0 = "At least one email is required"
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const addEmail = () => setEmails([...emails, ""]) 
  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i)=> i !== index))
      setValidationErrors(prev => { const n={...prev}; delete n[`email_${index}`]; return n })
    }
  }

  const updateEmail = (index: number, value: string) => {
    const next = [...emails]
    next[index] = value
    setEmails(next)
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
    
    if (!validateForm()) return

    setLoading(true)
    try {
      // Parse contacts from combined strings
      const parsedContacts = contacts.map((contact, index) => {
        const parts = contact.split(':')
        const category = parts[0]?.trim() || ''
        const number = parts[1]?.trim() || ''
        const finalCategory = category === "Others" ? customCategories[index] : category
        return { contact_category: finalCategory, contact_number: number }
      })

      // Ensure date is sent as a proper date string (YYYY-MM-DD format)
      // The date input already gives us YYYY-MM-DD, so we can use it directly
      // But we need to ensure it's sent as a date string, not a Date object
      const dateValue = formData.date.trim();
      if (!dateValue) {
        throw new Error('Date is required');
      }
      
      const jobFairData = {
        date: dateValue, // Send as YYYY-MM-DD string, let the API convert it
        venue: formData.venue.trim(),
        office_head: formData.office_head.trim(),
        emails: emails.filter(email => email.trim()).map(email => ({ email_address: email.trim() })),
        contacts: parsedContacts
      }

      const url = initialData ? `/api/job-fairs/${initialData.id}` : '/api/job-fairs'
      const method = initialData ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(jobFairData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${initialData ? 'update' : 'create'} job fair`)
      }

      // Format date for display
      let displayDate = dateValue
      try {
        const dateObj = new Date(dateValue + 'T00:00:00')
        if (!isNaN(dateObj.getTime())) {
          displayDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      } catch (e) {
        // Use raw date value if formatting fails
      }

      // Build details string
      const emailCount = emails.filter(e => e.trim()).length
      const contactCount = parsedContacts.length
      const details: string[] = []
      
      if (emailCount > 0) {
        details.push(`${emailCount} email${emailCount !== 1 ? 's' : ''}`)
      }
      if (contactCount > 0) {
        details.push(`${contactCount} contact${contactCount !== 1 ? 's' : ''}`)
      }
      
      const detailsText = details.length > 0 ? ` with ${details.join(' and ')}` : ''

      // Show detailed success toast
      toast({
        title: initialData ? "Job Fair Updated Successfully" : "Job Fair Created Successfully",
        description: `${initialData ? 'Updated' : 'Created'} job fair at "${formData.venue.trim()}" scheduled for ${displayDate}${detailsText}.`,
      })

      await onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving job fair:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      
      // Show detailed error toast
      const venueInfo = formData.venue.trim() ? ` for "${formData.venue.trim()}"` : ''
      
      let dateInfo = ''
      if (formData.date) {
        try {
          const dateObj = new Date(formData.date + 'T00:00:00')
          if (!isNaN(dateObj.getTime())) {
            dateInfo = ` scheduled for ${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
          }
        } catch (e) {
          // Use raw date if formatting fails
          dateInfo = ` scheduled for ${formData.date}`
        }
      }
      
      toast({
        title: `Failed to ${initialData ? 'Update' : 'Create'} Job Fair`,
        description: `Unable to ${initialData ? 'update' : 'create'} job fair${venueInfo}${dateInfo}. ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`absolute inset-0 bg-black transition-opacity duration-150 ${mounted ? 'bg-opacity-50' : 'bg-opacity-0'}`} />
      <div className={`relative bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-150 ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`}>
        {/* Modal Header */}
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-medium">
              {initialData ? 'Edit Job Fair' : 'Create Job Fair'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { clearForm(); onClose(); }} className="text-white hover:bg-blue-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={(e)=> { if (!initialData) { e.preventDefault(); setConfirmOpen(true); return } handleSubmit(e) }} className="space-y-6">
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

      {!initialData && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Create</AlertDialogTitle>
              <AlertDialogDescription>Create this new Job Fair?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async ()=> { setConfirmOpen(false); await handleSubmit({ preventDefault: ()=>{} } as any) }} className="bg-blue-600 hover:bg-blue-700 text-white">Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
