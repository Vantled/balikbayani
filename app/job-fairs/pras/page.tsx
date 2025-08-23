"use client"

import { useState } from "react"
import Header from "@/components/shared/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Download, Plus, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTableLastModified } from "@/hooks/use-table-last-modified"

// Mock data
const initialPraContacts = [
  {
    name: "ABC Recruitment Agency",
    praContactPerson: "John Doe",
    officeHead: "Jane Smith",
    email: "john.doe@example.com",
    contactNo: "09123456789"
  },
  {
    name: "XYZ Manpower Services",
    praContactPerson: "Mike Johnson",
    officeHead: "Sarah Williams",
    email: "mike.johnson@example.com",
    contactNo: "09234567890"
  }
]

export default function PraContactsPage() {
  const { toast } = useToast()
  
  // Get last modified time for pra_contacts table
  const { lastModified: praLastModified } = useTableLastModified({ tableName: 'pra_contacts' })
  
  const [praContacts, setPraContacts] = useState(initialPraContacts)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const filteredContacts = praContacts.filter(contact =>
    Object.values(contact).some(value =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  )

  const handleCreate = () => {
    setFormData({})
    setModalOpen(true)
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPraContacts([...praContacts, formData])
    setModalOpen(false)
    toast({
      title: "PRA Contact created!",
      description: "The new PRA contact has been added successfully.",
    })
  }

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <Header />
      <main className="p-6 pt-24">
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
          <div className="bg-white rounded-md border overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1976D2] text-white sticky top-0 z-10 bg-[#1976D2]">
                    <th className="py-3 px-4 font-medium text-center">Name of PRAs</th>
                    <th className="py-3 px-4 font-medium text-center">PRA Contact Person/s</th>
                    <th className="py-3 px-4 font-medium text-center">Office Head</th>
                    <th className="py-3 px-4 font-medium text-center">Email</th>
                    <th className="py-3 px-4 font-medium text-center">Contact No.</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredContacts.map((contact, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-center">{contact.name}</td>
                      <td className="py-3 px-4 text-center">{contact.praContactPerson}</td>
                      <td className="py-3 px-4 text-center">{contact.officeHead}</td>
                      <td className="py-3 px-4 text-center">{contact.email}</td>
                      <td className="py-3 px-4 text-center">{contact.contactNo}</td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Create PRA Contact</DialogTitle>
          <form onSubmit={handleModalSubmit} className="space-y-4 mt-2">
            <input name="name" type="text" required className="w-full border rounded px-3 py-2" placeholder="Name of PRAs" onChange={handleModalChange} />
            <input name="praContactPerson" type="text" required className="w-full border rounded px-3 py-2" placeholder="PRA Contact Person/s" onChange={handleModalChange} />
            <input name="officeHead" type="text" required className="w-full border rounded px-3 py-2" placeholder="Office Head" onChange={handleModalChange} />
            <input name="email" type="email" required className="w-full border rounded px-3 py-2" placeholder="Email" onChange={handleModalChange} />
            <input name="contactNo" type="text" required className="w-full border rounded px-3 py-2" placeholder="Contact No." onChange={handleModalChange} />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
                              <Button type="submit" className="bg-[#1976D2] text-white">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 