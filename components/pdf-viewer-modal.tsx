// components/pdf-viewer-modal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface PDFViewerModalProps {
  isOpen: boolean
  onClose: () => void
  documentId?: string
  documentName: string
  fileBlob?: Blob
}

export default function PDFViewerModal({ isOpen, onClose, documentId, documentName, fileBlob }: PDFViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && (documentId || fileBlob)) {
      loadPDF()
    } else {
      // Clean up when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
      setError(null)
    }
  }, [isOpen, documentId, fileBlob])

  const loadPDF = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let blob: Blob
      
      if (fileBlob) {
        // Use the provided file blob (for new uploads)
        blob = fileBlob
      } else if (documentId) {
        // Fetch from database (for existing documents)
        const response = await fetch(`/api/documents/${documentId}/download`)
        if (!response.ok) {
          throw new Error('Failed to load PDF')
        }
        blob = await response.blob()
      } else {
        throw new Error('No document source provided')
      }
      
      // Check if the file is actually a PDF
      if (!blob.type.includes('pdf')) {
        setError('This document is not a PDF file and cannot be displayed in the PDF viewer. Please download the document to view it.')
        return
      }
      
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      setError('Failed to load PDF document')
      console.error('Error loading PDF:', err)
    } finally {
      setLoading(false)
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 rounded-2xl overflow-hidden z-[70]">
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span>📄</span>
            {documentName}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>
        
        <div className="h-[calc(90vh-80px)] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <Button onClick={loadPDF} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
