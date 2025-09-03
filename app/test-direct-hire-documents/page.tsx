// app/test-direct-hire-documents/page.tsx
"use client"

import { useState } from "react"
import DirectHireDocumentRequirements from "@/components/direct-hire-document-requirements"
import { Button } from "@/components/ui/button"

export default function TestDirectHireDocumentsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState("pending")

  const handleStatusUpdate = (newStatus: string) => {
    setCurrentStatus(newStatus)
    console.log("Status updated to:", newStatus)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Direct Hire Document Requirements</h1>
      
      <div className="space-y-4">
        <div>
          <p><strong>Current Status:</strong> {currentStatus}</p>
        </div>
        
        <Button onClick={() => setIsOpen(true)}>
          Open Document Requirements
        </Button>
        
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Open Document Requirements" button</li>
            <li>Try uploading documents (use any small image or PDF)</li>
            <li>Check off required documents</li>
            <li>Verify that status can only be changed to "evaluated" when all required docs are complete</li>
          </ol>
        </div>
      </div>

      <DirectHireDocumentRequirements
        applicationId="test-123"
        currentStatus={currentStatus}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  )
}
