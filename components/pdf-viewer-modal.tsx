// components/pdf-viewer-modal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface PDFViewerModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentName: string
}

export default function PDFViewerModal({ isOpen, onClose, documentId, documentName }: PDFViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && documentId) {
      loadPDF()
    } else {
      // Clean up when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
      setError(null)
    }
  }, [isOpen, documentId])

  const loadPDF = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/documents/${documentId}/download`)
      if (!response.ok) {
        throw new Error('Failed to load PDF')
      }
      
      const blob = await response.blob()
      
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

  const handleDownload = async () => {
    if (!pdfUrl) return
    
    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = documentName || 'document.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error downloading PDF:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span>📄</span>
            {documentName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-blue-600"
              title="Download PDF"
            >
              <Download className="h-5 w-5" />
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative">
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
